/**
 * 院系管理路由集成测试
 * 测试院系查询相关的 API 端点
 *
 * 运行方式：
 * 1. 确保 Docker 数据库已启动
 * 2. 运行: DATABASE_URL="..." pnpm vitest run src/__tests__/integration/modules/info-management/departments.routes.integration.test.ts
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import departmentsRoutes from '../../../../modules/info-management/departments.routes.js'
import { errorHandler } from '../../../../shared/middleware/error.js'
import config from '../../../../config/index.js'
import jwt from 'jsonwebtoken'

// 创建测试应用
function createTestApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/v1/departments', departmentsRoutes)
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
async function cleanupDepartmentsData() {
  // 删除测试创建的院系
  await prisma.major.deleteMany({
    where: {
      department: {
        name: { startsWith: 'itest_' },
      },
    },
  })
  await prisma.department.deleteMany({
    where: { name: { startsWith: 'itest_' } },
  })
}

// 辅助函数：创建测试用户
async function createTestUser() {
  const username = `itest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const hashedPassword = await bcrypt.hash('Password123', 10)
  const email = `itest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.com`

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashedPassword,
      email,
      realName: '测试用户',
      status: 'ACTIVE',
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

// 辅助函数：创建测试院系
async function createTestDepartment(overrides: Record<string, unknown> = {}) {
  const random = Math.random().toString(36).slice(2, 6)
  const name = `itest_院系_${random}`
  const code = `ID${random}`

  const department = await prisma.department.create({
    data: {
      name,
      code,
      description: '测试院系',
      ...overrides,
    },
  })

  return department
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
  await cleanupDepartmentsData()
})

beforeEach(async () => {
  await cleanupDepartmentsData()
})

describe('GET /api/v1/departments', () => {
  const app = createTestApp()

  it('应该成功获取院系列表', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    // 创建测试院系
    await createTestDepartment({ name: 'itest_计算机学院', code: 'CS' })
    await createTestDepartment({ name: 'itest_数学学院', code: 'MATH' })

    const response = await request(app)
      .get('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.code).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)

    // 应该包含我们创建的测试院系
    const testDepartments = response.body.data.filter((d: { name: string }) =>
      d.name.startsWith('itest_')
    )
    expect(testDepartments.length).toBeGreaterThanOrEqual(2)
  })

  it('应该包含院系的专业信息', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    // 创建带专业的院系
    const department = await createTestDepartment()
    await prisma.major.create({
      data: {
        name: 'itest_计算机科学与技术',
        code: 'CS',
        departmentId: department.id,
      },
    })

    const response = await request(app)
      .get('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const deptWithMajors = response.body.data.find((d: { id: string }) => d.id === department.id)
    expect(deptWithMajors).toBeDefined()
    expect(Array.isArray(deptWithMajors.majors)).toBe(true)
    expect(deptWithMajors.majors.length).toBeGreaterThan(0)
  })

  it('未认证时应该拒绝访问', async () => {
    const response = await request(app).get('/api/v1/departments').expect(401)

    expect(response.body.message).toContain('未提供认证令牌')
  })

  it('应该返回数组格式的院系列表', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .get('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(Array.isArray(response.body.data)).toBe(true)
  })
})

describe('GET /api/v1/departments/:id', () => {
  const app = createTestApp()

  it('应该成功获取院系详情', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment({
      name: 'itest_计算机学院',
      code: 'CS',
      description: '计算机科学与技术学院',
    })

    const response = await request(app)
      .get(`/api/v1/departments/${department.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.id).toBe(department.id)
    expect(response.body.data.name).toBe('itest_计算机学院')
    expect(response.body.data.code).toBe('CS')
    expect(response.body.data.description).toBe('计算机科学与技术学院')
  })

  it('应该包含院系的专业列表', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment()

    // 创建多个专业
    await prisma.major.createMany({
      data: [
        {
          name: 'itest_计算机科学与技术',
          code: 'CS',
          departmentId: department.id,
        },
        {
          name: 'itest_软件工程',
          code: 'SE',
          departmentId: department.id,
        },
      ],
    })

    const response = await request(app)
      .get(`/api/v1/departments/${department.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.majors).toHaveLength(2)
    expect(response.body.data.majors[0].name).toContain('计算机')
    expect(response.body.data.majors[1].name).toContain('软件')
  })

  it('应该返回 404 当院系不存在', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .get('/api/v1/departments/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(404)

    expect(response.body.message).toContain('院系不存在')
  })

  it('应该返回 404 当 UUID 无效或不存在', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .get('/api/v1/departments/invalid-uuid-format')
      .set('Authorization', `Bearer ${token}`)
      .expect(404)

    expect(response.body.message).toBeDefined()
  })

  it('未认证时应该拒绝访问', async () => {
    const department = await createTestDepartment()

    const response = await request(app).get(`/api/v1/departments/${department.id}`).expect(401)

    expect(response.body.message).toContain('未提供认证令牌')
  })

  it('应该处理没有专业的院系', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment()

    const response = await request(app)
      .get(`/api/v1/departments/${department.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.majors).toEqual([])
  })
})

describe('院系数据结构验证', () => {
  const app = createTestApp()

  it('院系对象应该包含所有必需字段', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    await createTestDepartment({
      name: 'itest_测试学院',
      code: 'TEST',
      description: '测试描述',
    })

    const response = await request(app)
      .get('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const testDept = response.body.data.find((d: { name: string }) => d.name === 'itest_测试学院')
    expect(testDept).toHaveProperty('id')
    expect(testDept).toHaveProperty('name')
    expect(testDept).toHaveProperty('code')
    expect(testDept).toHaveProperty('description')
    expect(testDept).toHaveProperty('majors')
  })

  it('专业对象应该包含所有必需字段', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment()
    await prisma.major.create({
      data: {
        name: 'itest_测试专业',
        code: 'T_MAJOR',
        departmentId: department.id,
      },
    })

    const response = await request(app)
      .get(`/api/v1/departments/${department.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const major = response.body.data.majors[0]
    expect(major).toHaveProperty('id')
    expect(major).toHaveProperty('name')
    expect(major).toHaveProperty('code')
    expect(major).toHaveProperty('department_id')
  })
})

describe('并发请求处理', () => {
  const app = createTestApp()

  it('应该正确处理多个并发请求', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    // 创建多个院系
    const departments = await Promise.all([
      createTestDepartment({ name: 'itest_院系1' }),
      createTestDepartment({ name: 'itest_院系2' }),
      createTestDepartment({ name: 'itest_院系3' }),
    ])

    // 并发请求
    const responses = await Promise.all(
      departments.map((dept) =>
        request(app).get(`/api/v1/departments/${dept.id}`).set('Authorization', `Bearer ${token}`)
      )
    )

    // 所有请求都应该成功
    responses.forEach((response, index) => {
      expect(response.status).toBe(200)
      expect(response.body.data.id).toBe(departments[index].id)
    })
  })
})

// 清理
afterAll(async () => {
  await cleanupDepartmentsData()
  await prisma.$disconnect()
})
