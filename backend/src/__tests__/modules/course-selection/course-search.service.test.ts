import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  student: {
    findUnique: vi.fn(),
  },
  curriculum: {
    findMany: vi.fn(),
  },
  semester: {
    findFirst: vi.fn(),
  },
  courseOffering: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  course: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prismaMock),
  CourseType: {
    REQUIRED: 'REQUIRED',
    ELECTIVE: 'ELECTIVE',
    GENERAL: 'GENERAL',
  },
  CourseStatus: {
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED',
  },
  OfferingStatus: {
    PLANNED: 'PLANNED',
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
    CANCELLED: 'CANCELLED',
  },
  EnrollmentStatus: {
    ENROLLED: 'ENROLLED',
    DROPPED: 'DROPPED',
    WITHDRAWN: 'WITHDRAWN',
  },
  SemesterStatus: {
    CURRENT: 'CURRENT',
    ARCHIVED: 'ARCHIVED',
  },
}))

import { courseSearchService } from '../../../modules/course-selection/course-search.service.js'

const buildSchedule = (overrides: Record<string, unknown> = {}) => ({
  id: 'schedule-1',
  dayOfWeek: 1,
  startWeek: 1,
  endWeek: 16,
  startPeriod: 1,
  endPeriod: 2,
  classroom: {
    building: '第一教学楼',
    roomNumber: '101',
    campus: '主校区',
  },
  notes: null,
  ...overrides,
})

const buildOffering = (overrides: Record<string, unknown> = {}) => ({
  id: 'offering-1',
  courseId: 'course-1',
  semesterId: 'semester-1',
  teacherId: 'teacher-1',
  capacity: 30,
  enrolledCount: 10,
  status: 'OPEN',
  course: {
    id: 'course-1',
    code: 'CS101',
    name: '程序设计基础',
    credits: 4,
    courseType: 'REQUIRED',
    category: '专业基础',
    description: '课程说明',
    assessmentMethod: '考试',
    status: 'ACTIVE',
    prerequisites: [],
  },
  semester: {
    id: 'semester-1',
    name: '2025-2026 春季',
  },
  teacher: {
    id: 'teacher-1',
    teacherNumber: 'T001',
    title: '教授',
    user: {
      realName: '王老师',
    },
  },
  schedules: [],
  ...overrides,
})

const buildStudent = (enrollmentOfferingId = 'selected-offering') => ({
  userId: 'student-user-1',
  majorId: 'major-1',
  grade: 2024,
  major: {
    id: 'major-1',
    name: '软件工程',
  },
  enrollments: [
    {
      status: 'ENROLLED',
      courseOffering: {
        id: enrollmentOfferingId,
        courseId: 'course-1',
        semesterId: 'semester-1',
        schedules: [],
      },
    },
  ],
})

beforeEach(() => {
  vi.resetAllMocks()

  prismaMock.student.findUnique.mockResolvedValue(buildStudent())
  prismaMock.curriculum.findMany.mockResolvedValue([
    {
      id: 'curriculum-1',
      courses: [{ courseId: 'course-1' }],
    },
  ])
  prismaMock.semester.findFirst.mockResolvedValue({ id: 'semester-1' })
})

describe('courseSearchService eligibility', () => {
  it('marks only the exact selected course offering as enrolled', async () => {
    prismaMock.courseOffering.findMany.mockResolvedValue([
      buildOffering({ id: 'selected-offering' }),
      buildOffering({ id: 'same-course-other-offering' }),
    ])

    const result = await courseSearchService.listAvailableOfferings('student-user-1', {
      semesterId: 'semester-1',
      includeUnavailable: true,
      page: 1,
      pageSize: 20,
    })

    expect(result).not.toBeTypeOf('string')
    if (typeof result === 'string') {
      throw new Error(result)
    }

    expect(result.items).toHaveLength(2)
    expect(result.items[0].eligibility.isEnrolled).toBe(true)
    expect(result.items[0].eligibility.reasons).toContain('课程已选')
    expect(result.items[1].eligibility.isEnrolled).toBe(false)
    expect(result.items[1].eligibility.reasons).not.toContain('课程已选')
  })

  it('marks non-open course offerings as unavailable', async () => {
    prismaMock.courseOffering.findMany.mockResolvedValue([
      buildOffering({ id: 'planned-offering', status: 'PLANNED' }),
    ])

    const result = await courseSearchService.listAvailableOfferings('student-user-1', {
      semesterId: 'semester-1',
      includeUnavailable: true,
      page: 1,
      pageSize: 20,
    })

    expect(result).not.toBeTypeOf('string')
    if (typeof result === 'string') {
      throw new Error(result)
    }

    expect(result.items).toHaveLength(1)
    expect(result.items[0].eligibility.isAvailable).toBe(false)
    expect(result.items[0].eligibility.reasons).toContain('课程开设未开放选课')
  })

  it('marks archived courses as unavailable', async () => {
    const archivedOffering = buildOffering()

    prismaMock.courseOffering.findMany.mockResolvedValue([
      {
        ...archivedOffering,
        id: 'archived-course-offering',
        course: {
          ...archivedOffering.course,
          status: 'ARCHIVED',
        },
      },
    ])

    const result = await courseSearchService.listAvailableOfferings('student-user-1', {
      semesterId: 'semester-1',
      includeUnavailable: true,
      page: 1,
      pageSize: 20,
    })

    expect(result).not.toBeTypeOf('string')
    if (typeof result === 'string') {
      throw new Error(result)
    }

    expect(result.items).toHaveLength(1)
    expect(result.items[0].eligibility.isAvailable).toBe(false)
    expect(result.items[0].eligibility.reasons).toContain('课程已归档')
  })

  it('returns complete eligibility flags for offering detail', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'student-user-1',
      student: { userId: 'student-user-1' },
      teacher: null,
      admin: null,
    })
    prismaMock.courseOffering.findUnique.mockResolvedValue(
      buildOffering({
        id: 'selected-offering',
        schedules: [buildSchedule()],
      })
    )
    prismaMock.student.findUnique.mockResolvedValue(buildStudent('selected-offering'))

    const result = await courseSearchService.getOfferingDetail(
      'selected-offering',
      'student-user-1',
      true
    )

    expect(result).not.toBeTypeOf('string')
    if (typeof result === 'string') {
      throw new Error(result)
    }

    expect(result.eligibility).toEqual({
      isAvailable: false,
      isEnrolled: true,
      isFull: false,
      hasTimeConflict: false,
      prerequisiteSatisfied: true,
      withinCurriculum: true,
      reasons: ['课程已选'],
    })
  })

  it('includes course offering status in detail eligibility', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'student-user-1',
      student: { userId: 'student-user-1' },
      teacher: null,
      admin: null,
    })
    prismaMock.courseOffering.findUnique.mockResolvedValue(
      buildOffering({
        id: 'closed-offering',
        status: 'CLOSED',
      })
    )
    prismaMock.student.findUnique.mockResolvedValue(buildStudent('selected-offering'))

    const result = await courseSearchService.getOfferingDetail(
      'closed-offering',
      'student-user-1',
      true
    )

    expect(result).not.toBeTypeOf('string')
    if (typeof result === 'string') {
      throw new Error(result)
    }

    expect(result.eligibility?.isAvailable).toBe(false)
    expect(result.eligibility?.reasons).toContain('课程开设未开放选课')
  })
})
