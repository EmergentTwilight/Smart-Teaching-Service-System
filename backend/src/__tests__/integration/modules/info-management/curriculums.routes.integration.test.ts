/**
 * 培养方案管理路由集成测试
 *
 * 运行方式：
 * DATABASE_URL="..." pnpm vitest run src/__tests__/integration/modules/info-management/curriculums.routes.integration.test.ts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import curriculumsRoutes from '../../../../modules/info-management/curriculums.routes.js'
import { errorHandler } from '../../../../shared/middleware/error.js'
import config from '../../../../config/index.js'

function createTestApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/v1/curriculums', curriculumsRoutes)
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

async function cleanupCurriculumsData() {
  await prisma.curriculumCourse.deleteMany({
    where: {
      OR: [
        { curriculum: { name: { startsWith: 'itest_curriculum_' } } },
        { course: { name: { startsWith: 'itest_curriculum_' } } },
      ],
    },
  })

  await prisma.systemLog.deleteMany({
    where: {
      OR: [
        { resourceType: 'curriculum' },
        { user: { username: { startsWith: 'itest_curriculum_' } } },
      ],
    },
  })

  await prisma.curriculum.deleteMany({
    where: { name: { startsWith: 'itest_curriculum_' } },
  })

  await prisma.course.deleteMany({
    where: {
      OR: [
        { name: { startsWith: 'itest_curriculum_' } },
        { code: { startsWith: 'ITCU' } },
      ],
    },
  })

  await prisma.major.deleteMany({
    where: { name: { startsWith: 'itest_curriculum_' } },
  })

  await prisma.department.deleteMany({
    where: { name: { startsWith: 'itest_curriculum_' } },
  })

  await prisma.admin.deleteMany({
    where: { user: { username: { startsWith: 'itest_curriculum_' } } },
  })

  await prisma.userRole.deleteMany({
    where: { user: { username: { startsWith: 'itest_curriculum_' } } },
  })

  await prisma.user.deleteMany({
    where: { username: { startsWith: 'itest_curriculum_' } },
  })
}

async function createTestUser(roleCode: string = 'student') {
  const random = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const username = `itest_curriculum_${random}`
  const hashedPassword = await bcrypt.hash('Password123', 10)

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashedPassword,
      email: `${username}@test.com`,
      realName: `培养方案测试用户_${random}`,
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
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return prisma.department.create({
    data: {
      name: `itest_curriculum_学院_${random}`,
      code: `ITCU_D${random}`,
      description: '培养方案测试学院',
      ...overrides,
    },
  })
}

async function createTestMajor(overrides: Record<string, unknown> = {}) {
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  const department = await createTestDepartment()

  return prisma.major.create({
    data: {
      name: `itest_curriculum_专业_${random}`,
      code: `ITCU_M${random}`,
      departmentId: department.id,
      degreeType: 'BACHELOR',
      totalCredits: 160.0,
      ...overrides,
    },
  })
}

async function createTestCurriculum(overrides: Record<string, unknown> = {}) {
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  const major = await createTestMajor()

  return prisma.curriculum.create({
    data: {
      name: `itest_curriculum_培养方案_${random}`,
      majorId: major.id,
      year: 2026,
      totalCredits: 160.0,
      requiredCredits: 120.0,
      electiveCredits: 40.0,
      ...overrides,
    },
  })
}

async function createTestCourse(overrides: Record<string, unknown> = {}) {
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  const department = await createTestDepartment()

  return prisma.course.create({
    data: {
      code: `ITCU_C${random}`,
      name: `itest_curriculum_课程_${random}`,
      credits: 3.0,
      hours: 48,
      courseType: 'REQUIRED',
      category: '专业核心课',
      departmentId: department.id,
      description: '培养方案测试课程',
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
  await cleanupCurriculumsData()
})

beforeEach(async () => {
  await cleanupCurriculumsData()
})

afterAll(async () => {
  await cleanupCurriculumsData()
  await prisma.$disconnect()
})

describe('GET /api/v1/curriculums', () => {
  const app = createTestApp()

  it('应该成功获取培养方案列表并支持筛选', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username, ['student'])
    const major = await createTestMajor({ name: 'itest_curriculum_筛选专业', code: 'ITCU_M101' })

    await createTestCurriculum({
      name: 'itest_curriculum_2026级培养方案',
      majorId: major.id,
      year: 2026,
    })
    await createTestCurriculum({ name: 'itest_curriculum_2027级培养方案', year: 2027 })

    const response = await request(app)
      .get('/api/v1/curriculums')
      .query({ major_id: major.id, year: 2026 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.items).toHaveLength(1)
    expect(response.body.data.items[0].name).toBe('itest_curriculum_2026级培养方案')
    expect(response.body.data.items[0].major_id).toBe(major.id)
    expect(response.body.data.pagination.total).toBe(1)
  })

  it('未认证时应该拒绝访问', async () => {
    const response = await request(app).get('/api/v1/curriculums').expect(401)

    expect(response.body.message).toContain('未提供认证令牌')
  })
})

describe('GET /api/v1/curriculums/:id', () => {
  const app = createTestApp()

  it('应该成功获取培养方案详情和课程列表', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username, ['student'])
    const curriculum = await createTestCurriculum({
      name: 'itest_curriculum_详情培养方案',
      year: 2026,
    })
    const course = await createTestCourse({
      name: 'itest_curriculum_数据结构',
      code: 'ITCU_C201',
      credits: 4.0,
    })

    await prisma.curriculumCourse.create({
      data: {
        curriculumId: curriculum.id,
        courseId: course.id,
        courseType: 'REQUIRED',
        semesterSuggestion: 2,
      },
    })

    const response = await request(app)
      .get(`/api/v1/curriculums/${curriculum.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.id).toBe(curriculum.id)
    expect(response.body.data.name).toBe('itest_curriculum_详情培养方案')
    expect(response.body.data.courses).toHaveLength(1)
    expect(response.body.data.courses[0]).toMatchObject({
      course_id: course.id,
      course_code: 'ITCU_C201',
      course_name: 'itest_curriculum_数据结构',
      credits: 4,
      course_type: 'required',
      semester_suggestion: 2,
    })
  })

  it('培养方案不存在时应该返回 404', async () => {
    const user = await createTestUser('student')
    const token = generateTestToken(user.id, user.username, ['student'])

    const response = await request(app)
      .get('/api/v1/curriculums/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404)

    expect(response.body.message).toContain('培养方案不存在')
  })
})

describe('POST /api/v1/curriculums', () => {
  const app = createTestApp()

  it('应该允许 admin 创建培养方案', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const major = await createTestMajor({ name: 'itest_curriculum_创建专业', code: 'ITCU_M301' })

    const response = await request(app)
      .post('/api/v1/curriculums')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_curriculum_新培养方案',
        major_id: major.id,
        year: 2026,
        total_credits: 160.0,
        required_credits: 120.0,
        elective_credits: 40.0,
      })
      .expect(201)

    expect(response.body.message).toBe('培养方案创建成功')
    expect(response.body.data.name).toBe('itest_curriculum_新培养方案')

    const created = await prisma.curriculum.findUnique({ where: { id: response.body.data.id } })
    expect(created?.majorId).toBe(major.id)
  })

  it('应该拒绝 student 创建培养方案', async () => {
    const student = await createTestUser('student')
    const token = generateTestToken(student.id, student.username, ['student'])
    const major = await createTestMajor()

    const response = await request(app)
      .post('/api/v1/curriculums')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_curriculum_禁止创建',
        major_id: major.id,
        year: 2026,
        total_credits: 160.0,
      })
      .expect(403)

    expect(response.body.message).toContain('权限不足')
  })

  it('缺少必填字段时应该返回 400', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])

    const response = await request(app)
      .post('/api/v1/curriculums')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'itest_curriculum_非法创建' })
      .expect(400)

    expect(response.body.message).toContain('验证失败')
  })
})

describe('PUT /api/v1/curriculums/:id', () => {
  const app = createTestApp()

  it('应该允许 admin 更新培养方案', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const curriculum = await createTestCurriculum({
      name: 'itest_curriculum_待更新方案',
      totalCredits: 150.0,
    })

    const response = await request(app)
      .put(`/api/v1/curriculums/${curriculum.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'itest_curriculum_更新后方案',
        total_credits: 165.0,
        required_credits: 125.0,
        elective_credits: 40.0,
      })
      .expect(200)

    expect(response.body.message).toBe('培养方案更新成功')
    expect(response.body.data.name).toBe('itest_curriculum_更新后方案')
    expect(response.body.data.total_credits).toBe(165)
  })

  it('非法 id 时应该返回 400', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])

    const response = await request(app)
      .put('/api/v1/curriculums/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'itest_curriculum_非法更新' })
      .expect(400)

    expect(response.body.message).toContain('验证失败')
  })
})

describe('DELETE /api/v1/curriculums/:id', () => {
  const app = createTestApp()

  it('应该允许 super_admin 删除培养方案并级联删除课程关联', async () => {
    const admin = await createTestUser('super_admin')
    const token = generateTestToken(admin.id, admin.username, ['super_admin'])
    const curriculum = await createTestCurriculum({ name: 'itest_curriculum_待删除方案' })
    const course = await createTestCourse({ code: 'ITCU_C401' })
    await prisma.curriculumCourse.create({
      data: {
        curriculumId: curriculum.id,
        courseId: course.id,
        courseType: 'REQUIRED',
      },
    })

    const response = await request(app)
      .delete(`/api/v1/curriculums/${curriculum.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.message).toBe('培养方案已删除')
    const deleted = await prisma.curriculum.findUnique({ where: { id: curriculum.id } })
    const links = await prisma.curriculumCourse.findMany({
      where: { curriculumId: curriculum.id },
    })
    expect(deleted).toBeNull()
    expect(links).toHaveLength(0)
  })

  it('应该拒绝 admin 删除培养方案', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const curriculum = await createTestCurriculum()

    await request(app)
      .delete(`/api/v1/curriculums/${curriculum.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })
})

describe('培养方案课程管理', () => {
  const app = createTestApp()

  it('应该支持添加、更新、移除课程', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const curriculum = await createTestCurriculum({ name: 'itest_curriculum_课程管理方案' })
    const course = await createTestCourse({
      name: 'itest_curriculum_编译原理',
      code: 'ITCU_C501',
    })

    await request(app)
      .post(`/api/v1/curriculums/${curriculum.id}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        course_id: course.id,
        course_type: 'required',
        semester_suggestion: 5,
      })
      .expect(200)

    let link = await prisma.curriculumCourse.findUnique({
      where: {
        curriculumId_courseId: {
          curriculumId: curriculum.id,
          courseId: course.id,
        },
      },
    })
    expect(link?.courseType).toBe('REQUIRED')
    expect(link?.semesterSuggestion).toBe(5)

    await request(app)
      .put(`/api/v1/curriculums/${curriculum.id}/courses/${course.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        course_type: 'elective',
        semester_suggestion: 6,
      })
      .expect(200)

    link = await prisma.curriculumCourse.findUnique({
      where: {
        curriculumId_courseId: {
          curriculumId: curriculum.id,
          courseId: course.id,
        },
      },
    })
    expect(link?.courseType).toBe('ELECTIVE')
    expect(link?.semesterSuggestion).toBe(6)

    await request(app)
      .delete(`/api/v1/curriculums/${curriculum.id}/courses/${course.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const removed = await prisma.curriculumCourse.findUnique({
      where: {
        curriculumId_courseId: {
          curriculumId: curriculum.id,
          courseId: course.id,
        },
      },
    })
    expect(removed).toBeNull()
  })

  it('应该支持批量添加课程并统计失败项', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const curriculum = await createTestCurriculum({ name: 'itest_curriculum_批量课程方案' })
    const courseA = await createTestCourse({ code: 'ITCU_C601' })
    const courseB = await createTestCourse({ code: 'ITCU_C602' })

    const response = await request(app)
      .post(`/api/v1/curriculums/${curriculum.id}/courses/batch`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        courses: [
          {
            course_id: courseA.id,
            course_type: 'required',
            semester_suggestion: 1,
          },
          {
            course_id: courseB.id,
            course_type: 'elective',
            semester_suggestion: 3,
          },
          {
            course_id: '00000000-0000-0000-0000-000000000000',
            course_type: 'general',
            semester_suggestion: 4,
          },
        ],
      })
      .expect(200)

    expect(response.body.data.success_count).toBe(2)
    expect(response.body.data.fail_count).toBe(1)

    const links = await prisma.curriculumCourse.findMany({
      where: { curriculumId: curriculum.id },
    })
    expect(links).toHaveLength(2)
  })

  it('应该拒绝 student 管理培养方案课程', async () => {
    const student = await createTestUser('student')
    const token = generateTestToken(student.id, student.username, ['student'])
    const curriculum = await createTestCurriculum()
    const course = await createTestCourse()

    await request(app)
      .post(`/api/v1/curriculums/${curriculum.id}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        course_id: course.id,
        course_type: 'required',
      })
      .expect(403)
  })

  it('引用不存在的课程时应该返回 404', async () => {
    const admin = await createTestUser('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const curriculum = await createTestCurriculum()

    const response = await request(app)
      .post(`/api/v1/curriculums/${curriculum.id}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        course_id: '00000000-0000-0000-0000-000000000000',
        course_type: 'required',
      })
      .expect(404)

    expect(response.body.message).toContain('课程不存在')
  })
})
