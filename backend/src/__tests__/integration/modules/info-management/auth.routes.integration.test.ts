/**
 * 认证路由集成测试
 * 测试认证相关的 API 端点
 *
 * 运行方式：
 * 1. 确保 Docker 数据库已启动
 * 2. 运行: DATABASE_URL="..." pnpm vitest run src/__tests__/integration/modules/info-management/auth.routes.integration.test.ts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import authRoutes from '../../../../modules/info-management/auth.routes.js'
import { errorHandler } from '../../../../shared/middleware/error.js'
import config from '../../../../config/index.js'
import Redis from 'ioredis'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// 直接使用 ioredis 清理测试数据（绕过自定义封装）
const testRedis = new Redis.default(process.env.REDIS_URL || 'redis://localhost:6379/1')

// 与 auth.service.ts 中 hashToken 一致
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// 创建测试应用
function createTestApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/v1/auth', authRoutes)
  app.use(errorHandler)
  return app
}

// Prisma Client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://stss:stss_dev_2026@localhost:5432/stss?schema=public',
    },
  },
})

// 清理函数
async function cleanupAuthData() {
  await prisma.systemLog.deleteMany({
    where: { action: { startsWith: 'auth:' } },
  })
  await prisma.refreshToken.deleteMany({})
  await prisma.activationToken.deleteMany({})
  await prisma.passwordResetToken.deleteMany({})

  // 清除 Redis 中的登录限流键
  const loginKeys = await testRedis.keys('auth:login_*')
  if (loginKeys.length > 0) {
    await testRedis.del(...loginKeys)
  }

  // 删除测试用户
  await prisma.userRole.deleteMany({
    where: {
      user: { username: { startsWith: 'itest_auth_' } },
    },
  })
  await prisma.user.deleteMany({
    where: { username: { startsWith: 'itest_auth_' } },
  })
}

// 辅助函数：创建测试用户
async function createTestUser(overrides: Record<string, unknown> = {}) {
  const username = `itest_auth_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const hashedPassword = await bcrypt.hash('Password123', 10)

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashedPassword,
      email: `itest_auth_${Date.now()}@test.com`,
      realName: '测试用户',
      status: 'ACTIVE',
      ...overrides,
    },
  })

  // 分配学生角色
  const studentRole = await prisma.role.findUnique({
    where: { code: 'student' },
  })

  if (studentRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: studentRole.id,
      },
    })
  }

  return user
}

// 辅助函数：生成测试 Token
function generateTestToken(userId: string, username: string, roles: string[] = ['student']) {
  return jwt.sign(
    {
      userId,
      username,
      roles,
      type: 'access',
    },
    config.jwt.secret,
    { expiresIn: '2h' }
  )
}

beforeAll(async () => {
  await prisma.$connect()
  await cleanupAuthData()
})

beforeEach(async () => {
  await cleanupAuthData()
})

describe('POST /api/v1/auth/register', () => {
  const app = createTestApp()

  it('应该成功注册新用户', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `itest_auth_new_${Date.now()}`,
        password: 'Password123',
        realName: '新用户',
        email: `itest_auth_new_${Date.now()}@test.com`,
      })
      .expect(201)

    expect(response.body.code).toBe(201)
    expect(response.body.message).toBe('注册成功')
    expect(response.body.data).toMatchObject({
      username: expect.any(String),
      email: expect.any(String),
      real_name: '新用户',
    })

    // 验证数据库中存在该用户
    const user = await prisma.user.findUnique({
      where: { id: response.body.data.id },
    })
    expect(user).not.toBeNull()
  })

  it('应该拒绝弱密码', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `itest_auth_weak_${Date.now()}`,
        password: 'weak',
        realName: '弱密码用户',
      })
      .expect(400)

    expect(response.body.message).toContain('验证失败')
  })

  it('应该拒绝重复的用户名', async () => {
    await createTestUser({
      username: 'itest_auth_duplicate',
    })

    await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: 'itest_auth_duplicate',
        password: 'Password123',
        realName: '重复用户',
      })
      .expect(409)
  })

  it('应该拒绝重复的邮箱', async () => {
    const email = `itest_auth_email_${Date.now()}@test.com`
    await createTestUser({ email })

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `itest_auth_new_${Date.now()}`,
        password: 'Password123',
        email,
        realName: '邮箱重复',
      })
      .expect(409)

    expect(response.body.message).toContain('邮箱已被注册')
  })

  it('应该验证必填字段', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: 'testuser',
        // 缺少 password
      })
      .expect(400)

    expect(response.body.message).toBeDefined()
  })
})

describe('POST /api/v1/auth/login', () => {
  const app = createTestApp()

  it('应该成功登录并返回 tokens', async () => {
    const user = await createTestUser({
      username: 'itest_auth_login',
      passwordHash: await bcrypt.hash('Password123', 10),
    })

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'itest_auth_login',
        password: 'Password123',
      })
      .expect(200)

    expect(response.body.code).toBe(200)
    expect(response.body.message).toBe('登录成功')
    expect(response.body.data).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      expires_in: expect.any(Number),
      token_type: 'Bearer',
      user: {
        id: user.id,
        username: 'itest_auth_login',
      },
    })

    // 验证 token 可以被解析
    const decoded = jwt.verify(response.body.data.access_token, config.jwt.secret) as {
      userId: string
      username: string
    }
    expect(decoded.userId).toBe(user.id)
    expect(decoded.username).toBe('itest_auth_login')

    // 验证 refresh token 被保存
    const refresh_token = await prisma.refreshToken.findFirst({
      where: { userId: user.id, isUsed: false },
    })
    expect(refresh_token).not.toBeNull()
  })

  it('应该拒绝错误的用户名', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'nonexistent',
        password: 'Password123',
      })
      .expect(401)

    expect(response.body.message).toBe('用户名或密码错误')
  })

  it('应该拒绝错误的密码', async () => {
    await createTestUser({
      username: 'itest_auth_wrongpwd',
      passwordHash: await bcrypt.hash('CorrectPassword123', 10),
    })

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'itest_auth_wrongpwd',
        password: 'WrongPassword123',
      })
      .expect(401)

    expect(response.body.message).toBe('用户名或密码错误')
  })

  it('应该更新最后登录时间', async () => {
    const user = await createTestUser({
      username: 'itest_auth_lastlogin',
      passwordHash: await bcrypt.hash('Password123', 10),
      lastLoginAt: null,
    })

    const beforeLogin = await prisma.user.findUnique({
      where: { id: user.id },
      select: { lastLoginAt: true },
    })

    expect(beforeLogin!.lastLoginAt).toBeNull()

    await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'itest_auth_lastlogin',
        password: 'Password123',
      })
      .expect(200)

    const afterLogin = await prisma.user.findUnique({
      where: { id: user.id },
      select: { lastLoginAt: true },
    })

    expect(afterLogin!.lastLoginAt).not.toBeNull()
    expect(afterLogin!.lastLoginAt!.getTime()).toBeLessThan(Date.now() + 1000)
  })

  it('应该记录登录日志', async () => {
    const user = await createTestUser({
      username: 'itest_auth_log',
      passwordHash: await bcrypt.hash('Password123', 10),
    })

    await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'itest_auth_log',
        password: 'Password123',
      })
      .expect(200)

    const log = await prisma.systemLog.findFirst({
      where: {
        userId: user.id,
        action: 'auth:login',
      },
    })

    expect(log).not.toBeNull()
    expect(log!.action).toBe('auth:login')
  })
})

describe('POST /api/v1/auth/refresh', () => {
  const app = createTestApp()

  it('应该成功刷新 token 并轮换', async () => {
    const user = await createTestUser()

    // 创建 refresh token
    const refresh_tokenValue = 'test-refresh-token'
    const tokenHash = hashToken(refresh_tokenValue)

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh_tokenValue })
      .expect(200)

    expect(response.body.data).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      expires_in: expect.any(Number),
      token_type: 'Bearer',
    })

    // 验证旧 token 被标记为已使用
    const oldToken = await prisma.refreshToken.findFirst({
      where: { tokenHash },
    })
    expect(oldToken!.isUsed).toBe(true)

    // 验证新 token 被创建
    const newTokens = await prisma.refreshToken.findMany({
      where: { userId: user.id, isUsed: false },
    })
    expect(newTokens.length).toBe(1)
  })

  it('应该拒绝无效的 refresh token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid-token' })
      .expect(401)

    expect(response.body.message).toContain('无效的刷新令牌')
  })

  it('应该拒绝已使用的 refresh token', async () => {
    const user = await createTestUser()
    const refresh_tokenValue = 'used-token'
    const tokenHash = hashToken(refresh_tokenValue)

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        isUsed: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh_tokenValue })
      .expect(401)

    expect(response.body.message).toContain('刷新令牌已使用')
  })

  it('应该拒绝过期的 refresh token', async () => {
    const user = await createTestUser()
    const refresh_tokenValue = 'expired-token'
    const tokenHash = hashToken(refresh_tokenValue)

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // 已过期
      },
    })

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh_tokenValue })
      .expect(401)

    expect(response.body.message).toContain('刷新令牌已过期')
  })
})

describe('POST /api/v1/auth/logout', () => {
  const app = createTestApp()

  it('应该成功登出并使 refresh token 失效', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    // 创建 refresh token
    const refresh_tokenValue = 'logout-token'
    const tokenHash = hashToken(refresh_tokenValue)

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken: refresh_tokenValue })
      .expect(200)

    expect(response.body.message).toBe('登出成功')

    // 验证 refresh token 被标记为已使用
    const refresh_token = await prisma.refreshToken.findFirst({
      where: { tokenHash },
    })
    expect(refresh_token!.isUsed).toBe(true)

    // 验证登出日志被记录
    const log = await prisma.systemLog.findFirst({
      where: {
        userId: user.id,
        action: 'auth:logout',
      },
    })
    expect(log).not.toBeNull()
  })

  it('应该拒绝无效的 refresh token', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken: 'invalid-token' })
      .expect(401)

    expect(response.body.message).toContain('刷新令牌无效')
  })

  it('未认证时应该拒绝登出', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'some-token' })
      .expect(401)

    expect(response.body.message).toContain('未提供认证令牌')
  })
})

describe('GET /api/v1/auth/me', () => {
  const app = createTestApp()

  it('应该返回当前用户信息', async () => {
    const user = await createTestUser({
      realName: '测试用户',
      email: 'itest_auth_me@test.com',
    })
    const token = generateTestToken(user.id, user.username, ['student'])

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data).toMatchObject({
      id: user.id,
      username: user.username,
      real_name: '测试用户',
      email: 'itest_auth_me@test.com',
      roles: ['student'],
      permissions: expect.any(Array),
    })
  })

  it('应该包含用户的角色和权限信息', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username, ['student'])

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.roles).toBeInstanceOf(Array)
    expect(response.body.data.permissions).toBeInstanceOf(Array)
  })

  it('未认证时应该拒绝访问', async () => {
    const response = await request(app).get('/api/v1/auth/me').expect(401)

    expect(response.body.message).toContain('未提供认证令牌')
  })

  it('应该拒绝无效的 token', async () => {
    await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401)
  })
})

describe('POST /api/v1/auth/change-password', () => {
  const app = createTestApp()

  it('应该成功修改密码', async () => {
    const user = await createTestUser({
      passwordHash: await bcrypt.hash('OldPassword123', 10),
    })
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      })
      .expect(200)

    expect(response.body.message).toBe('密码修改成功')

    // 验证密码已更新
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })
    const isValid = await bcrypt.compare('NewPassword456', dbUser!.passwordHash)
    expect(isValid).toBe(true)
  })

  it('应该拒绝错误的旧密码', async () => {
    const user = await createTestUser({
      passwordHash: await bcrypt.hash('CorrectPassword123', 10),
    })
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        oldPassword: 'WrongPassword123',
        newPassword: 'NewPassword456',
      })
      .expect(400)

    expect(response.body.message).toBe('旧密码错误')
  })

  it('应该拒绝弱的新密码', async () => {
    const user = await createTestUser({
      passwordHash: await bcrypt.hash('OldPassword123', 10),
    })
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        oldPassword: 'OldPassword123',
        newPassword: 'weak',
      })
      .expect(400)

    expect(response.body.message).toContain('验证失败')
  })

  it('修改密码后应该使所有 refresh token 失效', async () => {
    const user = await createTestUser({
      passwordHash: await bcrypt.hash('OldPassword123', 10),
    })
    const token = generateTestToken(user.id, user.username)

    // 创建多个 refresh token
    await prisma.refreshToken.createMany({
      data: [
        {
          userId: user.id,
          tokenHash: hashToken('token1'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          userId: user.id,
          tokenHash: hashToken('token2'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ],
    })

    await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      })
      .expect(200)

    // 验证所有 refresh token 被标记为已使用
    const tokens = await prisma.refreshToken.findMany({
      where: { userId: user.id },
    })
    expect(tokens.every((t) => t.isUsed === true)).toBe(true)
  })

  it('应该记录密码修改日志', async () => {
    const user = await createTestUser({
      passwordHash: await bcrypt.hash('OldPassword123', 10),
    })
    const token = generateTestToken(user.id, user.username)

    await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      })
      .expect(200)

    const log = await prisma.systemLog.findFirst({
      where: {
        userId: user.id,
        action: 'user:password_change',
      },
    })

    expect(log).not.toBeNull()
  })
})

describe('POST /api/v1/auth/forgot-password', () => {
  const app = createTestApp()

  it('应该为存在的邮箱发送重置邮件', async () => {
    const user = await createTestUser({
      email: 'itest_auth_forgot@test.com',
    })

    const response = await request(app)
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'itest_auth_forgot@test.com' })
      .expect(200)

    expect(response.body.message).toContain('如该邮箱已注册')

    // 验证密码重置令牌被创建
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      include: { user: true },
    })

    expect(resetToken).not.toBeNull()
    expect(resetToken!.user.id).toBe(user.id)
  })

  it('应该对不存在的邮箱返回相同响应（防止用户枚举）', async () => {
    await request(app)
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'nonexistent@test.com' })
      .expect(200)

    // 应该返回成功消息，但不创建令牌
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { userId: 'nonexistent-id' },
    })

    expect(resetToken).toBeNull()
  })

  it('应该验证邮箱格式', async () => {
    const response = await request(app)
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'invalid-email' })
      .expect(400)

    expect(response.body.message).toContain('验证失败')
  })
})

// 清理
afterAll(async () => {
  await cleanupAuthData()
  await testRedis.quit()
  await prisma.$disconnect()
})
