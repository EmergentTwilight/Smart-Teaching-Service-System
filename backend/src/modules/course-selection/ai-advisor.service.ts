import { randomUUID } from 'node:crypto'
import { AppError } from '@stss/shared'
import {
  COURSE_SELECTION_ERROR_CODES,
  type AiAdvisorMode,
  type AiAdvicePayload,
  type AiCapacityRisk,
  type AiCourseScoreBreakdown,
  type AiExplainResult,
  type AiFallbackInfo,
  type AiDebugInfo,
  type AiDebugStage,
  type AiProgressAudit,
  type AiRecommendationItem,
  type AiRecommendationPlan,
  type AiAdvisorSavedRecordItem,
  type AiAdvisorSavedRecordListPayload,
  type AiAdvisorSavedRecordQuery,
  type AiAdvisorSavedRecordTypeValue,
  type AiScheduleLoad,
  type SaveAiAdvisorRecordBody,
} from './course-selection.types.js'
import {
  AiAdvisorSavedRecordType,
  CourseStatus,
  CourseType,
  EnrollmentStatus,
  OfferingStatus,
  Prisma,
} from '@prisma/client'
import prisma from '../../shared/prisma/client.js'
import {
  buildPaginationMeta,
  decimalToNumber,
  resolveMaxCreditsForSemester,
  resolveSemesterId,
  schedulesConflict,
} from './course-selection.support.js'
import {
  PASS_LINE,
  SUBMITTED_SCORE_STATUSES,
  pickEffectiveScoresByCourse,
  toNumber,
} from '../score-management/score-statistics.js'
import { llmClient, type LlmCompletionResult } from './ai-advisor.llm-client.js'
import {
  buildFallbackPlanTitle,
  getFallbackPlanRationale,
  getFallbackSummary,
} from './ai-advisor.templates.js'
import {
  buildPreferenceInterpretPrompt,
  buildSingleExplainPrompt,
  buildStrategyPrompt,
  parseExplainFromLlm,
  parseLlmPreference,
  parsePlansFromLlm,
  type ParsedLlmPlan,
  type PreferenceProfileInput,
} from './ai-advisor.prompts.js'
import type { AiRecommendBody } from './course-selection.schemas.js'

const AI_DISCLAIMER =
  'AI 建议仅供参考，最终是否选课以提交选课时的服务端校验结果为准，不会替代正式选课流程。'
const BASE_EXPLAIN_DISCLAIMER =
  '该解释仅辅助理解，最终是否选课以提交选课时的服务端校验结果为准。'

const MAX_RECOMMENDATION_LIMIT = 10
const FALLBACK_PLAN_LIMIT = 5
const WEEKDAY_NAMES: Record<number, string> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
}

type AdvisorCourseType = 'required' | 'elective' | 'general'
type CapacityRiskLevel = 'low' | 'medium' | 'high'
type CreditBuckets = Record<AdvisorCourseType, number>

const toCourseTypeValue = (value: CourseType): AdvisorCourseType => {
  if (value === CourseType.REQUIRED) {
    return 'required'
  }

  if (value === CourseType.ELECTIVE) {
    return 'elective'
  }

  return 'general'
}

const toNum = decimalToNumber

const clampScore = (value: number): number => Math.max(0, Math.min(1, Number(value.toFixed(4))))
const resolveLlmTimeoutMs = () => Math.max(Number(process.env.LLM_TIMEOUT_MS ?? 600000), 600000)
const DEFAULT_LLM_PREFERENCE_MAX_TOKENS = 1024
const DEFAULT_LLM_RECOMMENDATION_MAX_TOKENS = 4096
const DEFAULT_LLM_EXPLANATION_MAX_TOKENS = 2048
const parseLlmMaxTokens = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}
const resolvePreferenceMaxTokens = () =>
  parseLlmMaxTokens(process.env.LLM_PREFERENCE_MAX_TOKENS, DEFAULT_LLM_PREFERENCE_MAX_TOKENS)
const resolveRecommendationMaxTokens = () =>
  parseLlmMaxTokens(
    process.env.LLM_RECOMMENDATION_MAX_TOKENS ?? process.env.LLM_MAX_TOKENS,
    DEFAULT_LLM_RECOMMENDATION_MAX_TOKENS
  )
const resolveExplanationMaxTokens = () =>
  parseLlmMaxTokens(process.env.LLM_EXPLANATION_MAX_TOKENS, DEFAULT_LLM_EXPLANATION_MAX_TOKENS)

const isNonRetriableLlmReason = (reason: string): boolean =>
  reason === 'missing_api_key' ||
  reason === 'provider_disabled' ||
  reason === 'llm_contains_forbidden_phrase' ||
  reason === 'llm_explain_contains_forbidden_phrase'

const buildLlmFallbackInfo = (params: {
  stage: 'preference' | 'recommendation' | 'explanation'
  reason: string
  mode: AiAdvisorMode
  result?: LlmCompletionResult
  model?: string | null
  missingComponents?: string[]
  retriable?: boolean
}): AiFallbackInfo => ({
  code: 'policy_validation_failed',
  reason: params.reason,
  source: 'llm',
  retriable: params.retriable ?? params.result?.diagnostics?.retriable ?? !isNonRetriableLlmReason(params.reason),
  mode: params.mode,
  missingComponents: params.missingComponents,
  llmUsed: false,
  model: params.result?.model ?? params.model ?? null,
  stage: params.stage,
  diagnostics: params.result?.diagnostics,
})

const logAiFallback = (params: {
  requestId?: string
  studentId?: string
  semesterId?: string
  endpoint: 'recommend' | 'explain'
  fallbackInfo: AiFallbackInfo
}) => {
  console.warn('[course-selection.ai-advisor.fallback]', {
    requestId: params.requestId,
    studentId: params.studentId,
    semesterId: params.semesterId,
    endpoint: params.endpoint,
    stage: params.fallbackInfo.stage,
    reason: params.fallbackInfo.reason,
    mode: params.fallbackInfo.mode,
    retriable: params.fallbackInfo.retriable,
    model: params.fallbackInfo.model,
    diagnostics: params.fallbackInfo.diagnostics,
  })
}

const toDebugStage = (
  stage: AiDebugStage['stage'],
  result: LlmCompletionResult,
  status: AiDebugStage['status'],
  reason?: string
): AiDebugStage => {
  const diagnostics = result.diagnostics
  return {
    provider: diagnostics?.provider ?? 'openrouter',
    stage,
    status,
    reason,
    model: result.model ?? diagnostics?.model ?? null,
    endpointHost: diagnostics?.endpointHost,
    statusCode: diagnostics?.statusCode,
    providerCode: diagnostics?.providerCode,
    providerMessage: diagnostics?.providerMessage,
    providerRawErrorSummary: diagnostics?.providerRawErrorSummary,
    finishReason: diagnostics?.finishReason,
    nativeFinishReason: diagnostics?.nativeFinishReason,
    promptTokens: diagnostics?.promptTokens ?? result.usage?.promptTokens,
    completionTokens: diagnostics?.completionTokens ?? result.usage?.completionTokens,
    totalTokens: diagnostics?.totalTokens ?? result.usage?.totalTokens,
    reasoningTokens: diagnostics?.reasoningTokens,
    retryAfter: diagnostics?.retryAfter,
    durationMs: diagnostics?.durationMs,
    retriable: diagnostics?.retriable,
  }
}

const skippedDebugStage = (stage: AiDebugStage['stage'], reason: string): AiDebugStage => ({
  provider: 'openrouter',
  stage,
  status: 'skipped',
  reason,
  model: null,
  retriable: false,
})

const ruleDebugStage = (reason: string): AiDebugStage => ({
  provider: 'openrouter',
  stage: 'rule',
  status: 'fallback',
  reason,
  model: null,
  retriable: false,
})

const buildDebugInfo = (
  requestId: string,
  endpoint: AiDebugInfo['endpoint'],
  stages: AiDebugStage[]
): AiDebugInfo => ({
  requestId,
  endpoint,
  llmTimeoutMs: resolveLlmTimeoutMs(),
  generatedAt: new Date().toISOString(),
  stages,
})

const parseText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value === 1
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y'
  }

  return false
}

const parseOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true
    }
    if (value === 0) {
      return false
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y') {
      return true
    }
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'n') {
      return false
    }
  }

  return undefined
}

const parsePositiveNumber = (value: unknown): number | null => {
  const normalized = typeof value === 'string' && value.trim() !== '' ? Number(value.trim()) : value
  if (typeof normalized !== 'number' || !Number.isFinite(normalized) || normalized < 0) {
    return null
  }

  return Math.floor(normalized)
}

const normalizeCourseTypes = (value: unknown): ('required' | 'elective' | 'general')[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized = new Set<'required' | 'elective' | 'general'>()

  for (const item of value) {
    if (typeof item !== 'string') {
      continue
    }

    const low = item.toLowerCase()
    if (low === 'required' || low === 'elective' || low === 'general') {
      normalized.add(low)
    }
  }

  return Array.from(normalized)
}

const parseRiskTolerance = (value: unknown): 'low' | 'medium' | 'high' => {
  if (typeof value !== 'string') {
    return 'low'
  }

  const low = value.toLowerCase()
  return low === 'medium' || low === 'high' ? low : 'low'
}

const containsForbiddenPhrase = (value: string): boolean => {
  if (!value) {
    return false
  }

  const lower = value.toLowerCase()
  return [
    '已为你选课',
    '已选上',
    '已锁定名额',
    '已抢到课程',
    '保证能选上',
    '不用再提交',
    '系统已经帮你完成',
    '自动提交',
    '帮你抢课',
  ].some((item) => lower.includes(item))
}

interface StudentCtx {
  studentId: string
  grade: number
  majorId: string | null
  className: string | null
}

interface SelectionPeriodCtx {
  isOpen: boolean
  maxCredits: number | null
}

interface CurriculumCtx {
  curriculumId: string
  curriculumName: string
  totalCredits: number
  requiredCredits: number | null
  electiveCredits: number | null
  generalCredits: number | null
  mandatoryCourses: Set<string>
}

interface EnrolledCourse {
  courseId: string
  offeringId: string
  credits: number
  courseType: AdvisorCourseType
  schedules: {
    dayOfWeek: number
    startWeek: number
    endWeek: number
    startPeriod: number
    endPeriod: number
  }[]
}

interface CompletedCourse {
  courseId: string
  credits: number
  courseType: AdvisorCourseType
}

interface OfferingSnapshot {
  offeringId: string
  courseId: string
  code: string
  name: string
  credits: number
  courseType: AdvisorCourseType
  teacherName: string
  capacity: number
  enrolledCount: number
  remainingCapacity: number
  offeringStatus: OfferingStatus
  courseStatus: CourseStatus
  prerequisites: string[]
  schedules: {
    dayOfWeek: number
    startWeek: number
    endWeek: number
    startPeriod: number
    endPeriod: number
  }[]
}

interface AdvisorContext {
  student: {
    studentId: string
    grade: number
    majorId: string | null
    className: string | null
  }
  semester: {
    id: string
    name: string
  }
  period: SelectionPeriodCtx
  curriculum: CurriculumCtx
  enrolled: {
    byOfferingId: Set<string>
    byCourseId: Set<string>
    byCourseType: {
      required: number
      elective: number
      general: number
    }
    items: EnrolledCourse[]
    totalCredits: number
  }
  completed: {
    byCourseId: Set<string>
    byCourseType: CreditBuckets
    items: CompletedCourse[]
    totalCredits: number
  }
  offerings: OfferingSnapshot[]
}

interface CandidateSnapshot {
  courseOfferingId: string
  courseCode: string
  courseName: string
  credits: number
  teacherName: string
  courseType: AdvisorCourseType

  isEnrolled: boolean
  isFull: boolean
  hasTimeConflict: boolean
  prerequisiteSatisfied: boolean
  withinCurriculum: boolean
  withinSelectionPeriod: boolean
  underMaxCredits: boolean

  risks: string[]
  reasons: string[]
  recommendationReasons: string[]
  recommendationScore: number
  scoreBreakdown: AiCourseScoreBreakdown
  remainingCapacity: number
}

interface CandidateContext {
  candidate: CandidateSnapshot
}

interface CandidatePools {
  all: CandidateContext[]
  safe: CandidateContext[]
  risky: CandidateContext[]
  blocked: CandidateContext[]
}

interface PreferenceProfile extends PreferenceProfileInput {
  source: 'request_fields' | 'llm_interpreted' | 'default'
}

interface ValidationReport {
  valid: boolean
  invalidCourseOfferingIds: string[]
  warnings: string[]
  action: 'accept' | 'fallback_template'
}

interface C6Blackboard {
  requestMeta: {
    requestId: string
    semesterId?: string
    maxRecommendations: number
    startedAt: string
  }
  authContext: {
    userId: string
    role: 'student'
  }
  context: AdvisorContext
  candidatePools: CandidatePools
  progressAudit: AiProgressAudit
  scheduleLoad: AiScheduleLoad
  capacityRisks: AiCapacityRisk[]
  preferenceProfile: PreferenceProfile
  validationReport?: ValidationReport
  fallbackInfo?: AiFallbackInfo
}

const emptyCreditBuckets = (): CreditBuckets => ({
  required: 0,
  elective: 0,
  general: 0,
})

const addCreditsToBucket = (bucket: CreditBuckets, courseType: AdvisorCourseType, credits: number) => {
  bucket[courseType] += credits
}

const buildProgressCreditBuckets = (context: AdvisorContext) => {
  const byCourseType = emptyCreditBuckets()
  const countedCourseIds = new Set<string>()
  let completedCredits = 0
  let inProgressCredits = 0

  for (const item of context.completed.items) {
    countedCourseIds.add(item.courseId)
    addCreditsToBucket(byCourseType, item.courseType, item.credits)
    completedCredits += item.credits
  }

  for (const item of context.enrolled.items) {
    if (countedCourseIds.has(item.courseId)) {
      continue
    }

    countedCourseIds.add(item.courseId)
    addCreditsToBucket(byCourseType, item.courseType, item.credits)
    inProgressCredits += item.credits
  }

  return {
    byCourseType,
    completedCredits,
    inProgressCredits,
    projectedCredits: completedCredits + inProgressCredits,
  }
}

const resolveStudent = async (studentId: string): Promise<StudentCtx> => {
  const student = await prisma.student.findUnique({
    where: { userId: studentId },
    select: {
      userId: true,
      grade: true,
      majorId: true,
      className: true,
    },
  })

  if (!student) {
    throw new AppError(COURSE_SELECTION_ERROR_CODES.NOT_FOUND, 404, '无法识别当前学生身份')
  }

  return {
    studentId: student.userId,
    grade: student.grade,
    majorId: student.majorId,
    className: student.className,
  }
}

const resolvePeriod = async (semesterId: string): Promise<SelectionPeriodCtx> => {
  const now = new Date()
  const periods = await prisma.selectionPeriod.findMany({
    where: {
      semesterId,
      isActive: true,
    },
    orderBy: { startTime: 'desc' },
  })

  const open = periods.find(
    (period) => now >= period.startTime && now <= period.endTime
  )

  return {
    isOpen: Boolean(open),
    maxCredits: await resolveMaxCreditsForSemester(semesterId),
  }
}

const resolveCurriculum = async (student: StudentCtx): Promise<CurriculumCtx> => {
  if (!student.majorId) {
    throw new AppError(COURSE_SELECTION_ERROR_CODES.NOT_FOUND, 404, '当前学生未绑定专业')
  }

  const curricula = await prisma.curriculum.findMany({
    where: {
      majorId: student.majorId,
      year: student.grade,
    },
    include: {
      courses: {
        include: {
          course: {
            select: {
              id: true,
              courseType: true,
            },
          },
        },
      },
    },
  })

  if (curricula.length === 0) {
    throw new AppError(COURSE_SELECTION_ERROR_CODES.NOT_FOUND, 404, '未找到匹配培养方案')
  }

  if (curricula.length > 1) {
    throw new AppError(
      COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED,
      400,
      '培养方案匹配不唯一，请联系教务管理员确认'
    )
  }

  const curriculum = curricula[0]
  const mandatoryCourses = new Set<string>()

  for (const item of curriculum.courses) {
    mandatoryCourses.add(item.courseId)
  }

  return {
    curriculumId: curriculum.id,
    curriculumName: curriculum.name,
    totalCredits: toNum(curriculum.totalCredits),
    requiredCredits: curriculum.requiredCredits === null ? null : toNum(curriculum.requiredCredits),
    electiveCredits: curriculum.electiveCredits === null ? null : toNum(curriculum.electiveCredits),
    generalCredits: null,
    mandatoryCourses,
  }
}

const resolveEnrollmentState = async (studentId: string, semesterId: string) => {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
      status: EnrollmentStatus.ENROLLED,
      courseOffering: {
        semesterId,
      },
    },
    include: {
      courseOffering: {
        include: {
          course: {
            select: {
              id: true,
              courseType: true,
              credits: true,
            },
          },
          schedules: {
            select: {
              dayOfWeek: true,
              startWeek: true,
              endWeek: true,
              startPeriod: true,
              endPeriod: true,
            },
          },
        },
      },
    },
  })

  const byOfferingId = new Set<string>()
  const byCourseId = new Set<string>()
  let requiredCredits = 0
  let electiveCredits = 0
  let generalCredits = 0
  let totalCredits = 0
  const items: EnrolledCourse[] = []

  for (const enrollment of enrollments) {
    const courseType = toCourseTypeValue(enrollment.courseOffering.course.courseType)
    const credits = toNum(enrollment.courseOffering.course.credits)

    byOfferingId.add(enrollment.courseOfferingId)
    byCourseId.add(enrollment.courseOffering.course.id)

    if (courseType === 'required') {
      requiredCredits += credits
    }
    if (courseType === 'elective') {
      electiveCredits += credits
    }
    if (courseType === 'general') {
      generalCredits += credits
    }

    totalCredits += credits

    items.push({
      courseId: enrollment.courseOffering.course.id,
      offeringId: enrollment.courseOfferingId,
      credits,
      courseType,
      schedules: enrollment.courseOffering.schedules.map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek,
        startWeek: schedule.startWeek,
        endWeek: schedule.endWeek,
        startPeriod: schedule.startPeriod,
        endPeriod: schedule.endPeriod,
      })),
    })
  }

  return {
    byOfferingId,
    byCourseId,
    byCourseType: {
      required: requiredCredits,
      elective: electiveCredits,
      general: generalCredits,
    },
    totalCredits,
    items,
  }
}

const resolveCompletedState = async (studentId: string) => {
  const scores = await prisma.score.findMany({
    where: {
      studentId,
      status: {
        in: [...SUBMITTED_SCORE_STATUSES],
      },
    },
    include: {
      courseOffering: {
        include: {
          course: {
            select: {
              id: true,
              credits: true,
              courseType: true,
            },
          },
        },
      },
    },
  })

  const byCourseId = new Set<string>()
  const byCourseType = emptyCreditBuckets()
  let totalCredits = 0
  const items: CompletedCourse[] = []

  for (const score of pickEffectiveScoresByCourse(scores)) {
    const totalScore = toNumber(score.totalScore)
    if (totalScore === null || totalScore < PASS_LINE) {
      continue
    }

    const course = score.courseOffering.course
    const courseType = toCourseTypeValue(course.courseType)
    const credits = toNum(course.credits)

    byCourseId.add(course.id)
    addCreditsToBucket(byCourseType, courseType, credits)
    totalCredits += credits
    items.push({
      courseId: course.id,
      credits,
      courseType,
    })
  }

  return {
    byCourseId,
    byCourseType,
    totalCredits,
    items,
  }
}

const resolveOfferings = async (semesterId: string): Promise<OfferingSnapshot[]> => {
  const offerings = await prisma.courseOffering.findMany({
    where: { semesterId },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          name: true,
          credits: true,
          courseType: true,
          status: true,
          prerequisites: {
            include: {
              prerequisite: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
      teacher: {
        include: {
          user: {
            select: {
              realName: true,
            },
          },
        },
      },
      schedules: {
        select: {
          dayOfWeek: true,
          startWeek: true,
          endWeek: true,
          startPeriod: true,
          endPeriod: true,
        },
      },
    },
  })

  return offerings.map((offering) => ({
    offeringId: offering.id,
    courseId: offering.course.id,
    code: offering.course.code,
    name: offering.course.name,
    credits: toNum(offering.course.credits),
    courseType: toCourseTypeValue(offering.course.courseType),
    teacherName: offering.teacher?.user?.realName ?? '未设置',
    capacity: toNum(offering.capacity),
    enrolledCount: toNum(offering.enrolledCount),
    remainingCapacity: Math.max(0, toNum(offering.capacity) - toNum(offering.enrolledCount)),
    offeringStatus: offering.status,
    courseStatus: offering.course.status,
    prerequisites: offering.course.prerequisites.map((item) => item.prerequisiteId),
    schedules: offering.schedules.map((schedule) => ({
      dayOfWeek: schedule.dayOfWeek,
      startWeek: schedule.startWeek,
      endWeek: schedule.endWeek,
      startPeriod: schedule.startPeriod,
      endPeriod: schedule.endPeriod,
    })),
  }))
}

const buildContext = async (studentId: string, semesterId?: string): Promise<AdvisorContext> => {
  const student = await resolveStudent(studentId)
  const semester = await resolveSemesterId(semesterId)
  const period = await resolvePeriod(semester.id)
  const curriculum = await resolveCurriculum(student)
  const enrollmentState = await resolveEnrollmentState(studentId, semester.id)
  const completedState = await resolveCompletedState(studentId)
  const offerings = await resolveOfferings(semester.id)

  return {
    student,
    semester,
    period,
    curriculum,
    enrolled: {
      byOfferingId: enrollmentState.byOfferingId,
      byCourseId: enrollmentState.byCourseId,
      byCourseType: enrollmentState.byCourseType,
      items: enrollmentState.items,
      totalCredits: enrollmentState.totalCredits,
    },
    completed: {
      byCourseId: completedState.byCourseId,
      byCourseType: completedState.byCourseType,
      items: completedState.items,
      totalCredits: completedState.totalCredits,
    },
    offerings,
  }
}

const buildProgressAudit = (context: AdvisorContext): AiProgressAudit => {
  const progress = buildProgressCreditBuckets(context)
  const requiredGap = context.curriculum.requiredCredits === null
    ? 0
    : Math.max(0, context.curriculum.requiredCredits - progress.byCourseType.required)
  const electiveGap = context.curriculum.electiveCredits === null
    ? 0
    : Math.max(0, context.curriculum.electiveCredits - progress.byCourseType.elective)
  const generalGap = context.curriculum.generalCredits === null
    ? 0
    : Math.max(0, context.curriculum.generalCredits - progress.byCourseType.general)

  const priorityGaps = [
    {
      courseType: 'required' as const,
      gapCredits: requiredGap,
      reason: '必修课缺口会直接影响培养方案进度。',
    },
    {
      courseType: 'elective' as const,
      gapCredits: electiveGap,
      reason: '选修课缺口可通过本学期可选课程逐步补足。',
    },
    {
      courseType: 'general' as const,
      gapCredits: generalGap,
      reason: '通识类缺口可作为低负担备选方向。',
    },
  ]
    .filter((item) => item.gapCredits > 0)
    .map((item) => ({
      ...item,
      urgency: item.gapCredits >= 8 ? 'high' as const : item.gapCredits >= 4 ? 'medium' as const : 'low' as const,
    }))
    .sort((left, right) => right.gapCredits - left.gapCredits)

  return {
    currentSelectedCredits: context.enrolled.totalCredits,
    completedCredits: progress.completedCredits,
    inProgressCredits: progress.inProgressCredits,
    projectedCredits: progress.projectedCredits,
    targetCredits: context.curriculum.totalCredits,
    maxCredits: context.period.maxCredits,
    requiredGap,
    electiveGap,
    generalGap,
    priorityGaps,
  }
}

const analyzeScheduleLoad = (context: AdvisorContext): AiScheduleLoad => {
  const schedules = context.enrolled.items.flatMap((item) => item.schedules)
  const earlyMorningCount = schedules.filter((item) => item.startPeriod <= 2).length
  const byDay = new Map<number, number>()

  for (const schedule of schedules) {
    const span = Math.max(1, schedule.endPeriod - schedule.startPeriod + 1)
    byDay.set(schedule.dayOfWeek, (byDay.get(schedule.dayOfWeek) ?? 0) + span)
  }

  const denseDays = Array.from(byDay.entries())
    .filter(([, periods]) => periods >= 6)
    .map(([day]) => WEEKDAY_NAMES[day] ?? `周${day}`)

  const loadScore = clampScore((schedules.length * 0.08) + (earlyMorningCount * 0.08) + (denseDays.length * 0.12))
  const loadLevel = loadScore >= 0.65 ? 'high' : loadScore >= 0.35 ? 'medium' : 'low'
  const notes: string[] = []

  if (earlyMorningCount > 0) {
    notes.push(`当前已选课程中有 ${earlyMorningCount} 个早课时段。`)
  }
  if (denseDays.length > 0) {
    notes.push(`${denseDays.join('、')} 课程相对密集。`)
  }
  if (notes.length === 0) {
    notes.push('当前已选课表负担较平稳。')
  }

  return {
    earlyMorningCount,
    denseDays,
    loadScore,
    loadLevel,
    notes,
  }
}

const getCapacityRisk = (offering: OfferingSnapshot): AiCapacityRisk => {
  const fillRate = offering.capacity <= 0
    ? 1
    : clampScore(offering.enrolledCount / offering.capacity)

  let riskLevel: CapacityRiskLevel = 'low'
  let riskReason = '剩余容量相对充足。'

  if (offering.remainingCapacity <= 0 || fillRate >= 0.95) {
    riskLevel = 'high'
    riskReason = '课程容量已满或接近满员。'
  } else if (offering.remainingCapacity <= 3 || fillRate >= 0.8) {
    riskLevel = 'medium'
    riskReason = '课程剩余名额较少，建议准备备选。'
  }

  return {
    courseOfferingId: offering.offeringId,
    courseName: offering.name,
    remainingCapacity: offering.remainingCapacity,
    fillRate,
    riskLevel,
    riskReason,
  }
}

const analyzeCapacityRisks = (context: AdvisorContext): AiCapacityRisk[] =>
  context.offerings.map((offering) => getCapacityRisk(offering))

const scoreCandidate = (
  context: AdvisorContext,
  offering: OfferingSnapshot,
  flags: {
    withinCurriculum: boolean
    hasTimeConflict: boolean
  },
  risks: string[]
): AiCourseScoreBreakdown => {
  const progress = buildProgressCreditBuckets(context)
  const requiredGap = context.curriculum.requiredCredits === null
    ? 0
    : Math.max(0, context.curriculum.requiredCredits - progress.byCourseType.required)
  const electiveGap = context.curriculum.electiveCredits === null
    ? 0
    : Math.max(0, context.curriculum.electiveCredits - progress.byCourseType.elective)
  const generalGap = context.curriculum.generalCredits === null
    ? 0
    : Math.max(0, context.curriculum.generalCredits - progress.byCourseType.general)
  const gapFitMap: Record<AdvisorCourseType, number> = {
    required: requiredGap > 0 ? 0.2 : 0.08,
    elective: electiveGap > 0 ? 0.18 : 0.08,
    general: generalGap > 0 ? 0.16 : 0.08,
  }
  const capacityRisk = getCapacityRisk(offering).riskLevel

  return {
    curriculumMatch: flags.withinCurriculum ? 0.3 : 0,
    creditGapFit: gapFitMap[offering.courseType],
    scheduleFit: flags.hasTimeConflict
      ? 0
      : offering.schedules.some((item) => item.startPeriod <= 2) ? 0.08 : 0.15,
    preferenceFit: offering.courseType === 'required' ? 0.15 : 0.1,
    capacityFit: capacityRisk === 'low' ? 0.1 : capacityRisk === 'medium' ? 0.05 : 0,
    riskInverse: risks.length === 0 ? 0.1 : Math.max(0, 0.1 - risks.length * 0.03),
  }
}

const sumScoreBreakdown = (breakdown: AiCourseScoreBreakdown): number =>
  clampScore(
    breakdown.curriculumMatch +
      breakdown.creditGapFit +
      breakdown.scheduleFit +
      breakdown.preferenceFit +
      breakdown.capacityFit +
      breakdown.riskInverse
  )

const evaluateCandidates = (context: AdvisorContext): CandidatePools => {
  const enrolledSchedules = context.enrolled.items.flatMap((item) => item.schedules)
  const progress = buildProgressCreditBuckets(context)

  const candidates = context.offerings.map<CandidateContext>((offering) => {
    const isEnrolled = context.enrolled.byOfferingId.has(offering.offeringId)
    const isCompleted = context.completed.byCourseId.has(offering.courseId)
    const isFull = offering.remainingCapacity <= 0
    const hasTimeConflict = offering.schedules.some((offeringSchedule) =>
      enrolledSchedules.some((enrolledSchedule) => schedulesConflict(offeringSchedule, enrolledSchedule))
    )

    const prerequisiteSatisfied = offering.prerequisites.every((id) => context.completed.byCourseId.has(id))
    const withinCurriculum = context.curriculum.mandatoryCourses.has(offering.courseId)

    const reasons: string[] = []

    if (offering.courseStatus !== CourseStatus.ACTIVE) {
      reasons.push('课程主数据未启用')
    }

    if (offering.offeringStatus === OfferingStatus.CANCELLED) {
      reasons.push('课程已取消')
    } else if (offering.offeringStatus === OfferingStatus.CLOSED) {
      reasons.push('课程未开放选课')
    } else if (offering.offeringStatus === OfferingStatus.PLANNED) {
      reasons.push('课程尚未开始报名')
    }

    if (isEnrolled) {
      reasons.push('课程已选')
    }

    if (isCompleted) {
      reasons.push('课程已通过')
    }

    if (isFull) {
      reasons.push('课程容量已满')
    }

    if (!context.period.isOpen) {
      reasons.push('当前非选课阶段')
    }

    if (!withinCurriculum) {
      reasons.push('课程不在当前培养方案中')
    }

    if (hasTimeConflict) {
      reasons.push('课程与已选课程时间冲突')
    }

    if (!prerequisiteSatisfied) {
      reasons.push('先修课程未满足')
    }

    const underMaxCredits = context.period.maxCredits === null
      ? true
      : context.enrolled.totalCredits + offering.credits <= context.period.maxCredits

    if (!underMaxCredits) {
      reasons.push('加入该课程后超出本学期最大学分')
    }

    const risks: string[] = []
    if (offering.remainingCapacity > 0 && offering.remainingCapacity <= 3) {
      risks.push('课程剩余名额较少')
    }

    if (offering.prerequisites.length > 0 && !prerequisiteSatisfied) {
      risks.push('先修课程未满足')
    }

    if (offering.schedules.some((item) => item.startPeriod <= 2)) {
      risks.push('该课程可能存在早课')
    }

    const recommendationReasons: string[] = []
    if (withinCurriculum) {
      recommendationReasons.push('属于当前培养方案范围')
    }
    if (offering.remainingCapacity > 3) {
      recommendationReasons.push('当前仍有相对充足名额')
    }
    if (!hasTimeConflict) {
      recommendationReasons.push('与已选课程无时间冲突')
    }

    const requiredGap =
      context.curriculum.requiredCredits === null
        ? 0
        : Math.max(0, context.curriculum.requiredCredits - progress.byCourseType.required)

    const electiveGap =
      context.curriculum.electiveCredits === null
        ? 0
        : Math.max(0, context.curriculum.electiveCredits - progress.byCourseType.elective)

    const generalGap =
      context.curriculum.generalCredits === null
        ? 0
        : Math.max(0, context.curriculum.generalCredits - progress.byCourseType.general)

    if (withinCurriculum && offering.courseType === 'required' && requiredGap > 0) {
      recommendationReasons.push('可帮助补齐必修课程缺口')
    }

    if (withinCurriculum && offering.courseType === 'elective' && electiveGap > 0) {
      recommendationReasons.push('可帮助补齐选修课程缺口')
    }

    if (withinCurriculum && offering.courseType === 'general' && generalGap > 0) {
      recommendationReasons.push('可帮助补齐通识课程缺口')
    }
    const scoreBreakdown = scoreCandidate(context, offering, { withinCurriculum, hasTimeConflict }, risks)
    const safe = reasons.length === 0
    const recommendationScore = safe ? sumScoreBreakdown(scoreBreakdown) : 0

    return {
      candidate: {
        courseOfferingId: offering.offeringId,
        courseCode: offering.code,
        courseName: offering.name,
        credits: offering.credits,
        teacherName: offering.teacherName,
        courseType: offering.courseType,
        isEnrolled,
        isFull,
        hasTimeConflict,
        prerequisiteSatisfied,
        withinCurriculum,
        withinSelectionPeriod: context.period.isOpen,
        underMaxCredits,
        risks,
        reasons,
        recommendationReasons: safe
          ? Array.from(new Set(['该课程通过硬性规则校验', ...recommendationReasons]))
          : [],
        recommendationScore: safe ? recommendationScore : 0,
        scoreBreakdown,
        remainingCapacity: offering.remainingCapacity,
      },
    }
  })

  const safe = candidates.filter(({ candidate }) => candidate.reasons.length === 0)
  const blocked = candidates.filter(({ candidate }) => candidate.reasons.length > 0)
  const risky = safe.filter(({ candidate }) => candidate.risks.length > 0)

  return { all: candidates, safe, risky, blocked }
}

const parsePreferenceFromRequest = (preferences?: Record<string, unknown>): PreferenceProfileInput => {
  const raw = preferences ?? {}

  if ('student_id' in raw || 'studentId' in raw || 'user_id' in raw) {
    throw new AppError(
      COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED,
      400,
      'recommend 请求不能携带学生身份字段，请从登录态识别'
    )
  }

  const targetCredits = parsePositiveNumber(
    (raw as { targetCredits?: unknown }).targetCredits ?? (raw as { target_credits?: unknown }).target_credits
  )

  const preferredCourseTypes = normalizeCourseTypes(
    (raw as { preferredCourseTypes?: unknown }).preferredCourseTypes ??
      (raw as { preferred_course_types?: unknown }).preferred_course_types
  )

  const naturalLanguagePreference = parseText(
    (raw as { naturalLanguagePreference?: unknown }).naturalLanguagePreference ??
      (raw as { natural_language_preference?: unknown }).natural_language_preference
  )

  const avoidEarlyMorning = parseBoolean(
    (raw as { avoidEarlyMorning?: unknown }).avoidEarlyMorning ??
      (raw as { avoid_early_morning?: unknown }).avoid_early_morning
  )

  const preferLowLoad = parseBoolean(
    (raw as { preferLowLoad?: unknown }).preferLowLoad ??
      (raw as { prefer_low_load?: unknown }).prefer_low_load
  )

  const preferRequiredCourses = parseBoolean(
    (raw as { preferRequiredCourses?: unknown }).preferRequiredCourses ??
      (raw as { prefer_required_courses?: unknown }).prefer_required_courses
  )

  const preferGraduationProgress = parseBoolean(
    (raw as { preferGraduationProgress?: unknown }).preferGraduationProgress ??
      (raw as { prefer_graduation_progress?: unknown }).prefer_graduation_progress
  )

  const riskTolerance = parseRiskTolerance(
    (raw as { riskTolerance?: unknown }).riskTolerance ??
      (raw as { risk_tolerance?: unknown }).risk_tolerance
  )

  return {
    targetCredits,
    preferredCourseTypes: preferredCourseTypes.length > 0 ? preferredCourseTypes : ['required', 'elective', 'general'],
    avoidEarlyMorning,
    preferLowLoad,
    preferRequiredCourses,
    preferGraduationProgress,
    riskTolerance,
    naturalLanguagePreference: naturalLanguagePreference || undefined,
  }
}

const withLlmPreference = async (
  preference: PreferenceProfileInput
): Promise<{ preference: PreferenceProfileInput; fallbackInfo?: AiFallbackInfo; debugStage: AiDebugStage }> => {
  if (!preference.naturalLanguagePreference) {
    return { preference, debugStage: skippedDebugStage('preference', 'no_natural_language_preference') }
  }

  const llmResult = await llmClient.complete(
    {
      role: 'user',
      content: buildPreferenceInterpretPrompt({
        targetCredits: preference.targetCredits,
        preferredCourseTypes: preference.preferredCourseTypes,
        avoidEarlyMorning: preference.avoidEarlyMorning,
        preferLowLoad: preference.preferLowLoad,
        preferRequiredCourses: preference.preferRequiredCourses,
        preferGraduationProgress: preference.preferGraduationProgress,
        riskTolerance: preference.riskTolerance,
        naturalLanguagePreference: preference.naturalLanguagePreference,
      }),
    },
    {
      maxTokens: resolvePreferenceMaxTokens(),
      timeoutMs: resolveLlmTimeoutMs(),
      temperature: 0.1,
    }
  )

  if (!llmResult.ok) {
    const reason = llmResult.reason ?? 'llm_preference_failed'
    return {
      preference,
      fallbackInfo: buildLlmFallbackInfo({
        stage: 'preference',
        reason,
        mode: 'rule_only',
        result: llmResult,
        missingComponents: ['llm_preference'],
      }),
      debugStage: toDebugStage('preference', llmResult, 'failed', reason),
    }
  }
  if (!llmResult.content) {
    const reason = 'llm_preference_empty_content'
    return {
      preference,
      fallbackInfo: buildLlmFallbackInfo({
        stage: 'preference',
        reason,
        mode: 'rule_only',
        result: llmResult,
        missingComponents: ['llm_preference'],
      }),
      debugStage: toDebugStage('preference', llmResult, 'failed', reason),
    }
  }

  const parsed = parseLlmPreference(llmResult.content)
  if (!parsed) {
    const reason = 'llm_preference_invalid_format'
    return {
      preference,
      fallbackInfo: buildLlmFallbackInfo({
        stage: 'preference',
        reason,
        mode: 'rule_only',
        result: llmResult,
        missingComponents: ['llm_preference'],
      }),
      debugStage: toDebugStage('preference', llmResult, 'failed', reason),
    }
  }

  return {
    preference: {
      ...preference,
      targetCredits: parsePositiveNumber(parsed.targetCredits) ?? preference.targetCredits,
      preferredCourseTypes:
        normalizeCourseTypes(parsed.preferredCourseTypes).length > 0
          ? normalizeCourseTypes(parsed.preferredCourseTypes)
          : preference.preferredCourseTypes,
      avoidEarlyMorning:
        parseOptionalBoolean(parsed.avoidEarlyMorning) ?? preference.avoidEarlyMorning,
      preferLowLoad: parseOptionalBoolean(parsed.preferLowLoad) ?? preference.preferLowLoad,
      preferRequiredCourses:
        parseOptionalBoolean(parsed.preferRequiredCourses) ?? preference.preferRequiredCourses,
      preferGraduationProgress:
        parseOptionalBoolean(parsed.preferGraduationProgress) ?? preference.preferGraduationProgress,
      riskTolerance: parseRiskTolerance(parsed.riskTolerance),
    },
    debugStage: toDebugStage('preference', llmResult, 'success', 'preference_parsed'),
  }
}

const buildRecommendationItem = (candidate: CandidateSnapshot): AiRecommendationItem => {
  const reasons = candidate.reasons.length > 0
    ? [...candidate.reasons]
    : candidate.recommendationReasons.length > 0
      ? [...candidate.recommendationReasons]
      : ['该课程通过硬性规则校验']

  return {
    courseOfferingId: candidate.courseOfferingId,
    courseCode: candidate.courseCode,
    courseName: candidate.courseName,
    credits: candidate.credits,
    teacherName: candidate.teacherName,
    recommendationScore: candidate.recommendationScore,
    reasons,
    risks: candidate.risks,
    eligibilitySnapshot: {
      isAvailable: candidate.reasons.length === 0,
      remainingCapacity: candidate.remainingCapacity,
      hasTimeConflict: candidate.hasTimeConflict,
      prerequisiteSatisfied: candidate.prerequisiteSatisfied,
      isFull: candidate.isFull,
      isEnrolled: candidate.isEnrolled,
      withinCurriculum: candidate.withinCurriculum,
      withinSelectionPeriod: candidate.withinSelectionPeriod,
      underMaxCredits: candidate.underMaxCredits,
      reasons: candidate.reasons,
    },
    scoreBreakdown: candidate.scoreBreakdown,
  }
}

const buildPlan = (
  planId: 'balanced' | 'required_first' | 'low_risk',
  title: string,
  rationale: string,
  itemIds: string[],
  map: Map<string, AiRecommendationItem>,
  limit: number
): AiRecommendationPlan | null => {
  const recommendations = itemIds
    .filter((id, index, list) => list.indexOf(id) === index)
    .map((id) => map.get(id))
    .filter(Boolean) as AiRecommendationItem[]

  if (recommendations.length === 0) {
    return null
  }

  const uniqueRecs = recommendations.slice(0, limit)
  const projectedCredits = uniqueRecs.reduce((sum, item) => sum + item.credits, 0)
  const riskCount = uniqueRecs.reduce((sum, item) => sum + Math.max(0, item.risks.length), 0)

  const riskLevel = riskCount >= 3 ? 'high' : riskCount >= 1 ? 'medium' : 'low'
  const planScore = Number(
    (
      uniqueRecs.reduce((sum, item) => sum + item.recommendationScore, 0) / uniqueRecs.length
    ).toFixed(4)
  )
  const keyTradeoffs = riskCount > 0
    ? ['包含部分风险提示，建议结合课程详情确认。']
    : ['全部推荐课程均通过硬性规则校验。']

  return {
    id: planId,
    title,
    rationale,
    recommendations: uniqueRecs,
    projectedCredits,
    totalCredits: projectedCredits,
    riskLevel,
    planScore,
    keyTradeoffs,
  }
}

const isPlan = (plan: AiRecommendationPlan | null): plan is AiRecommendationPlan => plan !== null

const buildFallbackPlans = (
  candidates: CandidateSnapshot[],
  recommendationLimit: number
): AiRecommendationPlan[] => {
  if (candidates.length === 0) {
    return []
  }

  const items = candidates
    .slice()
    .sort((left, right) => right.recommendationScore - left.recommendationScore)

  const map = new Map<string, AiRecommendationItem>()

  for (const candidate of items) {
    map.set(candidate.courseOfferingId, buildRecommendationItem(candidate))
  }

  const recommended = Array.from(map.keys())

  const balanced = buildPlan(
    'balanced',
    buildFallbackPlanTitle('balanced'),
    getFallbackPlanRationale('balanced'),
    [...recommended],
    map,
    recommendationLimit
  )

  const requiredFirst = buildPlan(
    'required_first',
    buildFallbackPlanTitle('required_first'),
    getFallbackPlanRationale('required_first'),
    [...items]
      .filter((item) => item.courseType === 'required')
      .map((item) => item.courseOfferingId),
    map,
    recommendationLimit
  )

  const lowRisk = buildPlan(
    'low_risk',
    buildFallbackPlanTitle('low_risk'),
    getFallbackPlanRationale('low_risk'),
    [...items].sort((left, right) => {
      const leftRisk = left.risks.length
      const rightRisk = right.risks.length
      if (leftRisk !== rightRisk) {
        return leftRisk - rightRisk
      }
      return right.recommendationScore - left.recommendationScore
    }).map((item) => item.courseOfferingId),
    map,
    recommendationLimit
  )

  return [balanced, requiredFirst, lowRisk].filter(isPlan)
}

const sortByPreference = (
  candidates: CandidateContext[],
  preference: PreferenceProfileInput
): CandidateContext[] => {
  const preferredSet = new Set(preference.preferredCourseTypes)

  return [...candidates].sort((leftWrap, rightWrap) => {
    const left = leftWrap.candidate
    const right = rightWrap.candidate

    const leftInPref = preferredSet.has(left.courseType)
    const rightInPref = preferredSet.has(right.courseType)

    if (leftInPref !== rightInPref) {
      return leftInPref ? -1 : 1
    }

    let leftScore = left.recommendationScore
    let rightScore = right.recommendationScore

    if (preference.preferRequiredCourses && left.courseType === 'required') {
      leftScore += 0.05
    }
    if (preference.preferRequiredCourses && right.courseType === 'required') {
      rightScore += 0.05
    }

    if (preference.preferLowLoad) {
      if (left.risks.length > 0) {
        leftScore -= 0.03 * left.risks.length
      }
      if (right.risks.length > 0) {
        rightScore -= 0.03 * right.risks.length
      }
    }

    if (preference.avoidEarlyMorning) {
      const leftEarly = left.risks.some((item) => item.includes('早课'))
      const rightEarly = right.risks.some((item) => item.includes('早课'))

      if (leftEarly && !rightEarly) {
        leftScore -= 0.04
      }
      if (!leftEarly && rightEarly) {
        rightScore -= 0.04
      }
    }

    if (leftScore === rightScore) {
      return right.credits - left.credits
    }

    return rightScore - leftScore
  })
}

const resolvePreferenceSource = (
  rawPreferences: Record<string, unknown> | undefined,
  rawPreference: PreferenceProfileInput,
  resolvedPreference: PreferenceProfileInput
): PreferenceProfile['source'] => {
  if (rawPreference.naturalLanguagePreference && JSON.stringify(rawPreference) !== JSON.stringify(resolvedPreference)) {
    return 'llm_interpreted'
  }

  return rawPreferences && Object.keys(rawPreferences).length > 0 ? 'request_fields' : 'default'
}

const buildBlackboard = ({
  requestId,
  studentId,
  body,
  recommendationLimit,
  context,
  candidatePools,
  rawPreference,
  preference,
}: {
  requestId: string
  studentId: string
  body: AiRecommendBody
  recommendationLimit: number
  context: AdvisorContext
  candidatePools: CandidatePools
  rawPreference: PreferenceProfileInput
  preference: PreferenceProfileInput
}): C6Blackboard => ({
  requestMeta: {
    requestId,
    semesterId: body.semesterId,
    maxRecommendations: recommendationLimit,
    startedAt: new Date().toISOString(),
  },
  authContext: {
    userId: studentId,
    role: 'student',
  },
  context,
  candidatePools,
  progressAudit: buildProgressAudit(context),
  scheduleLoad: analyzeScheduleLoad(context),
  capacityRisks: analyzeCapacityRisks(context),
  preferenceProfile: {
    ...preference,
    source: resolvePreferenceSource(body.preferences, rawPreference, preference),
  },
})

interface ParsedLlmPlanIdsResult {
  balanced: string[]
  requiredFirst: string[]
  lowRisk: string[]
  recommendationSummary?: string
  rationaleByPlanId: {
    balanced?: string
    requiredFirst?: string
    lowRisk?: string
  }
  valid: boolean
}

const parseLlmPlanIds = (
  plans: ParsedLlmPlan[] | undefined,
  allowedIds: Set<string>
): ParsedLlmPlanIdsResult => {
  const fallback = {
    balanced: [],
    requiredFirst: [],
    lowRisk: [],
    recommendationSummary: undefined,
    rationaleByPlanId: {},
    valid: false,
  } as ParsedLlmPlanIdsResult

  if (!plans || plans.length === 0) {
    return fallback
  }

  for (const plan of plans) {
    const ids = Array.isArray(plan.recommendationIds)
      ? plan.recommendationIds
          .filter((id) => typeof id === 'string' && allowedIds.has(id))
          .filter((item, index, array) => array.indexOf(item) === index)
      : []

    if (ids.length === 0) {
      continue
    }

    if (plan.id === 'balanced' || plan.id === 'safe') {
      fallback.balanced = ids
      fallback.rationaleByPlanId.balanced = parseText(plan.rationale)
      fallback.valid = true
    }

    if (plan.id === 'required_first' || plan.id === 'gap_filling') {
      fallback.requiredFirst = ids
      fallback.rationaleByPlanId.requiredFirst = parseText(plan.rationale)
      fallback.valid = true
    }

    if (plan.id === 'low_risk' || plan.id === 'low_load') {
      fallback.lowRisk = ids
      fallback.rationaleByPlanId.lowRisk = parseText(plan.rationale)
      fallback.valid = true
    }

    if (!fallback.recommendationSummary && parseText(plan.rationale)) {
      fallback.recommendationSummary = parseText(plan.rationale)
    }

    if (
      plan.riskLevel &&
      plan.riskLevel !== 'low' &&
      plan.riskLevel !== 'medium' &&
      plan.riskLevel !== 'high'
    ) {
      fallback.valid = false
    }
  }

  if (
    fallback.balanced.length === 0 &&
    fallback.requiredFirst.length === 0 &&
    fallback.lowRisk.length === 0
  ) {
    fallback.valid = false
  }

  return fallback
}

const withLlmPlans = async (
  context: AdvisorContext,
  preference: PreferenceProfileInput,
  candidates: CandidateContext[],
  recommendationLimit: number
): Promise<{
  plans: AiRecommendationPlan[]
  recommendationSummary?: string
  model: string | null
  fallbackReason?: string
  fallbackInfo?: AiFallbackInfo
  debugStage: AiDebugStage
}> => {
  if (candidates.length === 0) {
    return {
      plans: [],
      model: null,
      fallbackReason: 'no_safe_candidates',
      debugStage: skippedDebugStage('recommendation', 'no_safe_candidates'),
    }
  }

  const planInput = candidates.map(({ candidate }) => ({
    id: candidate.courseOfferingId,
    courseCode: candidate.courseCode,
    courseName: candidate.courseName,
    credits: candidate.credits,
    courseType: candidate.courseType,
    teacherName: candidate.teacherName,
    remainingCapacity: candidate.remainingCapacity,
    riskHints: candidate.risks,
    score: candidate.recommendationScore,
  }))

  const result = await llmClient.complete(
    {
      role: 'user',
      content: buildStrategyPrompt({
        maxRecommendations: recommendationLimit,
        profile: {
          targetCredits: preference.targetCredits,
          preferredCourseTypes: preference.preferredCourseTypes,
          avoidEarlyMorning: preference.avoidEarlyMorning,
          preferLowLoad: preference.preferLowLoad,
          preferRequiredCourses: preference.preferRequiredCourses,
          preferGraduationProgress: preference.preferGraduationProgress,
          riskTolerance: preference.riskTolerance,
          naturalLanguagePreference: preference.naturalLanguagePreference,
        },
        candidates: planInput,
        fallbackContext: {
          currentCredits: context.enrolled.totalCredits,
          maxCredits: context.period.maxCredits,
          curriculumTotal: context.curriculum.totalCredits,
        },
      }),
    },
    {
      maxTokens: resolveRecommendationMaxTokens(),
      timeoutMs: resolveLlmTimeoutMs(),
      temperature: 0.25,
    }
  )

  if (!result.ok) {
    const fallbackReason = result.reason ?? 'llm_strategy_failed'
    return {
      plans: [],
      model: result.model ?? null,
      fallbackReason,
      fallbackInfo: buildLlmFallbackInfo({
        stage: 'recommendation',
        reason: fallbackReason,
        mode: 'rule_only',
        result,
        missingComponents: ['llm_strategy'],
      }),
      debugStage: toDebugStage('recommendation', result, 'failed', fallbackReason),
    }
  }

  const parsed = parsePlansFromLlm(result)
  if (!parsed?.plans || parsed.plans.length === 0) {
    const fallbackReason = 'llm_invalid_format'
    return {
      plans: [],
      model: result.model ?? null,
      recommendationSummary: getFallbackSummary(),
      fallbackReason,
      fallbackInfo: buildLlmFallbackInfo({
        stage: 'recommendation',
        reason: fallbackReason,
        mode: 'rule_only',
        result,
        missingComponents: ['llm_strategy'],
      }),
      debugStage: toDebugStage('recommendation', result, 'failed', fallbackReason),
    }
  }

  const allowedIds = new Set(candidates.map(({ candidate }) => candidate.courseOfferingId))
  const parsedIds = parseLlmPlanIds(parsed.plans, allowedIds)

  if (!parsedIds.valid) {
    const fallbackReason = 'llm_validation_failed'
    return {
      plans: [],
      model: result.model ?? null,
      recommendationSummary: parsed.recommendationSummary,
      fallbackReason,
      fallbackInfo: buildLlmFallbackInfo({
        stage: 'recommendation',
        reason: fallbackReason,
        mode: 'rule_only',
        result,
        missingComponents: ['llm_strategy'],
      }),
      debugStage: toDebugStage('recommendation', result, 'failed', fallbackReason),
    }
  }

  const recommendationItems = candidates.map(({ candidate }) => buildRecommendationItem(candidate))
  const itemMap = new Map<string, AiRecommendationItem>()

  for (const item of recommendationItems) {
    itemMap.set(item.courseOfferingId, item)
  }

  const plans = [
      buildPlan(
        'balanced',
        buildFallbackPlanTitle('balanced'),
        parsedIds.rationaleByPlanId.balanced || getFallbackPlanRationale('balanced'),
        parsedIds.balanced,
        itemMap,
        recommendationLimit
      ),
      buildPlan(
        'required_first',
        buildFallbackPlanTitle('required_first'),
        parsedIds.rationaleByPlanId.requiredFirst || getFallbackPlanRationale('required_first'),
        parsedIds.requiredFirst,
        itemMap,
        recommendationLimit
      ),
      buildPlan(
        'low_risk',
        buildFallbackPlanTitle('low_risk'),
        parsedIds.rationaleByPlanId.lowRisk || getFallbackPlanRationale('low_risk'),
        parsedIds.lowRisk,
        itemMap,
        recommendationLimit
      ),
  ].filter(isPlan)

  if (plans.length === 0) {
    const fallbackReason = 'llm_validation_failed'
    return {
      plans: [],
      model: result.model ?? null,
      recommendationSummary: parsed.recommendationSummary,
      fallbackReason,
      fallbackInfo: buildLlmFallbackInfo({
        stage: 'recommendation',
        reason: fallbackReason,
        mode: 'rule_only',
        result,
        missingComponents: ['llm_strategy'],
      }),
      debugStage: toDebugStage('recommendation', result, 'failed', fallbackReason),
    }
  }

  const hasForbidden = plans.some((plan) => {
    return (
      (containsForbiddenPhrase(plan.rationale)) ||
      plan.recommendations.some(
        (item) => containsForbiddenPhrase(item.courseName) || containsForbiddenPhrase(item.teacherName)
      )
    )
  })

  if (hasForbidden) {
    const fallbackReason = 'llm_contains_forbidden_phrase'
    return {
      plans: [],
      model: result.model ?? null,
      recommendationSummary: getFallbackSummary(),
      fallbackReason,
      fallbackInfo: buildLlmFallbackInfo({
        stage: 'recommendation',
        reason: fallbackReason,
        mode: 'rule_only',
        result,
        missingComponents: ['llm_strategy'],
        retriable: false,
      }),
      debugStage: toDebugStage('recommendation', result, 'failed', fallbackReason),
    }
  }

  return {
    plans,
    model: result.model ?? null,
    recommendationSummary: parsed.recommendationSummary ?? getFallbackSummary(),
    debugStage: toDebugStage('recommendation', result, 'success', 'llm_strategy_accepted'),
  }
}

const buildAdvicePayload = (
  blackboard: C6Blackboard,
  recommendations: CandidateContext[],
  blocked: CandidateContext[],
  mode: AiAdvisorMode,
  recommendationLimit: number,
  plans: AiRecommendationPlan[],
  recommendationSummary: string,
  llmUsed: boolean,
  model: string | null,
  fallbackInfo?: AiFallbackInfo,
  debugInfo?: AiDebugInfo
): AiAdvicePayload => {
  const context = blackboard.context
  const sorted = recommendations.slice(0, recommendationLimit)
  const ranked = sorted.map(({ candidate }) => candidate)

  const uniqueItems: AiRecommendationItem[] = []
  const dedupe = new Set<string>()

  for (const item of ranked) {
    if (dedupe.has(item.courseOfferingId)) {
      continue
    }

    dedupe.add(item.courseOfferingId)
    uniqueItems.push(buildRecommendationItem(item))
  }

  const conflictNotes = blocked
    .filter(({ candidate }) => candidate.reasons.length > 0)
    .slice(0, 40)
    .map(({ candidate }) => ({
      courseOfferingId: candidate.courseOfferingId,
      courseName: candidate.courseName,
      message: candidate.reasons[0] ?? '不可推荐',
    }))

  const targetCredits = context.curriculum.totalCredits
  const progress = buildProgressCreditBuckets(context)
  const remainingToTarget =
    targetCredits > 0 ? Math.max(0, targetCredits - progress.projectedCredits) : 0

  return {
    disclaimer: AI_DISCLAIMER,
    mode,
    suggestionMode: mode,
    degradedMode: mode,
    llmUsed,
    model,
    creditProgressSummary: {
      currentSelectedCredits: context.enrolled.totalCredits,
      completedCredits: progress.completedCredits,
      inProgressCredits: progress.inProgressCredits,
      projectedCredits: progress.projectedCredits,
      targetCredits,
      maxCredits: context.period.maxCredits ?? 0,
      remainingToTarget,
    },
    recommendations: uniqueItems,
    conflictNotes,
    plans,
    recommendationSummary,
    fallbackInfo,
    scoreBreakdown: {
      totalCandidates: recommendations.length + blocked.length,
      safeCandidates: recommendations.length,
      blockedCandidates: blocked.length,
    },
    progressAudit: blackboard.progressAudit,
    scheduleLoad: blackboard.scheduleLoad,
    capacityRisks: blackboard.capacityRisks,
    requestId: blackboard.requestMeta.requestId,
    debugInfo,
  }
}

const buildExplainFallback = (
  offeringId: string,
  offering: CandidateSnapshot,
  context: AdvisorContext
): AiExplainResult => {
  const reasons = offering.reasons.length > 0 ? offering.reasons : ['课程通过硬规则校验']
  const isSelectableNow = offering.reasons.length === 0

  const remainingToCredit = context.period.maxCredits === null
    ? '未配置本阶段学分上限'
    : `阶段上限剩余 ${context.period.maxCredits - context.enrolled.totalCredits} 学分`

  return {
    courseOfferingId: offeringId,
    courseName: offering.courseName,
    explanation:
      `${offering.courseCode} ${offering.courseName} 当前 ${isSelectableNow ? '可选' : '不可选'}。` +
      `${isSelectableNow ? '当前可选' : '当前不可选'}。` +
      `原因：${reasons.join('；')}。` +
      `当前已选学分 ${context.enrolled.totalCredits}，${remainingToCredit}。` +
      `该课程剩余名额 ${offering.remainingCapacity}。`,
    hardRuleResult: {
      isSelectableNow,
      reasons,
    },
    disclaimer: BASE_EXPLAIN_DISCLAIMER,
    explanationSummary: getFallbackSummary(),
    degradedMode: 'rule_only',
    llmUsed: false,
    model: null,
    fallbackInfo: {
      code: 'policy_validation_failed',
      reason: '硬规则解释回退',
      source: 'rule',
      retriable: true,
    },
  }
}

const withLlmExplain = async (
  question: string,
  offering: CandidateSnapshot,
  context: AdvisorContext,
  requestMeta: { requestId: string; studentId: string }
): Promise<AiExplainResult> => {
  const base = buildExplainFallback(offering.courseOfferingId, offering, context)

  const result = await llmClient.complete(
    {
      role: 'user',
      content: buildSingleExplainPrompt({
        course: {
          id: offering.courseOfferingId,
          code: offering.courseCode,
          name: offering.courseName,
          credits: offering.credits,
          teacherName: offering.teacherName,
          remainingCapacity: offering.remainingCapacity,
        },
        hardRuleResult: {
          isSelectableNow: offering.reasons.length === 0,
          reasons: offering.reasons.length > 0 ? offering.reasons : ['课程通过硬规则校验'],
        },
        currentCredits: context.enrolled.totalCredits,
        maxCredits: context.period.maxCredits,
        question,
      }),
    },
    {
      maxTokens: resolveExplanationMaxTokens(),
      temperature: 0.2,
      timeoutMs: resolveLlmTimeoutMs(),
    }
  )

  if (!result.ok) {
    const fallbackInfo = buildLlmFallbackInfo({
      stage: 'explanation',
      reason: result.reason ?? 'llm_explain_failed',
      mode: 'rule_only',
      result,
      missingComponents: ['llm_explanation'],
    })
    logAiFallback({
      requestId: requestMeta.requestId,
      studentId: requestMeta.studentId,
      semesterId: context.semester.id,
      endpoint: 'explain',
      fallbackInfo,
    })
    return {
      ...base,
      fallbackInfo,
      model: result.model ?? null,
      debugInfo: buildDebugInfo(requestMeta.requestId, 'explain', [
        toDebugStage('explanation', result, 'failed', fallbackInfo.reason),
      ]),
    }
  }

  const parsed = parseExplainFromLlm(result)
  if (!parsed || !parsed.explanation || parsed.explanation.length < 8) {
    const fallbackInfo = buildLlmFallbackInfo({
      stage: 'explanation',
      reason: 'llm_explain_invalid_format',
      mode: 'rule_only',
      result,
      missingComponents: ['llm_explanation'],
    })
    logAiFallback({
      requestId: requestMeta.requestId,
      studentId: requestMeta.studentId,
      semesterId: context.semester.id,
      endpoint: 'explain',
      fallbackInfo,
    })
    return {
      ...base,
      fallbackInfo,
      model: result.model ?? null,
      debugInfo: buildDebugInfo(requestMeta.requestId, 'explain', [
        toDebugStage('explanation', result, 'failed', fallbackInfo.reason),
      ]),
    }
  }

  const explanation = parseText(parsed.explanation)
  if (!explanation || containsForbiddenPhrase(explanation)) {
    const fallbackInfo = buildLlmFallbackInfo({
      stage: 'explanation',
      reason: 'llm_explain_contains_forbidden_phrase',
      mode: 'rule_only',
      result,
      missingComponents: ['llm_explanation'],
      retriable: false,
    })
    logAiFallback({
      requestId: requestMeta.requestId,
      studentId: requestMeta.studentId,
      semesterId: context.semester.id,
      endpoint: 'explain',
      fallbackInfo,
    })
    return {
      ...base,
      fallbackInfo,
      model: result.model ?? null,
      debugInfo: buildDebugInfo(requestMeta.requestId, 'explain', [
        toDebugStage('explanation', result, 'failed', fallbackInfo.reason),
      ]),
    }
  }

  return {
    ...base,
    explanation,
    disclaimer: parsed.disclaimer || base.disclaimer,
    explanationSummary: explanation,
    degradedMode: 'full',
    llmUsed: true,
    model: result.model ?? null,
    fallbackInfo: undefined,
    debugInfo: buildDebugInfo(requestMeta.requestId, 'explain', [
      toDebugStage('explanation', result, 'success', 'llm_explanation_accepted'),
    ]),
  }
}

const toExplainCandidate = (offeringId: string, context: AdvisorContext): CandidateSnapshot | undefined => {
  const all = evaluateCandidates(context).all
  const found = all.find((item) => item.candidate.courseOfferingId === offeringId)

  return found ? found.candidate : undefined
}

const toPrismaSavedRecordType = (value: AiAdvisorSavedRecordTypeValue): AiAdvisorSavedRecordType =>
  value === 'recommendation'
    ? AiAdvisorSavedRecordType.RECOMMENDATION
    : AiAdvisorSavedRecordType.EXPLANATION

const toSavedRecordTypeValue = (value: AiAdvisorSavedRecordType): AiAdvisorSavedRecordTypeValue =>
  value === AiAdvisorSavedRecordType.RECOMMENDATION ? 'recommendation' : 'explanation'

const toJsonInput = (
  value: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined =>
  value === undefined ? undefined : value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue

const buildSavedRecordTitle = (body: SaveAiAdvisorRecordBody): string => {
  const explicit = body.title?.trim()
  if (explicit) {
    return explicit.slice(0, 120)
  }

  if (body.recordType === 'explanation') {
    const courseName = typeof body.resultPayload.courseName === 'string'
      ? body.resultPayload.courseName
      : '课程解释'
    return `课程解释：${courseName}`.slice(0, 120)
  }

  const summary = typeof body.resultPayload.recommendationSummary === 'string'
    ? body.resultPayload.recommendationSummary
    : ''
  return (summary || 'AI 推荐建议').slice(0, 120)
}

const mapSavedRecord = (record: {
  id: string
  studentId: string
  semesterId: string | null
  courseOfferingId: string | null
  recordType: AiAdvisorSavedRecordType
  title: string
  question: string | null
  requestPayload: Prisma.JsonValue | null
  resultPayload: Prisma.JsonValue
  createdAt: Date
  updatedAt: Date
}): AiAdvisorSavedRecordItem => ({
  id: record.id,
  studentId: record.studentId,
  semesterId: record.semesterId,
  courseOfferingId: record.courseOfferingId,
  recordType: toSavedRecordTypeValue(record.recordType),
  title: record.title,
  question: record.question,
  requestPayload: record.requestPayload as Record<string, unknown> | null,
  resultPayload: record.resultPayload as Record<string, unknown>,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
})

const assertStudentExists = async (studentId: string) => {
  const student = await prisma.student.findUnique({
    where: { userId: studentId },
    select: { userId: true },
  })

  if (!student) {
    throw new AppError(COURSE_SELECTION_ERROR_CODES.NOT_FOUND, 404, '无法识别当前学生身份')
  }
}

const resolveSavedRecordReferences = async (body: SaveAiAdvisorRecordBody) => {
  let semesterId = body.semesterId

  if (body.courseOfferingId) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: body.courseOfferingId },
      select: { id: true, semesterId: true },
    })

    if (!offering) {
      throw new AppError(COURSE_SELECTION_ERROR_CODES.OFFERING_NOT_FOUND, 404, '课程开设不存在')
    }

    if (semesterId && semesterId !== offering.semesterId) {
      throw new AppError(
        COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED,
        400,
        'semester_id 与 course_offering_id 所属学期不一致'
      )
    }

    semesterId = offering.semesterId
  }

  if (semesterId) {
    const semester = await prisma.semester.findUnique({
      where: { id: semesterId },
      select: { id: true },
    })

    if (!semester) {
      throw new AppError(COURSE_SELECTION_ERROR_CODES.NOT_FOUND, 404, '学期不存在')
    }
  }

  return { semesterId }
}

export const aiAdvisorService = {
  async recommend(studentId: string, body: AiRecommendBody): Promise<AiAdvicePayload> {
    const requestId = randomUUID()
    const recommendationLimit = Math.min(
      Math.max(body.maxRecommendations, 1),
      MAX_RECOMMENDATION_LIMIT
    )

    const context = await buildContext(studentId, body.semesterId)

    const parsedPreference = parsePreferenceFromRequest(body.preferences)
    const preferenceResult = await withLlmPreference(parsedPreference)
    const preference = preferenceResult.preference

    const candidatePools = evaluateCandidates(context)
    const { safe, blocked } = candidatePools
    const blackboard = buildBlackboard({
      requestId,
      studentId,
      body,
      recommendationLimit,
      context,
      candidatePools,
      rawPreference: parsedPreference,
      preference,
    })
    if (preferenceResult.fallbackInfo) {
      logAiFallback({
        requestId: blackboard.requestMeta.requestId,
        studentId,
        semesterId: context.semester.id,
        endpoint: 'recommend',
        fallbackInfo: preferenceResult.fallbackInfo,
      })
    }

    const safeSorted = sortByPreference(safe, preference)

    if (safeSorted.length === 0) {
      blackboard.fallbackInfo = {
        code: 'policy_validation_failed',
        reason: '当前无满足硬性规则课程',
        source: 'rule',
        retriable: false,
        mode: 'template_only',
        stage: 'rule',
        missingComponents: [],
        llmUsed: false,
        model: null,
      }
      logAiFallback({
        requestId: blackboard.requestMeta.requestId,
        studentId,
        semesterId: context.semester.id,
        endpoint: 'recommend',
        fallbackInfo: blackboard.fallbackInfo,
      })
      return buildAdvicePayload(
        blackboard,
        [],
        blocked,
        'template_only',
        recommendationLimit,
        [],
        '当前无满足硬性规则的候选课程，返回规则说明。',
        false,
        null,
        blackboard.fallbackInfo,
        buildDebugInfo(requestId, 'recommend', [
          preferenceResult.debugStage,
          ruleDebugStage('no_safe_candidates'),
        ])
      )
    }

    const limitedRecommendations = safeSorted.slice(0, Math.max(recommendationLimit, FALLBACK_PLAN_LIMIT))

    const llmResult = await withLlmPlans(context, preference, limitedRecommendations, recommendationLimit)

    const useLlm = llmResult.plans.length > 0 && !llmResult.fallbackReason
    const recommendationSummary = useLlm
      ? llmResult.recommendationSummary || getFallbackSummary()
      : getFallbackSummary()

    const plans = useLlm
      ? llmResult.plans
      : buildFallbackPlans(
          limitedRecommendations.map((item) => item.candidate),
          recommendationLimit
        )

    const fallbackInfo: AiFallbackInfo | undefined = useLlm
      ? undefined
      : llmResult.fallbackInfo ??
        buildLlmFallbackInfo({
          stage: 'recommendation',
          reason: llmResult.fallbackReason ?? 'llm_strategy_failed',
          mode: 'rule_only',
          model: llmResult.model,
          missingComponents: ['llm_strategy'],
        })

    const mode: AiAdvisorMode = useLlm ? 'full' : 'rule_only'
    blackboard.validationReport = {
      valid: useLlm || !llmResult.fallbackReason,
      invalidCourseOfferingIds: [],
      warnings: llmResult.fallbackReason ? [llmResult.fallbackReason] : [],
      action: llmResult.fallbackReason ? 'fallback_template' : 'accept',
    }
    blackboard.fallbackInfo = fallbackInfo
    if (fallbackInfo) {
      logAiFallback({
        requestId: blackboard.requestMeta.requestId,
        studentId,
        semesterId: context.semester.id,
        endpoint: 'recommend',
        fallbackInfo,
      })
    }

    return buildAdvicePayload(
      blackboard,
      safeSorted,
      blocked,
      mode,
      recommendationLimit,
      plans,
      recommendationSummary,
      useLlm,
      llmResult.model,
      fallbackInfo,
      buildDebugInfo(requestId, 'recommend', [
        preferenceResult.debugStage,
        llmResult.debugStage,
      ])
    )
  },

  async explain(studentId: string, offeringId: string, question?: string): Promise<AiExplainResult> {
    const requestId = randomUUID()
    const normalizedQuestion = parseText(question) || '课程当前是否可选、是否有风险？'

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      select: { semesterId: true },
    })

    if (!offering) {
      throw new AppError(COURSE_SELECTION_ERROR_CODES.OFFERING_NOT_FOUND, 404, '课程开设不存在')
    }

    const context = await buildContext(studentId, offering.semesterId)
    const candidate = toExplainCandidate(offeringId, context)

    if (!candidate) {
      throw new AppError(
        COURSE_SELECTION_ERROR_CODES.NOT_FOUND,
        404,
        '课程未纳入当前学期可推荐范围'
      )
    }

    return withLlmExplain(normalizedQuestion, candidate, context, { requestId, studentId })
  },

  async saveRecord(studentId: string, body: SaveAiAdvisorRecordBody): Promise<AiAdvisorSavedRecordItem> {
    await assertStudentExists(studentId)
    const { semesterId } = await resolveSavedRecordReferences(body)

    const record = await prisma.aiAdvisorSavedRecommendation.create({
      data: {
        studentId,
        semesterId,
        courseOfferingId: body.courseOfferingId,
        recordType: toPrismaSavedRecordType(body.recordType),
        title: buildSavedRecordTitle(body),
        question: body.question?.trim() || null,
        requestPayload: toJsonInput(body.requestPayload),
        resultPayload: body.resultPayload as Prisma.InputJsonValue,
      },
    })

    return mapSavedRecord(record)
  },

  async listSavedRecords(
    studentId: string,
    query: AiAdvisorSavedRecordQuery
  ): Promise<AiAdvisorSavedRecordListPayload> {
    await assertStudentExists(studentId)
    const page = query.page ?? 1
    const pageSize = Math.min(query.pageSize, 100)
    const where: Prisma.AiAdvisorSavedRecommendationWhereInput = {
      studentId,
      recordType: query.recordType ? toPrismaSavedRecordType(query.recordType) : undefined,
      semesterId: query.semesterId,
    }

    const [items, total] = await Promise.all([
      prisma.aiAdvisorSavedRecommendation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.aiAdvisorSavedRecommendation.count({ where }),
    ])

    return {
      items: items.map(mapSavedRecord),
      pagination: buildPaginationMeta(page, pageSize, total),
    }
  },

  async getSavedRecord(studentId: string, id: string): Promise<AiAdvisorSavedRecordItem> {
    await assertStudentExists(studentId)
    const record = await prisma.aiAdvisorSavedRecommendation.findFirst({
      where: { id, studentId },
    })

    if (!record) {
      throw new AppError(COURSE_SELECTION_ERROR_CODES.NOT_FOUND, 404, '保存的 AI 建议不存在')
    }

    return mapSavedRecord(record)
  },

  async deleteSavedRecord(studentId: string, id: string): Promise<{ id: string; deleted: true }> {
    await assertStudentExists(studentId)
    const result = await prisma.aiAdvisorSavedRecommendation.deleteMany({
      where: { id, studentId },
    })

    if (result.count === 0) {
      throw new AppError(COURSE_SELECTION_ERROR_CODES.NOT_FOUND, 404, '保存的 AI 建议不存在')
    }

    return { id, deleted: true }
  },
}
