import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import courseRoutes from '../../../../modules/info-management/course.routes.js'
import { errorHandler } from '../../../../shared/middleware/error.js'
import config from '../../../../config/index.js'

function createTestApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/v1/courses', courseRoutes)
  app.use(errorHandler)
  return app
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://stss:stss_dev_2026@localhost:5432/stss?schema=public',
    },
  },
})

async function cleanupCoursesData() {
  await prisma.coursePrerequisite.deleteMany({
    where: {
      OR: [
        { course: { name: { startsWith: 'itest_course_' } } },
        { prerequisite: { name: { startsWith: 'itest_course_' } } },
      ],
    },
  })

  await prisma.systemLog.deleteMany({
    where: {
      OR: [
        { resourceType: 'course' },
        { user: { username: { startsWith: 'itest_course_' } } },
      ],
    },
  })

  await prisma.course.deleteMany({
    where: {
      OR: [
        { name: { startsWith: 'itest_course_' } },
        { code: { startsWith: 'ITC' } },
      ],
    },
  })

  await prisma.teacher.deleteMany({
    where: { user: { username: { startsWith: 'itest_course_' } } },
  })

  await prisma.admin.deleteMany({
    where: { user: { username: { startsWith: 'itest_course_' } } },
  })

  await prisma.userRole.deleteMany({
    where: { user: { username: { startsWith: 'itest_course_' } } },
  })

  await prisma.user.deleteMany({
    where: { username: { startsWith: 'itest_course_' } },
  })

  await prisma.department.deleteMany({
    where: { name: { startsWith: 'itest_course_' } },
  })
}

async function createTestUser(roleCode: string = 'student') {
  const random = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const username = `itest_course_${random}`
  const hashedPassword = await bcrypt.hash('Password123', 10)

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashedPassword,
      email: `${username}@test.com`,
      realName: `测试用户_${random}`,
      status: 'ACTIVE',
    },
  })

  const role = await prisma.role.findUnique({ where: { code: roleCode } })
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

async function createTestDepartment(overrides: Record<string, unknown> = {}) {
  const random = Math.random().toString(36).slice(2, 6)
  return prisma.department.create({
    data: {
      name: `itest_course_院系_${random}`,
      code: `ICD${random}`,
      description: '课程模块测试院系',
      ...overrides,
    },
  })
}

async function createTestTeacher(departmentId?: string) {
  const random = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const username = `itest_course_teacher_${random}`
  const hashedPassword = await bcrypt.hash('Password123', 10)

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashedPassword,
      email: `${username}@test.com`,
      realName: `测试教师_${random}`,
      status: 'ACTIVE',
    },
  })

  const teacherRole = await prisma.role.findUnique({ where: { code: 'teacher' } })
  if (teacherRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: teacherRole.id,
      },
    })
  }

  const teacher = await prisma.teacher.create({
    data: {
      userId: user.id,
      teacherNumber: `TNO${Math.random().toString(36).slice(2, 8)}`,
      departmentId,
      title: '讲师',
    },
    include: {
      user: true,
    },
  })

  return teacher
}

async function createTestCourse(overrides: Record<string, unknown> = {}) {
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return prisma.course.create({
    data: {
      code: `ITC${random}`,
      name: `itest_course_课程_${random}`,
      credits: 3.0,
      hours: 48,
      courseType: 'REQUIRED',
      category: '专业核心课',
      description: '课程模块测试课程',
      assessmentMethod: '考试',
      ...overrides,
    },
  })
}

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
  await cleanupCoursesData()
})

beforeEach(async () => {
  await cleanupCoursesData()
})

afterAll(async () => {
  await cleanupCoursesData()
  await prisma.$disconnect()
})

describe('GET /api/v1/courses', () => {
  const app = createTestApp()

  it('应该成功获取课程列表', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username)
    const department = await createTestDepartment()
    const teacher = await createTestTeacher(department.id)

    await createTestCourse({
      name: 'itest_course_高等数学',
      code: 'ITC001',
      departmentId: department.id,
      teacherId: teacher.userId,
    })
    await createTestCourse({
      name: 'itest_course_大学英语',
      code: 'ITC002',
      departmentId: department.id,
    })

    const response = await request(app)
      .get('/api/v1/courses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.code).toBe(200)
    expect(Array.isArray(response.body.data.items)).toBe(true)
    expect(response.body.data.pagination).toBeDefined()

    const testCourses = response.body.data.items.filter((item: { name: string }) =>
      item.name.startsWith('itest_course_')
    )
    expect(testCourses.length).toBeGreaterThanOrEqual(2)
  })

  it('应该支持按院系筛选', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username)
    const dept1 = await createTestDepartment({ name: 'itest_course_计算机学院', code: 'ITC11' })
    const dept2 = await createTestDepartment({ name: 'itest_course_数学学院', code: 'ITC22' })

    await createTestCourse({ name: 'itest_course_数据结构', code: 'ITC101', departmentId: dept1.id })
    await createTestCourse({ name: 'itest_course_线性代数', code: 'ITC102', departmentId: dept2.id })

    const response = await request(app)
      .get(`/api/v1/courses?department_id=${dept1.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const testCourses = response.body.data.items.filter((item: { name: string }) =>
      item.name.startsWith('itest_course_')
    )
    expect(testCourses).toHaveLength(1)
    expect(testCourses[0].name).toContain('数据结构')
  })

  it('应该支持关键词搜索', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username)

    await createTestCourse({ name: 'itest_course_编译原理', code: 'ITC201' })
    await createTestCourse({ name: 'itest_course_操作系统', code: 'ITC202' })

    const response = await request(app)
      .get('/api/v1/courses?keyword=编译')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const testCourses = response.body.data.items.filter((item: { name: string }) =>
      item.name.startsWith('itest_course_')
    )
    expect(testCourses).toHaveLength(1)
    expect(testCourses[0].name).toContain('编译')
  })

  it('应该支持字符串形式的分页 query 参数', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username)
    const department = await createTestDepartment()

    await Promise.all([
      createTestCourse({ name: 'itest_course_分页课程1', code: 'ITC211', departmentId: department.id }),
      createTestCourse({ name: 'itest_course_分页课程2', code: 'ITC212', departmentId: department.id }),
      createTestCourse({ name: 'itest_course_分页课程3', code: 'ITC213', departmentId: department.id }),
    ])

    const response = await request(app)
      .get('/api/v1/courses?page=1&page_size=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const testCourses = response.body.data.items.filter((item: { name: string }) =>
      item.name.startsWith('itest_course_分页课程')
    )
    expect(testCourses).toHaveLength(2)
    expect(response.body.data.pagination.page).toBe(1)
    expect(response.body.data.pagination.page_size).toBe(2)
  })

  it('非法分页参数时应该返回 400', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .get('/api/v1/courses?page=0&page_size=0')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)

    expect(response.body.message).toContain('验证失败')
  })

  it('非法分页类型时应该返回 400', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .get('/api/v1/courses?page=abc&page_size=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)

    expect(response.body.message).toContain('验证失败')
  })

  it('非法 department_id 时应该返回 400', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .get('/api/v1/courses?department_id=not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)

    expect(response.body.message).toContain('验证失败')
  })

  it('非法课程类型时应该返回 400', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .get('/api/v1/courses?course_type=not-valid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)

    expect(response.body.message).toContain('验证失败')
  })

  it('未认证时应该拒绝访问', async () => {
    const response = await request(app).get('/api/v1/courses').expect(401)
    expect(response.body.message).toContain('未提供认证令牌')
  })
})

describe('GET /api/v1/courses/:course_id', () => {
  const app = createTestApp()

  it('应该成功获取课程详情和先修课', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username)
    const department = await createTestDepartment()
    const teacher = await createTestTeacher(department.id)
    const prerequisite = await createTestCourse({ name: 'itest_course_C语言程序设计', code: 'ITC301' })
    const course = await createTestCourse({
      name: 'itest_course_数据结构',
      code: 'ITC302',
      departmentId: department.id,
      teacherId: teacher.userId,
    })

    await prisma.coursePrerequisite.create({
      data: {
        courseId: course.id,
        prerequisiteId: prerequisite.id,
      },
    })

    const response = await request(app)
      .get(`/api/v1/courses/${course.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.id).toBe(course.id)
    expect(response.body.data.name).toBe('itest_course_数据结构')
    expect(response.body.data.teacher_name).toContain('测试教师')
    expect(response.body.data.prerequisites).toHaveLength(1)
    expect(response.body.data.prerequisites[0].id).toBe(prerequisite.id)
  })

  it('课程不存在时应该返回 404', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username)

    const response = await request(app)
      .get('/api/v1/courses/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404)

    expect(response.body.message).toContain('课程不存在')
  })
})

describe('POST /api/v1/courses', () => {
  const app = createTestApp()

  it('应该允许 admin 创建课程', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const department = await createTestDepartment()
    const prerequisite = await createTestCourse({ name: 'itest_course_离散数学', code: 'ITC401' })

    const response = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'ITC402',
        name: 'itest_course_算法设计与分析',
        credits: 3.5,
        hours: 56,
        course_type: 'required',
        category: '专业核心课',
        department_id: department.id,
        assessment_method: '考试',
        prerequisite_ids: [prerequisite.id],
      })
      .expect(201)

    expect(response.body.message).toBe('创建成功')
    expect(response.body.data.id).toBeDefined()

    const created = await prisma.course.findUnique({ where: { code: 'ITC402' } })
    expect(created).not.toBeNull()

    const prerequisites = await prisma.coursePrerequisite.findMany({
      where: { courseId: created!.id },
    })
    expect(prerequisites).toHaveLength(1)
  })

  it('应该拒绝 student 创建课程', async () => {
    const student = await createTestUser('student')
    const token = generateTestToken(student.id, student.username, ['student'])

    const response = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'ITC403',
        name: 'itest_course_计算机网络',
        credits: 3,
        course_type: 'required',
      })
      .expect(403)

    expect(response.body.message).toContain('权限不足')
  })
})

describe('PUT /api/v1/courses/:course_id', () => {
  const app = createTestApp()

  it('应该允许 admin 更新课程', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const prerequisite = await createTestCourse({ name: 'itest_course_数据库原理', code: 'ITC501' })
    const course = await createTestCourse({ name: 'itest_course_原课程名', code: 'ITC502' })

    const response = await request(app)
      .put(`/api/v1/courses/${course.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_course_更新后的课程名',
        credits: 4.0,
        description: '更新后的描述',
        prerequisite_ids: [prerequisite.id],
      })
      .expect(200)

    expect(response.body.message).toBe('更新成功')

    const updated = await prisma.course.findUnique({
      where: { id: course.id },
      include: { prerequisites: true },
    })
    expect(updated?.name).toBe('itest_course_更新后的课程名')
    expect(updated?.prerequisites).toHaveLength(1)
  })

  it('传入空 prerequisite_ids 时应该清空先修课', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const prerequisite = await createTestCourse({ name: 'itest_course_离散数学', code: 'ITC503' })
    const course = await createTestCourse({ name: 'itest_course_操作系统', code: 'ITC504' })

    await prisma.coursePrerequisite.create({
      data: {
        courseId: course.id,
        prerequisiteId: prerequisite.id,
      },
    })

    await request(app)
      .put(`/api/v1/courses/${course.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        prerequisite_ids: [],
      })
      .expect(200)

    const updated = await prisma.course.findUnique({
      where: { id: course.id },
      include: { prerequisites: true },
    })
    expect(updated?.prerequisites).toHaveLength(0)
  })

  it('非法 course_id 时应该返回 400', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])

    const response = await request(app)
      .put('/api/v1/courses/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'itest_course_非法ID更新' })
      .expect(400)

    expect(response.body.message).toContain('验证失败')
  })

  it('应该拒绝 student 更新课程', async () => {
    const student = await createTestUser('student')
    const token = generateTestToken(student.id, student.username, ['student'])
    const course = await createTestCourse()

    await request(app)
      .put(`/api/v1/courses/${course.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'itest_course_禁止更新' })
      .expect(403)
  })
})

describe('DELETE /api/v1/courses/:course_id', () => {
  const app = createTestApp()

  it('应该允许 super_admin 删除课程', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])
    const course = await createTestCourse({ name: 'itest_course_待删除课程', code: 'ITC601' })

    const response = await request(app)
      .delete(`/api/v1/courses/${course.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.message).toBe('删除成功')
    const deleted = await prisma.course.findUnique({ where: { id: course.id } })
    expect(deleted).toBeNull()
  })

  it('应该拒绝 admin 删除课程', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const course = await createTestCourse({ code: 'ITC602' })

    await request(app)
      .delete(`/api/v1/courses/${course.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })
})

describe('POST /api/v1/courses/batch', () => {
  const app = createTestApp()

  it('应该允许 admin 批量创建课程', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const department = await createTestDepartment()

    const response = await request(app)
      .post('/api/v1/courses/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        courses: [
          {
            code: 'ITC701',
            name: 'itest_course_人工智能导论',
            credits: 2.5,
            course_type: 'elective',
            department_id: department.id,
          },
          {
            code: 'ITC702',
            name: 'itest_course_机器学习基础',
            credits: 3.0,
            course_type: 'elective',
            department_id: department.id,
          },
        ],
      })
      .expect(201)

    expect(response.body.message).toBe('批量创建完成')
    expect(response.body.data.success_count).toBe(2)
    expect(response.body.data.failed_count).toBe(0)
  })
})
