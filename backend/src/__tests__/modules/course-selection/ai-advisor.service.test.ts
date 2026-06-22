import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CourseStatus, CourseType, EnrollmentStatus, OfferingStatus, SemesterStatus } from '@prisma/client'

const prismaMock = vi.hoisted(() => ({
  student: {
    findUnique: vi.fn(),
  },
  semester: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  selectionPeriod: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  curriculum: {
    findMany: vi.fn(),
  },
  enrollment: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  courseOffering: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}))

const llmClientMock = vi.hoisted(() => ({
  complete: vi.fn(),
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

vi.mock('../../../modules/course-selection/ai-advisor.llm-client.js', () => ({
  llmClient: llmClientMock,
}))

import { aiAdvisorService } from '../../../modules/course-selection/ai-advisor.service.js'

const now = new Date('2026-05-19T04:00:00.000Z')

const buildSchedule = (overrides: Record<string, unknown> = {}) => ({
  dayOfWeek: 1,
  startWeek: 1,
  endWeek: 16,
  startPeriod: 3,
  endPeriod: 4,
  ...overrides,
})

const buildCourse = (overrides: Record<string, unknown> = {}) => ({
  id: 'course-1',
  code: 'CS101',
  name: '程序设计基础',
  credits: 4,
  courseType: CourseType.REQUIRED,
  status: CourseStatus.ACTIVE,
  prerequisites: [],
  ...overrides,
})

const buildOffering = (overrides: Record<string, unknown> = {}) => ({
  id: 'offering-1',
  course: buildCourse(),
  teacher: {
    user: {
      realName: '王老师',
    },
  },
  capacity: 30,
  enrolledCount: 10,
  status: OfferingStatus.OPEN,
  schedules: [buildSchedule()],
  ...overrides,
})

const buildEnrollment = (overrides: Record<string, unknown> = {}) => ({
  courseOfferingId: 'current-offering-1',
  status: EnrollmentStatus.ENROLLED,
  courseOffering: {
    course: buildCourse({
      id: 'current-course-1',
      code: 'CS100',
      name: '大学计算机',
      credits: 2,
    }),
    schedules: [buildSchedule({ startPeriod: 7, endPeriod: 8 })],
  },
  ...overrides,
})

const resetBaseMocks = () => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  vi.resetAllMocks()

  prismaMock.student.findUnique.mockResolvedValue({
    userId: 'student-1',
    grade: 2024,
    majorId: 'major-1',
    className: '软工 2401',
  })
  prismaMock.semester.findUnique.mockResolvedValue({
    id: 'semester-1',
    name: '2025-2026 春季',
  })
  prismaMock.semester.findFirst.mockImplementation(async (args?: { where?: { status?: string } }) => {
    if (args?.where?.status === SemesterStatus.CURRENT) {
      return { id: 'semester-1', name: '2025-2026 春季' }
    }
    return { id: 'semester-1', name: '2025-2026 春季' }
  })
  prismaMock.selectionPeriod.findFirst.mockResolvedValue(null)
  prismaMock.selectionPeriod.findMany.mockResolvedValue([
    {
      id: 'period-1',
      semesterId: 'semester-1',
      startTime: new Date('2026-05-01T00:00:00.000Z'),
      endTime: new Date('2026-06-01T00:00:00.000Z'),
      maxCredits: 28,
      isActive: true,
    },
  ])
  prismaMock.curriculum.findMany.mockResolvedValue([
    {
      id: 'curriculum-1',
      name: '软件工程 2024 培养方案',
      totalCredits: 160,
      requiredCredits: 100,
      electiveCredits: 40,
      courses: [
        { courseId: 'course-1', course: { id: 'course-1', courseType: CourseType.REQUIRED } },
        { courseId: 'course-2', course: { id: 'course-2', courseType: CourseType.ELECTIVE } },
        { courseId: 'course-3', course: { id: 'course-3', courseType: CourseType.REQUIRED } },
      ],
    },
  ])
  prismaMock.enrollment.findMany.mockResolvedValue([buildEnrollment()])
  prismaMock.courseOffering.findMany.mockResolvedValue([buildOffering()])
  prismaMock.courseOffering.findUnique.mockResolvedValue({ semesterId: 'semester-1' })
  llmClientMock.complete.mockResolvedValue({ ok: false, reason: 'missing_api_key' })
}

beforeEach(() => {
  resetBaseMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('aiAdvisorService.recommend', () => {
  it('falls back to rule plans when the LLM is unavailable', async () => {
    const result = await aiAdvisorService.recommend('student-1', {
      maxRecommendations: 5,
    })

    expect(result.degradedMode).toBe('rule_only')
    expect(result.llmUsed).toBe(false)
    expect(result.fallbackInfo?.reason).toBe('LLM 生成失败，返回模板方案')
    expect(result.recommendations).toHaveLength(1)
    expect(result.plans?.length).toBeGreaterThan(0)
    expect(result.recommendations[0].scoreBreakdown?.curriculumMatch).toBe(0.3)
    expect(result.progressAudit?.requiredGap).toBe(98)
    expect(result.scheduleLoad?.loadLevel).toBe('low')
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('rejects student identity fields inside preferences', async () => {
    await expect(
      aiAdvisorService.recommend('student-1', {
        maxRecommendations: 5,
        preferences: { student_id: 'other-student' },
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('keeps full and conflicting offerings out of recommendations', async () => {
    prismaMock.courseOffering.findMany.mockResolvedValue([
      buildOffering(),
      buildOffering({
        id: 'full-offering',
        course: buildCourse({ id: 'course-2', code: 'CS102', name: '编译原理', courseType: CourseType.ELECTIVE }),
        capacity: 10,
        enrolledCount: 10,
      }),
      buildOffering({
        id: 'conflict-offering',
        course: buildCourse({ id: 'course-3', code: 'CS103', name: '算法设计' }),
        schedules: [buildSchedule({ startPeriod: 7, endPeriod: 8 })],
      }),
    ])

    const result = await aiAdvisorService.recommend('student-1', {
      maxRecommendations: 10,
    })

    expect(result.recommendations.map((item) => item.courseOfferingId)).toEqual(['offering-1'])
    expect(result.conflictNotes.map((item) => item.courseOfferingId)).toEqual([
      'full-offering',
      'conflict-offering',
    ])
  })

  it('falls back when the LLM recommends only ids outside the safe pool', async () => {
    llmClientMock.complete.mockResolvedValueOnce({
      ok: true,
      model: 'test-model',
      content: JSON.stringify({
        plans: [
          {
            id: 'balanced',
            title: '无效方案',
            rationale: '只包含不存在课程',
            recommendationIds: ['not-in-safe-pool'],
            riskLevel: 'low',
          },
        ],
        recommendationSummary: 'invalid',
      }),
    })

    const result = await aiAdvisorService.recommend('student-1', {
      maxRecommendations: 5,
    })

    expect(result.llmUsed).toBe(false)
    expect(result.degradedMode).toBe('rule_only')
    expect(result.fallbackInfo?.missingComponents).toContain('llm_strategy')
    expect(result.recommendations.map((item) => item.courseOfferingId)).toEqual(['offering-1'])
  })
})

describe('aiAdvisorService.explain', () => {
  it('returns hard rule results when explanation LLM is unavailable', async () => {
    const result = await aiAdvisorService.explain('student-1', 'offering-1')

    expect(result.courseOfferingId).toBe('offering-1')
    expect(result.hardRuleResult).toEqual({
      isSelectableNow: true,
      reasons: ['课程通过硬规则校验'],
    })
    expect(result.degradedMode).toBe('rule_only')
    expect(result.llmUsed).toBe(false)
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
  })
})
