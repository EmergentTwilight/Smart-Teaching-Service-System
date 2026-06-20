import { AppError } from '@stss/shared'
import {
  COURSE_SELECTION_ERROR_CODES,
  type AiAdvisorMode,
  type AiAdvicePayload,
  type AiExplainResult,
  type AiFallbackInfo,
  type AiRecommendationItem,
  type AiRecommendationPlan,
} from './course-selection.types.js'
import { CourseStatus, CourseType, EnrollmentStatus, OfferingStatus } from '@prisma/client'
import prisma from '../../shared/prisma/client.js'
import {
  resolveMaxCreditsForSemester,
  resolveSemesterId,
  schedulesConflict,
} from './course-selection.support.js'
import { llmClient } from './ai-advisor.llm-client.js'
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

const toCourseTypeValue = (value: CourseType): 'required' | 'elective' | 'general' => {
  if (value === CourseType.REQUIRED) {
    return 'required'
  }

  if (value === CourseType.ELECTIVE) {
    return 'elective'
  }

  return 'general'
}

const toNum = (value: number | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0
  }

  return Number(value)
}

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

const parsePositiveNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null
  }

  return Math.floor(value)
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
  mandatoryCourses: Set<string>
}

interface EnrolledCourse {
  courseId: string
  offeringId: string
  credits: number
  courseType: 'required' | 'elective' | 'general'
  schedules: {
    dayOfWeek: number
    startWeek: number
    endWeek: number
    startPeriod: number
    endPeriod: number
  }[]
}

interface OfferingSnapshot {
  offeringId: string
  courseId: string
  code: string
  name: string
  credits: number
  courseType: 'required' | 'elective' | 'general'
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
  offerings: OfferingSnapshot[]
}

interface CandidateSnapshot {
  courseOfferingId: string
  courseCode: string
  courseName: string
  credits: number
  teacherName: string
  courseType: 'required' | 'elective' | 'general'

  isEnrolled: boolean
  isFull: boolean
  hasTimeConflict: boolean
  prerequisiteSatisfied: boolean
  withinCurriculum: boolean
  withinSelectionPeriod: boolean
  underMaxCredits: boolean

  risks: string[]
  reasons: string[]
  recommendationScore: number
  remainingCapacity: number
}

interface CandidateContext {
  candidate: CandidateSnapshot
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
    offerings,
  }
}

const evaluateCandidates = (context: AdvisorContext) => {
  const enrolledSchedules = context.enrolled.items.flatMap((item) => item.schedules)

  const candidates = context.offerings.map<CandidateContext>((offering) => {
    const isEnrolled = context.enrolled.byOfferingId.has(offering.offeringId)
    const isFull = offering.remainingCapacity <= 0
    const hasTimeConflict = offering.schedules.some((offeringSchedule) =>
      enrolledSchedules.some((enrolledSchedule) => schedulesConflict(offeringSchedule, enrolledSchedule))
    )

    const prerequisiteSatisfied = offering.prerequisites.every((id) => context.enrolled.byCourseId.has(id))
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

    const requiredGap =
      context.curriculum.requiredCredits === null
        ? 0
        : Math.max(0, context.curriculum.requiredCredits - context.enrolled.byCourseType.required)

    const electiveGap =
      context.curriculum.electiveCredits === null
        ? 0
        : Math.max(0, context.curriculum.electiveCredits - context.enrolled.byCourseType.elective)

    if (withinCurriculum && offering.courseType === 'required' && requiredGap > 0) {
      risks.push('可帮助补齐必修课程缺口')
    }

    if (withinCurriculum && offering.courseType === 'elective' && electiveGap > 0) {
      risks.push('可帮助补齐选修课程缺口')
    }

    let score = 0.3
    if (withinCurriculum) {
      score += 0.24
    }
    if (offering.courseType === 'required') {
      score += 0.08
    }
    if (offering.remainingCapacity > 3) {
      score += 0.04
    }
    if (risks.length === 0) {
      score += 0.08
    }
    if (offering.courseType === 'elective' && context.curriculum.electiveCredits !== null) {
      score += 0.05
    }
    if (!underMaxCredits) {
      score -= 0.4
    }

    const safe = reasons.length === 0
    const recommendationScore = Math.max(0, Math.min(1, Number(score.toFixed(4))))

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
        recommendationScore: safe ? recommendationScore : 0,
        remainingCapacity: offering.remainingCapacity,
      },
    }
  })

  const safe = candidates.filter(({ candidate }) => candidate.reasons.length === 0)
  const blocked = candidates.filter(({ candidate }) => candidate.reasons.length > 0)
  const risky = safe.filter(({ candidate }) => candidate.risks.length > 0)

  return { all: candidates, safe, risky, blocked }
}

const buildPreferenceDefaults = (): PreferenceProfileInput => ({
  targetCredits: undefined,
  preferredCourseTypes: ['required', 'elective', 'general'],
  avoidEarlyMorning: false,
  preferLowLoad: false,
  preferRequiredCourses: true,
  preferGraduationProgress: true,
  riskTolerance: 'low',
  naturalLanguagePreference: undefined,
})

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
): Promise<PreferenceProfileInput> => {
  if (!preference.naturalLanguagePreference) {
    return preference
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
      maxTokens: 900,
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 8000),
      temperature: 0.1,
    }
  )

  if (!llmResult.ok) {
    return preference
  }

  const parsed = parseLlmPreference(llmResult.content)
  if (!parsed) {
    return preference
  }

  return {
    ...preference,
    targetCredits: parsePositiveNumber(parsed.targetCredits) ?? preference.targetCredits,
    preferredCourseTypes:
      normalizeCourseTypes(parsed.preferredCourseTypes).length > 0
        ? normalizeCourseTypes(parsed.preferredCourseTypes)
        : preference.preferredCourseTypes,
    avoidEarlyMorning:
      typeof parsed.avoidEarlyMorning === 'boolean' ? parsed.avoidEarlyMorning : preference.avoidEarlyMorning,
    preferLowLoad: typeof parsed.preferLowLoad === 'boolean' ? parsed.preferLowLoad : preference.preferLowLoad,
    preferRequiredCourses:
      typeof parsed.preferRequiredCourses === 'boolean'
        ? parsed.preferRequiredCourses
        : preference.preferRequiredCourses,
    preferGraduationProgress:
      typeof parsed.preferGraduationProgress === 'boolean'
        ? parsed.preferGraduationProgress
        : preference.preferGraduationProgress,
    riskTolerance: parseRiskTolerance(parsed.riskTolerance),
  }
}

const buildRecommendationItem = (candidate: CandidateSnapshot): AiRecommendationItem => {
  const reasons = candidate.reasons.length > 0
    ? [...candidate.reasons]
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
    },
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

  return {
    id: planId,
    title,
    rationale,
    recommendations: uniqueRecs,
    projectedCredits,
    totalCredits: projectedCredits,
    riskLevel,
  }
}

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

  return [balanced, requiredFirst, lowRisk].filter(Boolean) as AiRecommendationPlan[]
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
      plan.riskLevel !== 'high' &&
      plan.riskLevel !== 'unknown'
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
): { plans: AiRecommendationPlan[]; recommendationSummary?: string; model: string | null; fallbackReason?: string } => {
  if (candidates.length === 0) {
    return {
      plans: [],
      model: null,
      fallbackReason: 'no_safe_candidates',
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
      maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 1500),
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 8000),
      temperature: 0.25,
    }
  )

  if (!result.ok) {
    return {
      plans: [],
      model: result.model ?? null,
      fallbackReason: result.reason,
    }
  }

  const parsed = parsePlansFromLlm(result)
  if (!parsed?.plans || parsed.plans.length === 0) {
    return {
      plans: [],
      model: result.model ?? null,
      recommendationSummary: getFallbackSummary(),
      fallbackReason: 'llm_invalid_format',
    }
  }

  const allowedIds = new Set(candidates.map(({ candidate }) => candidate.courseOfferingId))
  const parsedIds = parseLlmPlanIds(parsed.plans, allowedIds)

  if (!parsedIds.valid) {
    return {
      plans: [],
      model: result.model ?? null,
      recommendationSummary: parsed.recommendationSummary,
      fallbackReason: 'llm_validation_failed',
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
  ].filter((plan) => plan)

  if (plans.length === 0) {
    return {
      plans: [],
      model: result.model ?? null,
      recommendationSummary: parsed.recommendationSummary,
      fallbackReason: 'llm_validation_failed',
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
    return {
      plans: [],
      model: result.model ?? null,
      recommendationSummary: getFallbackSummary(),
      fallbackReason: 'llm_contains_forbidden_phrase',
    }
  }

  return {
    plans,
    model: result.model ?? null,
    recommendationSummary: parsed.recommendationSummary ?? getFallbackSummary(),
  }
}

const buildAdvicePayload = (
  context: AdvisorContext,
  recommendations: CandidateContext[],
  blocked: CandidateContext[],
  mode: AiAdvisorMode,
  recommendationLimit: number,
  plans: AiRecommendationPlan[],
  recommendationSummary: string,
  llmUsed: boolean,
  model: string | null,
  fallbackInfo?: AiFallbackInfo
): AiAdvicePayload => {
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
  const remainingToTarget =
    targetCredits > 0 ? Math.max(0, targetCredits - context.enrolled.totalCredits) : 0

  return {
    disclaimer: AI_DISCLAIMER,
    mode,
    suggestionMode: mode,
    degradedMode: mode,
    llmUsed,
    model,
    creditProgressSummary: {
      currentSelectedCredits: context.enrolled.totalCredits,
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
  context: AdvisorContext
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
      maxTokens: 800,
      temperature: 0.2,
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 8000),
    }
  )

  if (!result.ok) {
    return base
  }

  const parsed = parseExplainFromLlm(result)
  if (!parsed || !parsed.explanation || parsed.explanation.length < 8) {
    return base
  }

  const explanation = parseText(parsed.explanation)
  if (!explanation || containsForbiddenPhrase(explanation)) {
    return base
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
  }
}

const toExplainCandidate = (offeringId: string, context: AdvisorContext): CandidateSnapshot | undefined => {
  const all = evaluateCandidates(context).all
  const found = all.find((item) => item.candidate.courseOfferingId === offeringId)

  return found ? found.candidate : undefined
}

export const aiAdvisorService = {
  async recommend(studentId: string, body: AiRecommendBody): Promise<AiAdvicePayload> {
    const recommendationLimit = Math.min(
      Math.max(body.maxRecommendations, 1),
      MAX_RECOMMENDATION_LIMIT
    )

    const context = await buildContext(studentId, body.semesterId)

    const parsedPreference = parsePreferenceFromRequest(body.preferences)
    const preference = await withLlmPreference(parsedPreference)

    const { safe, blocked } = evaluateCandidates(context)

    const safeSorted = sortByPreference(safe, preference)

    if (safeSorted.length === 0) {
      return buildAdvicePayload(
        context,
        [],
        blocked,
        'template_only',
        recommendationLimit,
        [],
        '当前无满足硬性规则的候选课程，返回规则说明。',
        false,
        null,
        {
          code: 'policy_validation_failed',
          reason: '当前无满足硬性规则课程',
          source: 'rule',
          retriable: false,
        }
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
      ? llmResult.fallbackReason
        ? {
          code: 'policy_validation_failed',
          reason: llmResult.fallbackReason,
          source: 'llm',
          retriable: true,
        }
        : undefined
      : {
          code: 'policy_validation_failed',
          reason: 'LLM 生成失败，返回模板方案',
          source: 'llm',
          retriable: true,
        }

    const mode: AiAdvisorMode = useLlm ? 'full' : 'rule_only'

    return buildAdvicePayload(
      context,
      safeSorted,
      blocked,
      mode,
      recommendationLimit,
      plans,
      recommendationSummary,
      useLlm,
      llmResult.model,
      fallbackInfo
    )
  },

  async explain(studentId: string, offeringId: string, question?: string): Promise<AiExplainResult> {
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

    return withLlmExplain(normalizedQuestion, candidate, context)
  },
}
