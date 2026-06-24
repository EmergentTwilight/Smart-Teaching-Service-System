import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AiAdvisorSavedRecordType,
  CourseStatus,
  CourseType,
  EnrollmentStatus,
  OfferingStatus,
  SemesterStatus,
} from '@prisma/client'

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
  score: {
    findMany: vi.fn(),
  },
  aiAdvisorSavedRecommendation: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
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
import { buildStrategyPrompt } from '../../../modules/course-selection/ai-advisor.prompts.js'

const now = new Date('2026-05-19T04:00:00.000Z')
const DEFAULT_LLM_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'

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

const buildScore = (overrides: Record<string, unknown> = {}) => ({
  id: 'score-1',
  totalScore: 85,
  enteredAt: new Date('2026-01-01T00:00:00.000Z'),
  modifiedAt: null,
  courseOffering: {
    course: {
      id: 'completed-course-1',
      credits: 4,
      courseType: CourseType.REQUIRED,
    },
  },
  ...overrides,
})

const resetBaseMocks = () => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  vi.resetAllMocks()
  delete process.env.LLM_MAX_TOKENS
  delete process.env.LLM_PREFERENCE_MAX_TOKENS
  delete process.env.LLM_RECOMMENDATION_MAX_TOKENS
  delete process.env.LLM_EXPLANATION_MAX_TOKENS

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
  prismaMock.score.findMany.mockResolvedValue([])
  prismaMock.aiAdvisorSavedRecommendation.create.mockImplementation(async ({ data }) => ({
    id: 'saved-1',
    studentId: data.studentId,
    semesterId: data.semesterId ?? null,
    courseOfferingId: data.courseOfferingId ?? null,
    recordType: data.recordType,
    title: data.title,
    question: data.question ?? null,
    requestPayload: data.requestPayload ?? null,
    resultPayload: data.resultPayload,
    createdAt: now,
    updatedAt: now,
  }))
  prismaMock.aiAdvisorSavedRecommendation.findMany.mockResolvedValue([])
  prismaMock.aiAdvisorSavedRecommendation.count.mockResolvedValue(0)
  prismaMock.aiAdvisorSavedRecommendation.findFirst.mockResolvedValue(null)
  prismaMock.aiAdvisorSavedRecommendation.deleteMany.mockResolvedValue({ count: 0 })
  llmClientMock.complete.mockResolvedValue({
    ok: false,
    reason: 'missing_api_key',
    model: DEFAULT_LLM_MODEL,
    diagnostics: {
      provider: 'openrouter',
      model: DEFAULT_LLM_MODEL,
      endpointHost: 'openrouter.ai',
      durationMs: 0,
      retriable: false,
    },
  })
}

beforeEach(() => {
  resetBaseMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ai advisor prompts', () => {
  it('does not include placeholder recommendation ids in the strategy prompt', () => {
    const prompt = buildStrategyPrompt({
      maxRecommendations: 3,
      profile: {
        preferredCourseTypes: ['required'],
        avoidEarlyMorning: false,
        preferLowLoad: false,
        preferRequiredCourses: true,
        preferGraduationProgress: true,
        riskTolerance: 'medium',
      },
      candidates: [
        {
          id: 'offering-1',
          courseCode: 'CS101',
          courseName: '程序设计基础',
          credits: 4,
          courseType: 'required',
          teacherName: '王老师',
          remainingCapacity: 20,
          riskHints: [],
          score: 90,
        },
      ],
    })

    expect(prompt).toContain('allowed_course_offering_ids')
    expect(prompt).toContain('offering-1')
    expect(prompt).not.toContain('uuid1')
    expect(prompt).not.toContain('uuid2')
    expect(prompt).not.toContain('balanced|required_first|low_risk')
  })
})

describe('aiAdvisorService.recommend', () => {
  it('falls back to rule plans when the LLM is unavailable', async () => {
    const result = await aiAdvisorService.recommend('student-1', {
      maxRecommendations: 5,
    })

    expect(result.degradedMode).toBe('rule_only')
    expect(result.llmUsed).toBe(false)
    expect(result.fallbackInfo).toMatchObject({
      reason: 'missing_api_key',
      source: 'llm',
      stage: 'recommendation',
      retriable: false,
      diagnostics: expect.objectContaining({
        provider: 'openrouter',
        retriable: false,
      }),
    })
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

  it('uses effective passed scores to satisfy prerequisites', async () => {
    prismaMock.enrollment.findMany.mockResolvedValue([])
    prismaMock.score.findMany.mockResolvedValue([
      buildScore({
        courseOffering: {
          course: {
            id: 'pre-course-1',
            credits: 4,
            courseType: CourseType.REQUIRED,
          },
        },
      }),
    ])
    prismaMock.courseOffering.findMany.mockResolvedValue([
      buildOffering({
        course: buildCourse({
          prerequisites: [{ prerequisiteId: 'pre-course-1' }],
        }),
      }),
    ])

    const result = await aiAdvisorService.recommend('student-1', {
      maxRecommendations: 5,
    })

    expect(result.recommendations.map((item) => item.courseOfferingId)).toEqual(['offering-1'])
    expect(result.progressAudit?.completedCredits).toBe(4)
    expect(result.progressAudit?.projectedCredits).toBe(4)
  })

  it('does not recommend courses already passed by effective score', async () => {
    prismaMock.enrollment.findMany.mockResolvedValue([])
    prismaMock.score.findMany.mockResolvedValue([
      buildScore({
        courseOffering: {
          course: {
            id: 'course-1',
            credits: 4,
            courseType: CourseType.REQUIRED,
          },
        },
      }),
    ])

    const result = await aiAdvisorService.recommend('student-1', {
      maxRecommendations: 5,
    })

    expect(result.recommendations).toHaveLength(0)
    expect(result.conflictNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          courseOfferingId: 'offering-1',
          message: '课程已通过',
        }),
      ])
    )
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
    expect(result.fallbackInfo?.reason).toBe('llm_validation_failed')
    expect(result.fallbackInfo?.stage).toBe('recommendation')
    expect(result.fallbackInfo?.missingComponents).toContain('llm_strategy')
    expect(result.recommendations.map((item) => item.courseOfferingId)).toEqual(['offering-1'])
  })

  it('exposes provider status diagnostics when the LLM provider is rate limited', async () => {
    llmClientMock.complete.mockResolvedValueOnce({
      ok: false,
      reason: 'provider_error:429',
      model: DEFAULT_LLM_MODEL,
      diagnostics: {
        provider: 'openrouter',
        model: DEFAULT_LLM_MODEL,
        endpointHost: 'openrouter.ai',
        statusCode: 429,
        providerMessage: 'Rate limit exceeded',
        retryAfter: '60',
        durationMs: 1200,
        retriable: true,
      },
    })

    const result = await aiAdvisorService.recommend('student-1', {
      maxRecommendations: 5,
    })

    expect(result.degradedMode).toBe('rule_only')
    expect(result.llmUsed).toBe(false)
    expect(result.fallbackInfo).toMatchObject({
      reason: 'provider_error:429',
      stage: 'recommendation',
      retriable: true,
      diagnostics: expect.objectContaining({
        statusCode: 429,
        retryAfter: '60',
      }),
    })
  })

  it('uses 16000 max tokens for preference and recommendation LLM stages by default', async () => {
    llmClientMock.complete
      .mockResolvedValueOnce({
        ok: true,
        model: DEFAULT_LLM_MODEL,
        content: JSON.stringify({
          targetCredits: 18,
          preferredCourseTypes: ['required', 'elective'],
          avoidEarlyMorning: true,
          preferLowLoad: false,
          preferRequiredCourses: true,
          preferGraduationProgress: true,
          riskTolerance: 'medium',
          naturalLanguagePreference: '优先核心课',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        model: DEFAULT_LLM_MODEL,
        content: JSON.stringify({
          plans: [
            {
              id: 'balanced',
              title: '稳妥推进',
              rationale: '优先选择当前可选核心课',
              recommendationIds: ['offering-1'],
              riskLevel: 'low',
            },
          ],
          recommendationSummary: '优先补齐核心课。',
        }),
      })

    const result = await aiAdvisorService.recommend('student-1', {
      maxRecommendations: 5,
      preferences: {
        naturalLanguagePreference: '想优先核心课',
      },
    })

    expect(result.llmUsed).toBe(true)
    expect(result.degradedMode).toBe('full')
    expect(result.fallbackInfo).toBeUndefined()
    expect(result.plans?.map((plan) => plan.id)).toContain('balanced')

    expect(llmClientMock.complete).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ maxTokens: 16000 })
    )
    expect(llmClientMock.complete).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      expect.objectContaining({ maxTokens: 16000 })
    )
  })

  it('coerces string-typed LLM preference fields before building strategy prompts', async () => {
    llmClientMock.complete
      .mockResolvedValueOnce({
        ok: true,
        model: DEFAULT_LLM_MODEL,
        content: JSON.stringify({
          targetCredits: '18',
          preferredCourseTypes: ['required'],
          avoidEarlyMorning: 'true',
          preferLowLoad: 'false',
          preferRequiredCourses: 'true',
          preferGraduationProgress: 'true',
          riskTolerance: 'medium',
          naturalLanguagePreference: '优先核心课',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        model: DEFAULT_LLM_MODEL,
        content: JSON.stringify({
          plans: [
            {
              id: 'balanced',
              title: '核心课优先',
              rationale: '按偏好优先推进核心课程。',
              recommendationIds: ['offering-1'],
              riskLevel: 'low',
            },
          ],
          recommendationSummary: '优先补齐核心课。',
        }),
      })

    const result = await aiAdvisorService.recommend('student-1', {
      maxRecommendations: 5,
      preferences: {
        naturalLanguagePreference: '想优先核心课',
      },
    })

    const strategyRequest = llmClientMock.complete.mock.calls[1][0] as { content: string }
    expect(strategyRequest.content).toContain('"targetCredits":18')
    expect(strategyRequest.content).toContain('"avoidEarlyMorning":true')
    expect(strategyRequest.content).toContain('"preferLowLoad":false')
    expect(strategyRequest.content).toContain('"preferRequiredCourses":true')
    expect(strategyRequest.content).toContain('"preferGraduationProgress":true')
    expect(result.llmUsed).toBe(true)
    expect(result.fallbackInfo).toBeUndefined()
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
    expect(result.fallbackInfo).toMatchObject({
      reason: 'missing_api_key',
      source: 'llm',
      stage: 'explanation',
      retriable: false,
    })
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
  })

  it('uses 16000 max tokens for explanation LLM stage by default', async () => {
    await aiAdvisorService.explain('student-1', 'offering-1')

    expect(llmClientMock.complete).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ maxTokens: 16000 })
    )
  })
})

describe('aiAdvisorService saved records', () => {
  it('saves recommendation snapshots for the current student without enrollment writes', async () => {
    const result = await aiAdvisorService.saveRecord('student-1', {
      recordType: 'recommendation',
      title: '稳妥推荐',
      question: '帮我推荐低风险课程',
      semesterId: 'semester-1',
      requestPayload: { question: '帮我推荐低风险课程' },
      resultPayload: { recommendations: [], disclaimer: '仅供参考' },
    })

    expect(prismaMock.aiAdvisorSavedRecommendation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: 'student-1',
        semesterId: 'semester-1',
        recordType: AiAdvisorSavedRecordType.RECOMMENDATION,
        title: '稳妥推荐',
      }),
    })
    expect(result).toMatchObject({
      id: 'saved-1',
      studentId: 'student-1',
      recordType: 'recommendation',
      title: '稳妥推荐',
    })
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('requires saved explanations to reference an existing offering', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(null)

    await expect(
      aiAdvisorService.saveRecord('student-1', {
        recordType: 'explanation',
        title: '课程解释',
        courseOfferingId: 'missing-offering',
        resultPayload: { explanation: '说明' },
      })
    ).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('lists only current student saved records', async () => {
    prismaMock.aiAdvisorSavedRecommendation.findMany.mockResolvedValueOnce([
      {
        id: 'saved-1',
        studentId: 'student-1',
        semesterId: 'semester-1',
        courseOfferingId: null,
        recordType: AiAdvisorSavedRecordType.RECOMMENDATION,
        title: '稳妥推荐',
        question: null,
        requestPayload: null,
        resultPayload: { recommendations: [] },
        createdAt: now,
        updatedAt: now,
      },
    ])
    prismaMock.aiAdvisorSavedRecommendation.count.mockResolvedValueOnce(1)

    const result = await aiAdvisorService.listSavedRecords('student-1', {
      page: 1,
      pageSize: 20,
    })

    expect(prismaMock.aiAdvisorSavedRecommendation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: 'student-1' }),
      })
    )
    expect(result.items).toHaveLength(1)
    expect(result.pagination.total).toBe(1)
  })

  it('does not delete another student saved record', async () => {
    await expect(aiAdvisorService.deleteSavedRecord('student-1', 'saved-other')).rejects.toMatchObject({
      statusCode: 404,
    })

    expect(prismaMock.aiAdvisorSavedRecommendation.deleteMany).toHaveBeenCalledWith({
      where: { id: 'saved-other', studentId: 'student-1' },
    })
  })
})
