/**
 * 专业管理路由集成测试
 * 测试专业 CRUD 相关的 API 端点
 *
 * 运行方式：
 * 1. 确保 Docker 数据库已启动
 * 2. 运行: pnpm vitest run src/__tests__/integration/modules/info-management/majors.routes.integration.test.ts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import majorsRoutes from '../../../../modules/info-management/major.routes.js'
import { errorHandler } from '../../../../shared/middleware/error.js'
import config from '../../../../config/index.js'
import jwt from 'jsonwebtoken'

// 创建测试应用
function createTestApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/v1/majors', majorsRoutes)
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
async function cleanupMajorsData() {
  // 删除测试创建的curriculum（先删除，因为有外键约束）
  await prisma.curriculum.deleteMany({
    where: {
      major: {
        name: { startsWith: 'itest_major_' },
      },
    },
  })
  // 删除测试创建的专业
  await prisma.major.deleteMany({
    where: {
      name: { startsWith: 'itest_major_' },
    },
  })
  // 删除测试创建的院系
  await prisma.department.deleteMany({
    where: { name: { startsWith: 'itest_major_dept_' } },
  })

  // 清理本测试创建的用户和关联数据
  await prisma.student.deleteMany({
    where: { user: { username: { startsWith: 'itest_major_' } } },
  })
  await prisma.systemLog.deleteMany({
    where: { user: { username: { startsWith: 'itest_major_' } } },
  })
  await prisma.userRole.deleteMany({
    where: { user: { username: { startsWith: 'itest_major_' } } },
  })
  await prisma.user.deleteMany({
    where: { username: { startsWith: 'itest_major_' } },
  })
}

// 辅助函数：创建测试用户
async function createTestUser(roleCode: string = 'student') {
  const username = `itest_major_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const hashedPassword = await bcrypt.hash('Password123', 10)
  const email = `itest_major_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.com`

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashedPassword,
      email,
      realName: '测试用户',
      status: 'ACTIVE',
    },
  })

  // 分配角色
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

  return user
}

// 辅助函数：创建测试院系
async function createTestDepartment(overrides: Record<string, unknown> = {}) {
  const random = Math.random().toString(36).slice(2, 6)
  const name = `itest_major_dept_院系_${random}`
  const code = `ID${random}` // 限制在20字符以内

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

// 辅助函数：创建测试专业
async function createTestMajor(departmentId: string, overrides: Record<string, unknown> = {}) {
  const random = Math.random().toString(36).slice(2, 6)
  const name = `itest_major_专业_${random}`
  const code = `IM${random}` // 限制在20字符以内

  const major = await prisma.major.create({
    data: {
      name,
      code,
      departmentId,
      degreeType: 'BACHELOR',
      totalCredits: 150,
      ...overrides,
    },
  })

  return major
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
  await cleanupMajorsData()
})

beforeEach(async () => {
  await cleanupMajorsData()
})

describe('GET /api/v1/majors', () => {
  const app = createTestApp()

  it('应该成功获取专业列表', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    // 创建测试院系和专业
    const department = await createTestDepartment()
    await createTestMajor(department.id, { name: 'itest_major_计算机科学与技术' })
    await createTestMajor(department.id, { name: 'itest_major_软件工程' })

    const response = await request(app)
      .get('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.code).toBe(200)
    expect(response.body.data.items).toBeInstanceOf(Array)
    expect(response.body.data.pagination).toBeDefined()

    // 应该包含我们创建的测试专业
    const testMajors = response.body.data.items.filter((m: { name: string }) =>
      m.name.startsWith('itest_major_')
    )
    expect(testMajors.length).toBeGreaterThanOrEqual(2)
  })

  it('应该支持分页', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment()
    // 创建3个专业
    await Promise.all([
      createTestMajor(department.id, { name: 'itest_major_专业1' }),
      createTestMajor(department.id, { name: 'itest_major_专业2' }),
      createTestMajor(department.id, { name: 'itest_major_专业3' }),
    ])

    const response = await request(app)
      .get('/api/v1/majors/?page=1&page_size=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.items.length).toBeLessThanOrEqual(2)
    expect(response.body.data.pagination.page).toBe(1)
    expect(response.body.data.pagination.page_size).toBe(2)
  })

  it('应该支持按院系筛选', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const dept1 = await createTestDepartment({ name: 'itest_major_计算机学院' })
    const dept2 = await createTestDepartment({ name: 'itest_major_数学学院' })

    await createTestMajor(dept1.id, { name: 'itest_major_计算机科学与技术' })
    await createTestMajor(dept2.id, { name: 'itest_major_数学与应用数学' })

    const response = await request(app)
      .get(`/api/v1/majors/?department_id=${dept1.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const testMajors = response.body.data.items.filter((m: { name: string }) =>
      m.name.startsWith('itest_major_')
    )
    expect(testMajors.length).toBe(1)
    expect(testMajors[0].name).toContain('计算机')
  })

  it('应该支持关键词搜索（name 或 code）', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment()
    await createTestMajor(department.id, { name: 'itest_major_计算机科学与技术', code: 'CS' })
    await createTestMajor(department.id, { name: 'itest_major_软件工程', code: 'SE' })

    const response = await request(app)
      .get('/api/v1/majors/?keyword=计算机')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const testMajors = response.body.data.items.filter((m: { name: string }) =>
      m.name.startsWith('itest_major_')
    )
    expect(testMajors.length).toBe(1)
    expect(testMajors[0].name).toContain('计算机')
  })

  it('应该包含院系信息', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment({ name: 'itest_major_计算机学院' })
    await createTestMajor(department.id)

    const response = await request(app)
      .get('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const testMajor = response.body.data.items.find((m: { name: string }) =>
      m.name.startsWith('itest_major_')
    )
    expect(testMajor).toBeDefined()
    expect(testMajor.department_id).toBe(department.id)
    expect(testMajor.department_name).toBe('itest_major_计算机学院')
  })

  it('应该包含学生数量', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id)

    // 创建学生
    const randomNum = Math.floor(Math.random() * 10000)
    await prisma.student.create({
      data: {
        userId: user.id,
        studentNumber: `2021${randomNum}`,
        grade: 2021,
        majorId: major.id,
      },
    })

    const response = await request(app)
      .get('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const testMajor = response.body.data.items.find((m: { id: string }) => m.id === major.id)
    expect(testMajor.student_count).toBe(1)
  })

  it('未认证时应该拒绝访问', async () => {
    const response = await request(app).get('/api/v1/majors/').expect(401)

    expect(response.body.message).toContain('未提供认证令牌')
  })

  it('应该返回空列表当没有专业时', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .get('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.items).toEqual([])
    expect(response.body.data.pagination.total).toBe(0)
  })
})

describe('GET /api/v1/majors/:id', () => {
  const app = createTestApp()

  it('应该成功获取专业详情', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment({ name: 'itest_major_计算机学院' })
    const major = await createTestMajor(department.id, {
      name: 'itest_major_计算机科学与技术',
      code: 'CS',
    })

    const response = await request(app)
      .get(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.id).toBe(major.id)
    expect(response.body.data.name).toContain('计算机科学与技术')
    expect(response.body.data.code).toBe('CS')
    expect(response.body.data.department_id).toBe(department.id)
  })

  it('应该包含学生列表', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id)

    // 创建学生
    const randomNum = Math.floor(Math.random() * 10000)
    const studentNumber = `2021${randomNum}`
    await prisma.student.create({
      data: {
        userId: user.id,
        studentNumber,
        grade: 2021,
        majorId: major.id,
      },
    })

    const response = await request(app)
      .get(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.students).toHaveLength(1)
    expect(response.body.data.students[0].user_id).toBe(user.id)
    expect(response.body.data.students[0].student_number).toBe(studentNumber)
  })

  it('应该包含培养方案列表', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id)

    // 创建培养方案
    await prisma.curriculum.create({
      data: {
        name: '2021级培养方案',
        year: 2021,
        majorId: major.id,
        totalCredits: 150,
      },
    })

    const response = await request(app)
      .get(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.curriculums).toHaveLength(1)
    expect(response.body.data.curriculums[0].name).toBe('2021级培养方案')
  })

  it('应该返回 404 当专业不存在', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .get('/api/v1/majors/00000000-0000-0000-0000-000000000000') // 使用有效的UUID格式但不存在
      .set('Authorization', `Bearer ${token}`)
      .expect(404)

    expect(response.body.message).toContain('专业不存在')
  })

  it('应该拒绝无效的 UUID 格式', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .get('/api/v1/majors/invalid-uuid-format')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)

    expect(response.body.message).toBeDefined()
  })

  it('未认证时应该拒绝访问', async () => {
    const department = await createTestDepartment()
    const major = await createTestMajor(department.id)

    const response = await request(app).get(`/api/v1/majors/${major.id}`).expect(401)

    expect(response.body.message).toContain('未提供认证令牌')
  })
})

describe('POST /api/v1/majors', () => {
  const app = createTestApp()

  it('应该成功创建专业（super_admin）', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const department = await createTestDepartment()

    const response = await request(app)
      .post('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        department_id: department.id,
        name: 'itest_major_计算机科学与技术',
        code: 'CS',
        degree_type: 'BACHELOR',
        total_credits: 150,
      })
      .expect(201)

    expect(response.body.data.id).toBeDefined()
    expect(response.body.data.name).toBe('itest_major_计算机科学与技术')
    expect(response.body.message).toBe('创建成功')
  })

  it('应该记录创建日志', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const department = await createTestDepartment()

    await request(app)
      .post('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        department_id: department.id,
        name: 'itest_major_测试专业',
        code: 'TEST',
      })
      .expect(201)

    // 检查日志
    const logs = await prisma.systemLog.findMany({
      where: {
        action: 'create',
        resourceType: 'major',
        userId: admin.id, // 只查询当前admin用户的日志
      },
    })

    const createLog = logs.find((l) => (l.details as string)?.includes('itest_major_测试专业'))
    expect(createLog).toBeDefined()
    expect(createLog?.userId).toBe(admin.id)
  })

  it('应该拒绝非 super_admin 用户创建', async () => {
    const student = await createTestUser('student')
    const token = generateTestToken(student.id, student.username, ['student'])

    const department = await createTestDepartment()

    const response = await request(app)
      .post('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        department_id: department.id,
        name: 'itest_major_测试专业',
      })
      .expect(403)

    expect(response.body.message).toContain('权限不足')
  })

  it('应该拒绝 admin 用户创建', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])

    const department = await createTestDepartment()

    await request(app)
      .post('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        department_id: department.id,
        name: 'itest_major_测试专业',
      })
      .expect(403)
  })

  it('应该验证必填字段', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const response = await request(app)
      .post('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        // 缺少 department_id
        name: 'itest_major_测试专业',
      })
      .expect(400)

    expect(response.body.message).toBeDefined()
  })

  it('应该验证 name 长度限制', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const department = await createTestDepartment()

    const response = await request(app)
      .post('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        department_id: department.id,
        name: 'a'.repeat(101), // 超过100字符
      })
      .expect(400)

    expect(response.body.message).toBeDefined()
  })

  it('应该验证 code 长度限制', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const department = await createTestDepartment()

    const response = await request(app)
      .post('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        department_id: department.id,
        name: 'itest_major_测试专业',
        code: 'a'.repeat(21), // 超过20字符
      })
      .expect(400)

    expect(response.body.message).toBeDefined()
  })

  it('应该验证 total_credits 格式', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const department = await createTestDepartment()

    const response = await request(app)
      .post('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        department_id: department.id,
        name: 'itest_major_测试专业',
        total_credits: 10000, // 超过9999
      })
      .expect(400)

    expect(response.body.message).toBeDefined()
  })

  it('未认证时应该拒绝访问', async () => {
    const response = await request(app).post('/api/v1/majors/').expect(401)

    expect(response.body.message).toContain('未提供认证令牌')
  })
})

describe('PUT /api/v1/majors/:id', () => {
  const app = createTestApp()

  it('应该成功更新专业（super_admin）', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id, { name: 'itest_major_原专业名' })

    const response = await request(app)
      .put(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_major_新专业名',
        total_credits: 160,
      })
      .expect(200)

    expect(response.body.message).toBe('更新成功')
  })

  it('应该成功更新专业（admin）', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id)

    await request(app)
      .put(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_major_更新后的专业名',
      })
      .expect(200)
  })

  it('应该记录更新日志', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id, { name: 'itest_major_原名称' })

    await request(app)
      .put(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_major_新名称',
      })
      .expect(200)

    // 检查日志
    const logs = await prisma.systemLog.findMany({
      where: {
        action: 'update',
        resourceType: 'major',
        resourceId: major.id,
      },
    })

    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0].userId).toBe(admin.id)
  })

  it('应该拒绝普通用户更新', async () => {
    const student = await createTestUser('student')
    const token = generateTestToken(student.id, student.username, ['student'])

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id)

    await request(app)
      .put(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_major_新名称',
      })
      .expect(403)
  })

  it('应该返回 404 当专业不存在', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const response = await request(app)
      .put('/api/v1/majors/00000000-0000-0000-0000-000000000000') // 使用有效的UUID格式但不存在
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_major_新名称',
      })
      .expect(404)

    expect(response.body.message).toContain('专业不存在')
  })

  it('应该验证 name 长度', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id)

    const response = await request(app)
      .put(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'a'.repeat(101),
      })
      .expect(400)

    expect(response.body.message).toBeDefined()
  })

  it('应该支持只更新部分字段', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id, {
      name: 'itest_major_原名称',
      totalCredits: 150,
    })

    await request(app)
      .put(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_major_新名称',
      })
      .expect(200)

    // 验证数据库中的值
    const updated = await prisma.major.findUnique({ where: { id: major.id } })
    expect(updated?.name).toBe('itest_major_新名称')
  })

  it('未认证时应该拒绝访问', async () => {
    const department = await createTestDepartment()
    const major = await createTestMajor(department.id)

    await request(app).put(`/api/v1/majors/${major.id}`).expect(401)
  })
})

describe('DELETE /api/v1/majors/:id', () => {
  const app = createTestApp()

  it('应该成功删除专业（super_admin）', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id)

    const response = await request(app)
      .delete(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.message).toBe('删除成功')

    // 验证已删除
    const deleted = await prisma.major.findUnique({ where: { id: major.id } })
    expect(deleted).toBeNull()
  })

  it('应该记录删除日志', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id, { name: 'itest_major_待删除专业' })

    await request(app)
      .delete(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    // 检查日志
    const logs = await prisma.systemLog.findMany({
      where: {
        action: 'delete',
        resourceType: 'major',
        resourceId: major.id,
      },
    })

    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0].details).toContain('itest_major_待删除专业')
  })

  it('应该拒绝 admin 用户删除', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id)

    await request(app)
      .delete(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('应该拒绝普通用户删除', async () => {
    const student = await createTestUser('student')
    const token = generateTestToken(student.id, student.username, ['student'])

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id)

    await request(app)
      .delete(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('应该返回 404 当专业不存在', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])

    const response = await request(app)
      .delete('/api/v1/majors/00000000-0000-0000-0000-000000000000') // 使用有效的UUID格式但不存在
      .set('Authorization', `Bearer ${token}`)
      .expect(404)

    expect(response.body.message).toContain('专业不存在')
  })

  it('未认证时应该拒绝访问', async () => {
    const department = await createTestDepartment()
    const major = await createTestMajor(department.id)

    await request(app).delete(`/api/v1/majors/${major.id}`).expect(401)
  })
})

describe('并发请求处理', () => {
  const app = createTestApp()

  it('应该正确处理多个并发请求', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment()
    const majors = await Promise.all([
      createTestMajor(department.id, { name: 'itest_major_专业1' }),
      createTestMajor(department.id, { name: 'itest_major_专业2' }),
      createTestMajor(department.id, { name: 'itest_major_专业3' }),
    ])

    // 并发请求
    const responses = await Promise.all(
      majors.map((major) =>
        request(app).get(`/api/v1/majors/${major.id}`).set('Authorization', `Bearer ${token}`)
      )
    )

    // 所有请求都应该成功
    responses.forEach((response, index) => {
      expect(response.status).toBe(200)
      expect(response.body.data.id).toBe(majors[index].id)
    })
  })
})

describe('专业数据结构验证', () => {
  const app = createTestApp()

  it('专业列表项应该包含所有必需字段', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment({ name: 'itest_major_计算机学院' })
    await createTestMajor(department.id, {
      name: 'itest_major_计算机科学与技术',
      code: 'CS',
    })

    const response = await request(app)
      .get('/api/v1/majors/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const testMajor = response.body.data.items.find((m: { name: string }) =>
      m.name.startsWith('itest_major_')
    )
    expect(testMajor).toHaveProperty('id')
    expect(testMajor).toHaveProperty('name')
    expect(testMajor).toHaveProperty('code')
    expect(testMajor).toHaveProperty('department_id')
    expect(testMajor).toHaveProperty('department_name')
    expect(testMajor).toHaveProperty('degree_type')
    expect(testMajor).toHaveProperty('total_credits')
    expect(testMajor).toHaveProperty('student_count')
    expect(testMajor).toHaveProperty('created_at')
  })

  it('专业详情应该包含所有必需字段', async () => {
    const user = await createTestUser()
    const token = generateTestToken(user.id, user.username)

    const department = await createTestDepartment()
    const major = await createTestMajor(department.id, {
      name: 'itest_major_计算机科学与技术',
      code: 'CS',
    })

    const response = await request(app)
      .get(`/api/v1/majors/${major.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data).toHaveProperty('id')
    expect(response.body.data).toHaveProperty('name')
    expect(response.body.data).toHaveProperty('code')
    expect(response.body.data).toHaveProperty('department_id')
    expect(response.body.data).toHaveProperty('department_name')
    expect(response.body.data).toHaveProperty('degree_type')
    expect(response.body.data).toHaveProperty('total_credits')
    expect(response.body.data).toHaveProperty('description')
    expect(response.body.data).toHaveProperty('students')
    expect(response.body.data).toHaveProperty('curriculums')
    expect(response.body.data).toHaveProperty('created_at')
    expect(response.body.data).toHaveProperty('updated_at')
  })
})

// 清理
afterAll(async () => {
  await cleanupMajorsData()
  await prisma.$disconnect()
})
