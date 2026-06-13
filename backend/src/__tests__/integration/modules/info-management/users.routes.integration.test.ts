/**
 * 用户管理路由集成测试
 * 测试用户 CRUD 相关的 API 端点
 *
 * 运行方式：
 * 1. 确保 Docker 数据库已启动
 * 2. 运行: DATABASE_URL="..." pnpm vitest run src/__tests__/integration/modules/info-management/users.routes.integration.test.ts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import usersRoutes from '../../../../modules/info-management/users.routes.js'
import { errorHandler } from '../../../../shared/middleware/error.js'
import config from '../../../../config/index.js'
import jwt from 'jsonwebtoken'

// 创建测试应用
function createTestApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/v1/users', usersRoutes)
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
async function cleanupUsersData() {
  await prisma.systemLog.deleteMany({
    where: { user: { username: { startsWith: 'itest_user_' } } },
  })
  await prisma.refreshToken.deleteMany({
    where: { user: { username: { startsWith: 'itest_user_' } } },
  })
  await prisma.userRole.deleteMany({
    where: {
      user: { username: { startsWith: 'itest_user_' } },
    },
  })
  await prisma.user.deleteMany({
    where: { username: { startsWith: 'itest_user_' } },
  })
  await prisma.major.deleteMany({
    where: {
      OR: [{ code: { startsWith: 'ITEST_USER_MAJOR_' } }, { code: { startsWith: 'IUM' } }],
    },
  })
  await prisma.department.deleteMany({
    where: {
      OR: [{ code: { startsWith: 'ITEST_USER_DEPT_' } }, { code: { startsWith: 'IU' } }],
    },
  })
}

// 辅助函数：创建测试用户
async function createTestUser(overrides: Record<string, unknown> = {}) {
  const username = `itest_user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const hashedPassword = await bcrypt.hash('Password123', 10)

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashedPassword,
      email: `itest_user_${Date.now()}@test.com`,
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

// 辅助函数：创建管理员用户
async function createAdminUser() {
  const username = `itest_user_admin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const hashedPassword = await bcrypt.hash('AdminPassword123', 10)

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashedPassword,
      email: `itest_user_admin_${Date.now()}@test.com`,
      realName: '测试管理员',
      status: 'ACTIVE',
    },
  })

  // 分配管理员角色
  const adminRole = await prisma.role.findUnique({
    where: { code: 'admin' },
  })

  if (adminRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
      },
    })
  }

  return user
}

// 辅助函数：创建超级管理员用户
async function createSuperAdminUser() {
  const username = `itest_user_super_admin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const hashedPassword = await bcrypt.hash('AdminPassword123', 10)

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashedPassword,
      email: `itest_user_super_admin_${Date.now()}@test.com`,
      realName: '测试超级管理员',
      status: 'ACTIVE',
    },
  })

  const superAdminRole = await prisma.role.findUnique({
    where: { code: 'super_admin' },
  })

  if (superAdminRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: superAdminRole.id,
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
  await cleanupUsersData()
})

beforeEach(async () => {
  await cleanupUsersData()
})

describe('GET /api/v1/users/roles', () => {
  const app = createTestApp()

  it('应该返回所有角色列表', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .get('/api/v1/users/roles')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.code).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.data.length).toBeGreaterThan(0)
    expect(response.body.data[0]).toHaveProperty('id')
    expect(response.body.data[0]).toHaveProperty('code')
    expect(response.body.data[0]).toHaveProperty('name')
  })

  it('未认证时应该拒绝访问', async () => {
    const response = await request(app).get('/api/v1/users/roles').expect(401)

    expect(response.body.message).toContain('未提供认证令牌')
  })
})

describe('GET /api/v1/users', () => {
  const app = createTestApp()

  it('管理员应该成功获取用户列表', async () => {
    const adminUser = await createAdminUser()
    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    // 创建几个测试用户
    await createTestUser({ username: 'itest_user_user1' })
    await createTestUser({ username: 'itest_user_user2' })

    const response = await request(app)
      .get('/api/v1/users?page=1&pageSize=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.code).toBe(200)
    expect(Array.isArray(response.body.data.items)).toBe(true)
    expect(response.body.data.pagination).toBeDefined()
    expect(response.body.data.pagination.page).toBe(1)
    expect(response.body.data.pagination.page_size).toBe(10)
  })

  it('应该支持关键词搜索', async () => {
    const adminUser = await createAdminUser()
    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    const testUser = await createTestUser({
      username: 'itest_user_search_user',
      realName: '搜索用户',
    })

    const response = await request(app)
      .get('/api/v1/users?keyword=search')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(
      response.body.data.items.some((u: { username: string }) => u.username === testUser.username)
    ).toBe(true)
  })

  it('应该支持状态筛选', async () => {
    const adminUser = await createAdminUser()
    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    await createTestUser({ status: 'INACTIVE' })

    const response = await request(app)
      .get('/api/v1/users?status=INACTIVE')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.items.every((u: { status: string }) => u.status === 'INACTIVE')).toBe(
      true
    )
  })

  it('普通用户应该被拒绝访问', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username, ['student'])

    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)

    expect(response.body.message).toContain('权限不足')
  })

  it('应该按官方文档支持 page_size 查询参数', async () => {
    const adminUser = await createAdminUser()
    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    await createTestUser({ username: 'itest_user_page_size_1' })
    await createTestUser({ username: 'itest_user_page_size_2' })

    const response = await request(app)
      .get('/api/v1/users?page=1&page_size=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.pagination.page).toBe(1)
    expect(response.body.data.pagination.page_size).toBe(1)
    expect(response.body.data.items).toHaveLength(1)
  })
})

describe('GET /api/v1/users/:id', () => {
  const app = createTestApp()

  it('用户应该能查看自己的详情', async () => {
    const user = await createTestUser({ realName: '测试用户A' })
    const token = generateTestToken(user.id, user.username, ['student'])

    const response = await request(app)
      .get(`/api/v1/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.id).toBe(user.id)
    expect(response.body.data.username).toBe(user.username)
    expect(response.body.data.real_name).toBe('测试用户A')
  })

  it('管理员应该能查看任意用户详情', async () => {
    const adminUser = await createAdminUser()
    const targetUser = await createTestUser()
    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    const response = await request(app)
      .get(`/api/v1/users/${targetUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.id).toBe(targetUser.id)
    expect(response.body.data.username).toBe(targetUser.username)
  })

  it('普通用户不应该能查看他人详情', async () => {
    const user1 = await createTestUser()
    const user2 = await createTestUser()
    const token = generateTestToken(user1.id, user1.username, ['student'])

    const response = await request(app)
      .get(`/api/v1/users/${user2.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)

    expect(response.body.message).toContain('权限不足')
  })

  it('应该返回 403 当普通用户查看不存在的用户', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username, ['student'])

    await request(app)
      .get('/api/v1/users/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })
})

describe('POST /api/v1/users', () => {
  const app = createTestApp()

  it('超级管理员应该能成功创建用户', async () => {
    // 创建超级管理员用户
    const superAdminRole = await prisma.role.findUnique({
      where: { code: 'super_admin' },
    })

    const adminUser = await prisma.user.create({
      data: {
        username: `itest_user_sa_${Date.now()}`,
        passwordHash: await bcrypt.hash('AdminPassword123', 10),
        email: `itest_user_sa_${Date.now()}@test.com`,
        realName: '超级管理员',
        status: 'ACTIVE',
      },
    })

    if (superAdminRole) {
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      })
    }

    const token = generateTestToken(adminUser.id, adminUser.username, ['super_admin'])

    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: `itest_user_new_${Date.now()}`,
        password: 'Password123',
        realName: '新用户',
        email: `new_${Date.now()}@test.com`,
      })
      .expect(201)

    expect(response.body.code).toBe(201)
    expect(response.body.message).toBe('用户创建成功')
    expect(response.body.data.username).toBeDefined()
  })

  it('应该拒绝重复的用户名', async () => {
    const superAdminRole = await prisma.role.findUnique({
      where: { code: 'super_admin' },
    })

    const adminUser = await prisma.user.create({
      data: {
        username: `itest_user_sa_${Date.now()}`,
        passwordHash: await bcrypt.hash('AdminPassword123', 10),
        email: `itest_user_sa_${Date.now()}@test.com`,
        realName: '超级管理员',
        status: 'ACTIVE',
      },
    })

    if (superAdminRole) {
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      })
    }

    const token = generateTestToken(adminUser.id, adminUser.username, ['super_admin'])

    await createTestUser({ username: 'itest_user_duplicate' })

    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'itest_user_duplicate',
        password: 'Password123',
        realName: '重复用户',
      })
      .expect(409)

    expect(response.body.message).toContain('用户名已存在')
  })

  it('普通管理员不应该能创建用户', async () => {
    const adminUser = await createAdminUser()
    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: `itest_user_${Date.now()}`,
        password: 'Password123',
        realName: '新用户',
      })
      .expect(403)
  })

  it('应该按官方文档支持 real_name 和 role_ids 创建用户', async () => {
    const adminUser = await createSuperAdminUser()
    const token = generateTestToken(adminUser.id, adminUser.username, ['super_admin'])
    const studentRole = await prisma.role.findUnique({ where: { code: 'student' } })

    if (!studentRole) {
      throw new Error('Student role not found')
    }

    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: `itest_user_doc_create_${Date.now()}`,
        password: 'Password123',
        real_name: '文档创建用户',
        email: `itest_user_doc_create_${Date.now()}@test.com`,
        role_ids: [studentRole.id],
      })
      .expect(201)

    expect(response.body.data.real_name).toBe('文档创建用户')
    expect(response.body.data.roles).toContainEqual(expect.objectContaining({ code: 'student' }))
  })
})

describe('PATCH /api/v1/users/:id/status', () => {
  const app = createTestApp()

  it('管理员应该能修改用户状态', async () => {
    const adminUser = await createAdminUser()
    const targetUser = await createTestUser({ status: 'ACTIVE' })
    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    const response = await request(app)
      .patch(`/api/v1/users/${targetUser.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INACTIVE' })
      .expect(200)

    expect(response.body.data.status).toBe('INACTIVE')
  })

  it('应该拒绝不存在的用户', async () => {
    const adminUser = await createAdminUser()
    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    await request(app)
      .patch('/api/v1/users/nonexistent-id/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INACTIVE' })
      .expect(404)
  })
})

describe('PATCH /api/v1/users/:id/password', () => {
  const app = createTestApp()

  it('应该按官方文档支持 old_password 和 new_password 修改自己的密码', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username, ['student'])

    const response = await request(app)
      .patch(`/api/v1/users/${user.id}/password`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        old_password: 'Password123',
        new_password: 'NewPassword123',
      })
      .expect(200)

    expect(response.body.message).toBe('密码修改成功')
  })
})

describe('POST /api/v1/users/:id/roles', () => {
  const app = createTestApp()

  it('管理员应该能分配角色', async () => {
    const adminUser = await createAdminUser()
    const targetUser = await createTestUser()
    const teacherRole = await prisma.role.findUnique({
      where: { code: 'teacher' },
    })

    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    if (!teacherRole) {
      throw new Error('Teacher role not found')
    }

    const response = await request(app)
      .post(`/api/v1/users/${targetUser.id}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roleIds: [teacherRole.id] })
      .expect(200)

    expect(response.body.data.roles).toContainEqual(expect.objectContaining({ code: 'teacher' }))
  })

  it('应该拒绝分配 super_admin 角色给非 super_admin', async () => {
    const adminUser = await createAdminUser()
    const targetUser = await createTestUser()
    const superAdminRole = await prisma.role.findUnique({
      where: { code: 'super_admin' },
    })

    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    if (!superAdminRole) {
      throw new Error('Super admin role not found')
    }

    const response = await request(app)
      .post(`/api/v1/users/${targetUser.id}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roleIds: [superAdminRole.id] })
      .expect(403)

    expect(response.body.message).toContain('只有超级管理员')
  })

  it('应该按官方文档支持 role_ids 分配角色', async () => {
    const adminUser = await createAdminUser()
    const targetUser = await createTestUser()
    const teacherRole = await prisma.role.findUnique({
      where: { code: 'teacher' },
    })

    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    if (!teacherRole) {
      throw new Error('Teacher role not found')
    }

    const response = await request(app)
      .post(`/api/v1/users/${targetUser.id}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role_ids: [teacherRole.id] })
      .expect(200)

    expect(response.body.data.roles).toContainEqual(expect.objectContaining({ code: 'teacher' }))
  })
})

describe('PATCH /api/v1/users/:id/student/major', () => {
  const app = createTestApp()

  it('应该按官方文档支持 major_id 更新学生专业', async () => {
    const adminUser = await createAdminUser()
    const targetUser = await createTestUser()
    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    const oldDepartment = await prisma.department.create({
      data: {
        name: `测试院系旧_${Date.now()}`,
        code: `IUD${Date.now()}`.slice(0, 20),
      },
    })
    const newDepartment = await prisma.department.create({
      data: {
        name: `测试院系新_${Date.now()}`,
        code: `IUN${Date.now()}`.slice(0, 20),
      },
    })
    const oldMajor = await prisma.major.create({
      data: {
        name: `测试专业旧_${Date.now()}`,
        code: `IUMO${Date.now()}`.slice(0, 20),
        departmentId: oldDepartment.id,
      },
    })
    const newMajor = await prisma.major.create({
      data: {
        name: `测试专业新_${Date.now()}`,
        code: `IUMN${Date.now()}`.slice(0, 20),
        departmentId: newDepartment.id,
      },
    })

    await prisma.student.create({
      data: {
        userId: targetUser.id,
        studentNumber: `S${Date.now()}`,
        majorId: oldMajor.id,
        grade: 2026,
      },
    })

    const response = await request(app)
      .patch(`/api/v1/users/${targetUser.id}/student/major`)
      .set('Authorization', `Bearer ${token}`)
      .send({ major_id: newMajor.id })
      .expect(200)

    expect(response.body.data.user_id).toBe(targetUser.id)
    expect(response.body.data.major_id).toBe(newMajor.id)
    expect(response.body.data.major_name).toBe(newMajor.name)
  })
})

describe('PATCH /api/v1/users/:id/teacher/department', () => {
  const app = createTestApp()

  it('应该按官方文档支持 department_id 更新教师院系', async () => {
    const adminUser = await createAdminUser()
    const targetUser = await createTestUser()
    const token = generateTestToken(adminUser.id, adminUser.username, ['admin'])

    const oldDepartment = await prisma.department.create({
      data: {
        name: `教师旧院系_${Date.now()}`,
        code: `IUTD${Date.now()}`.slice(0, 20),
      },
    })
    const newDepartment = await prisma.department.create({
      data: {
        name: `教师新院系_${Date.now()}`,
        code: `IUTN${Date.now()}`.slice(0, 20),
      },
    })

    await prisma.teacher.create({
      data: {
        userId: targetUser.id,
        teacherNumber: `T${Date.now()}`,
        departmentId: oldDepartment.id,
      },
    })

    const response = await request(app)
      .patch(`/api/v1/users/${targetUser.id}/teacher/department`)
      .set('Authorization', `Bearer ${token}`)
      .send({ department_id: newDepartment.id })
      .expect(200)

    expect(response.body.data.user_id).toBe(targetUser.id)
    expect(response.body.data.department_id).toBe(newDepartment.id)
    expect(response.body.data.department_name).toBe(newDepartment.name)
  })
})

describe('PATCH /api/v1/users/:id/admin/department', () => {
  const app = createTestApp()

  it('应该按官方文档支持 department_id 更新管理员院系', async () => {
    const superAdmin = await createSuperAdminUser()
    const targetUser = await createTestUser()
    const token = generateTestToken(superAdmin.id, superAdmin.username, ['super_admin'])

    const oldDepartment = await prisma.department.create({
      data: {
        name: `管理员旧院系_${Date.now()}`,
        code: `IUAD${Date.now()}`.slice(0, 20),
      },
    })
    const newDepartment = await prisma.department.create({
      data: {
        name: `管理员新院系_${Date.now()}`,
        code: `IUAN${Date.now()}`.slice(0, 20),
      },
    })

    await prisma.admin.create({
      data: {
        userId: targetUser.id,
        adminType: 'ACADEMIC',
        departmentId: oldDepartment.id,
      },
    })

    const response = await request(app)
      .patch(`/api/v1/users/${targetUser.id}/admin/department`)
      .set('Authorization', `Bearer ${token}`)
      .send({ department_id: newDepartment.id })
      .expect(200)

    expect(response.body.data.user_id).toBe(targetUser.id)
    expect(response.body.data.department_id).toBe(newDepartment.id)
    expect(response.body.data.department_name).toBe(newDepartment.name)
  })
})

describe('DELETE /api/v1/users/:id', () => {
  const app = createTestApp()

  it('超级管理员应该能删除用户', async () => {
    const superAdminRole = await prisma.role.findUnique({
      where: { code: 'super_admin' },
    })

    const adminUser = await prisma.user.create({
      data: {
        username: `itest_user_sa_${Date.now()}`,
        passwordHash: await bcrypt.hash('AdminPassword123', 10),
        email: `itest_user_sa_${Date.now()}@test.com`,
        realName: '超级管理员',
        status: 'ACTIVE',
      },
    })

    if (superAdminRole) {
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      })
    }

    const targetUser = await createTestUser()
    const token = generateTestToken(adminUser.id, adminUser.username, ['super_admin'])

    const response = await request(app)
      .delete(`/api/v1/users/${targetUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.message).toBe('用户已删除')

    // 验证用户已被删除
    const deletedUser = await prisma.user.findUnique({
      where: { id: targetUser.id },
    })
    expect(deletedUser).not.toBeNull()
    expect(deletedUser!.deletedAt).toBeInstanceOf(Date)
  })

  it('应该防止删除自己的账号', async () => {
    const superAdminRole = await prisma.role.findUnique({
      where: { code: 'super_admin' },
    })

    const adminUser = await prisma.user.create({
      data: {
        username: `itest_user_sa_${Date.now()}`,
        passwordHash: await bcrypt.hash('AdminPassword123', 10),
        email: `itest_user_sa_${Date.now()}@test.com`,
        realName: '超级管理员',
        status: 'ACTIVE',
      },
    })

    if (superAdminRole) {
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      })
    }

    const token = generateTestToken(adminUser.id, adminUser.username, ['super_admin'])

    const response = await request(app)
      .delete(`/api/v1/users/${adminUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400)

    expect(response.body.message).toContain('不能删除自己的账号')
  })
})

// 清理
afterAll(async () => {
  await cleanupUsersData()
  await prisma.$disconnect()
})
