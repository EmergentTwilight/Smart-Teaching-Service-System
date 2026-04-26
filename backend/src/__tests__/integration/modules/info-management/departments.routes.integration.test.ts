/**
 * 院系管理路由集成测试
 * 测试院系查询相关的 API 端点
 *
 * 运行方式：
 * 1. 确保 Docker 数据库已启动
 * 2. 运行: DATABASE_URL="..." pnpm vitest run src/__tests__/integration/modules/info-management/departments.routes.integration.test.ts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
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
  // 删除测试创建的院系（先删除关联的专业）
  await prisma.major.deleteMany({
    where: {
      department: {
        name: { startsWith: 'itest_dept_' },
      },
    },
  })
  await prisma.department.deleteMany({
    where: { name: { startsWith: 'itest_dept_' } },
  })

  // 清理本测试创建的用户和关联数据
  await prisma.systemLog.deleteMany({
    where: { user: { username: { startsWith: 'itest_dept_' } } },
  })
  await prisma.userRole.deleteMany({
    where: { user: { username: { startsWith: 'itest_dept_' } } },
  })
  await prisma.user.deleteMany({
    where: { username: { startsWith: 'itest_dept_' } },
  })
}

// 辅助函数：创建测试用户
async function createTestUser(roleCode: string = 'student') {
  const username = `itest_dept_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const hashedPassword = await bcrypt.hash('Password123', 10)
  const email = `itest_dept_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.com`

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashedPassword,
      email,
      realName: '测试用户',
      status: 'ACTIVE',
    },
  })

  const role = await prisma.role.findUnique({
    where: { code: roleCode },
  })

  if (role) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    })
  }

  if (roleCode === 'admin' || roleCode === 'super_admin') {
    await prisma.admin.create({
      data: {
        userId: user.id,
        adminType: roleCode === 'super_admin' ? 'SUPER' : 'ACADEMIC',
      },
    })
  }

  return user
}

// 辅助函数：创建测试院系
async function createTestDepartment(overrides: Record<string, unknown> = {}) {
  const random = Math.random().toString(36).slice(2, 6)
  const name = `itest_dept_院系_${random}`
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
    await createTestDepartment({ name: 'itest_dept_计算机学院', code: 'CS' })
    await createTestDepartment({ name: 'itest_dept_数学学院', code: 'MATH' })

    const response = await request(app)
      .get('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.code).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)

    // 应该包含我们创建的测试院系
    const testDepartments = response.body.data.filter((d: { name: string }) =>
      d.name.startsWith('itest_dept_')
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
        name: 'itest_dept_计算机科学与技术',
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

  it('应该按关键词搜索院系名称或代码', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    await createTestDepartment({ name: 'itest_dept_搜索目标学院', code: 'ITD_SEARCH_HIT' })
    await createTestDepartment({ name: 'itest_dept_搜索干扰学院', code: 'ITD_SEARCH_MISS' })

    const response = await request(app)
      .get('/api/v1/departments')
      .query({ keyword: '目标' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const names = response.body.data.map((item: { name: string }) => item.name)
    expect(names).toContain('itest_dept_搜索目标学院')
    expect(names).not.toContain('itest_dept_搜索干扰学院')
  })
})

describe('GET /api/v1/departments/:id', () => {
  const app = createTestApp()

  it('应该成功获取院系详情', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment({
      name: 'itest_dept_计算机学院',
      code: 'CS',
      description: '计算机科学与技术学院',
    })

    const response = await request(app)
      .get(`/api/v1/departments/${department.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.id).toBe(department.id)
    expect(response.body.data.name).toBe('itest_dept_计算机学院')
    expect(response.body.data.code).toBe('CS')
    expect(response.body.data.description).toBe('计算机科学与技术学院')
  })

  it('应该包含院系的专业列表', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment()

    // 创建多个专业
    const random = Math.random().toString(36).slice(2, 6)
    await prisma.major.createMany({
      data: [
        {
          name: `itest_dept_计算机科学与技术_${random}`,
          code: `CS${random}`,
          departmentId: department.id,
        },
        {
          name: `itest_dept_软件工程_${random}`,
          code: `SE${random}`,
          departmentId: department.id,
        },
      ],
    })

    const response = await request(app)
      .get(`/api/v1/departments/${department.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.majors).toHaveLength(2)
    const majorNames = response.body.data.majors.map((m: { name: string }) => m.name)
    expect(majorNames.some((name: string) => name.includes('计算机'))).toBe(true)
    expect(majorNames.some((name: string) => name.includes('软件'))).toBe(true)
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

describe('POST /api/v1/departments', () => {
  const app = createTestApp()

  it('应该允许 super_admin 创建院系', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const response = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_dept_新建学院',
        code: 'ITD201',
        description: '新建学院描述',
      })
      .expect(201)

    expect(response.body.message).toBe('院系创建成功')
    expect(response.body.data.name).toBe('itest_dept_新建学院')
    expect(response.body.data.code).toBe('ITD201')

    const created = await prisma.department.findUnique({ where: { code: 'ITD201' } })
    expect(created?.description).toBe('新建学院描述')
  })

  it('应该拒绝 admin 创建院系', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])

    const response = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_dept_禁止创建学院',
        code: 'ITD202',
      })
      .expect(403)

    expect(response.body.message).toContain('权限不足')
  })

  it('缺少必填字段时应该返回 400', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const response = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'ITD203' })
      .expect(400)

    expect(response.body.message).toContain('验证失败')
  })

  it('重复部门代码时应该返回 409', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    await createTestDepartment({ name: 'itest_dept_原学院', code: 'ITD_DUP_CODE' })

    const response = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_dept_新学院',
        code: 'ITD_DUP_CODE',
        description: '重复代码',
      })
      .expect(409)

    expect(response.body.message).toContain('部门代码已存在')
  })

  it('重复部门名称时应该返回 409', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    await createTestDepartment({ name: 'itest_dept_重复名称学院', code: 'ITD_DUP_NAME_1' })

    const response = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_dept_重复名称学院',
        code: 'ITD_DUP_NAME_2',
        description: '重复名称',
      })
      .expect(409)

    expect(response.body.message).toContain('部门名称已存在')
  })
})

describe('PUT /api/v1/departments/:id', () => {
  const app = createTestApp()

  it('应该允许 admin 更新院系', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const department = await createTestDepartment({
      name: 'itest_dept_待更新学院',
      code: 'ITD301',
    })

    const response = await request(app)
      .put(`/api/v1/departments/${department.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_dept_更新后学院',
        description: '更新后的描述',
      })
      .expect(200)

    expect(response.body.message).toBe('院系更新成功')
    expect(response.body.data.name).toBe('itest_dept_更新后学院')

    const updated = await prisma.department.findUnique({ where: { id: department.id } })
    expect(updated?.description).toBe('更新后的描述')
  })

  it('应该拒绝 student 更新院系', async () => {
    const student = await createTestUser('student')
    const token = generateTestToken(student.id, student.username, ['student'])
    const department = await createTestDepartment()

    await request(app)
      .put(`/api/v1/departments/${department.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'itest_dept_禁止更新' })
      .expect(403)
  })

  it('院系不存在时应该返回 404', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])

    const response = await request(app)
      .put('/api/v1/departments/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_dept_不存在院系',
        description: '不存在院系描述',
      })
      .expect(404)

    expect(response.body.message).toBeDefined()
  })
})

describe('DELETE /api/v1/departments/:id', () => {
  const app = createTestApp()

  it('应该允许 super_admin 删除空院系', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])
    const department = await createTestDepartment({
      name: 'itest_dept_待删除学院',
      code: 'ITD401',
    })

    const response = await request(app)
      .delete(`/api/v1/departments/${department.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.message).toBe('院系删除成功')
    const deleted = await prisma.department.findUnique({ where: { id: department.id } })
    expect(deleted).toBeNull()
  })

  it('应该拒绝 admin 删除院系', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const department = await createTestDepartment()

    await request(app)
      .delete(`/api/v1/departments/${department.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('有关联专业时删除应该失败', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])
    const department = await createTestDepartment({
      name: 'itest_dept_有关联学院',
      code: 'ITD402',
    })
    await prisma.major.create({
      data: {
        name: 'itest_dept_关联专业',
        code: 'ITD_MAJOR_402',
        departmentId: department.id,
      },
    })

    const response = await request(app)
      .delete(`/api/v1/departments/${department.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409)

    expect(response.body.message).toContain('院系存在关联数据')

    const existing = await prisma.department.findUnique({ where: { id: department.id } })
    expect(existing).not.toBeNull()
  })
})

describe('院系数据结构验证', () => {
  const app = createTestApp()

  it('院系对象应该包含所有必需字段', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    await createTestDepartment({
      name: 'itest_dept_测试学院',
      code: 'TEST',
      description: '测试描述',
    })

    const response = await request(app)
      .get('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const testDept = response.body.data.find(
      (d: { name: string }) => d.name === 'itest_dept_测试学院'
    )
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
        name: 'itest_dept_测试专业',
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
      createTestDepartment({ name: 'itest_dept_院系1' }),
      createTestDepartment({ name: 'itest_dept_院系2' }),
      createTestDepartment({ name: 'itest_dept_院系3' }),
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
