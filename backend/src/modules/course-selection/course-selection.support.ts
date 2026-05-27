/**
 * C4/C5 共享逻辑：分页、学期解析、课表冲突、教务权限、选课阶段校验与 SystemLog。
 * 供 enrollment-results / timetable / roster / selection-period 等模块复用。
 */
import type { Prisma } from '@prisma/client'
import {
  AdminType,
  EnrollmentStatus,
  OfferingStatus,
  SelectionPhase,
  SemesterStatus,
  type Schedule,
} from '@prisma/client'
import { AppError, ForbiddenError, NotFoundError } from '@stss/shared'
import prisma from '../../shared/prisma/client.js'
import {
  COURSE_SELECTION_ERROR_CODES,
  type EnrollmentStatusValue,
  type PaginationMeta,
  type SelectionPeriodItem,
  type SelectionPhaseValue,
  toEnrollmentStatusValue,
  toSelectionPhaseValue,
} from './course-selection.types.js'

export const SELECTION_PERIOD_LOG_ACTION = {
  create: 'selection_period:create',
  update: 'selection_period:update',
  manualEnroll: 'enrollment:manual_create',
} as const

export const decimalToNumber = (value: Prisma.Decimal | number | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0
  }
  return typeof value === 'number' ? value : Number(value)
}

export const buildPaginationMeta = (page: number, pageSize: number, total: number): PaginationMeta => ({
  page,
  pageSize,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
})

export const parseEnrollmentStatusFilter = (status?: string): EnrollmentStatus | undefined => {
  if (!status) {
    return undefined
  }

  const normalized = status.toUpperCase()
  if (!Object.values(EnrollmentStatus).includes(normalized as EnrollmentStatus)) {
    throw new AppError(COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED, 400, 'status 参数无效', {
      code: COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED,
      field: 'status',
      message: 'status 应为 enrolled、dropped 或 withdrawn',
    })
  }

  return normalized as EnrollmentStatus
}

export const parseSelectionPhaseFilter = (phase?: string): SelectionPhase | undefined => {
  if (!phase) {
    return undefined
  }

  const map: Record<string, SelectionPhase> = {
    first_round: SelectionPhase.FIRST_ROUND,
    second_round: SelectionPhase.SECOND_ROUND,
    adjustment: SelectionPhase.ADJUSTMENT,
  }

  const prismaPhase = map[phase]
  if (!prismaPhase) {
    throw new AppError(COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED, 400, 'phase 参数无效', {
      code: COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED,
      field: 'phase',
      message: 'phase 应为 first_round、second_round 或 adjustment',
    })
  }

  return prismaPhase
}

export const phaseToPrisma = (phase: string): SelectionPhase => {
  const parsed = parseSelectionPhaseFilter(phase)
  if (!parsed) {
    throw new AppError(COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED, 400, 'phase 参数无效')
  }
  return parsed
}

export const computeSelectionPeriodServerStatus = (
  startTime: Date,
  endTime: Date,
  now: Date = new Date()
): SelectionPeriodItem['serverStatus'] => {
  if (now < startTime) {
    return 'not_started'
  }
  if (now > endTime) {
    return 'ended'
  }
  return 'open'
}

export const mapSelectionPeriodItem = (period: {
  id: string
  phase: SelectionPhase
  startTime: Date
  endTime: Date
  maxCredits: Prisma.Decimal | null
  isActive: boolean
  semester: { id: string; name: string }
}): SelectionPeriodItem => ({
  id: period.id,
  semester: period.semester,
  phase: toSelectionPhaseValue(period.phase),
  startTime: period.startTime.toISOString(),
  endTime: period.endTime.toISOString(),
  maxCredits: period.maxCredits === null ? undefined : decimalToNumber(period.maxCredits),
  isActive: period.isActive,
  serverStatus: computeSelectionPeriodServerStatus(period.startTime, period.endTime),
})

/** C5：路由可进 admin，但业务层必须校验 Admin.adminType = ACADEMIC。 */
export async function assertAcademicAdmin(operatorUserId: string): Promise<void> {
  const admin = await prisma.admin.findUnique({
    where: { userId: operatorUserId },
    select: { adminType: true },
  })

  if (!admin) {
    throw new ForbiddenError('仅教务管理人员可执行该操作')
  }

  if (admin.adminType !== AdminType.ACADEMIC) {
    throw new ForbiddenError('仅教务管理人员可执行该操作')
  }
}

export async function writeCourseSelectionSystemLog(params: {
  userId: string
  action: string
  resourceType: string
  resourceId?: string
  details?: Prisma.InputJsonValue
}): Promise<void> {
  await prisma.systemLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      details: params.details,
    },
  })
}

/** 未传 semesterId 时优先 CURRENT 学期，否则取最近学期。 */
export async function resolveSemesterId(semesterId?: string): Promise<{ id: string; name: string }> {
  if (semesterId) {
    const semester = await prisma.semester.findUnique({
      where: { id: semesterId },
      select: { id: true, name: true },
    })
    if (!semester) {
      throw new NotFoundError('学期', semesterId)
    }
    return semester
  }

  const current = await prisma.semester.findFirst({
    where: { status: SemesterStatus.CURRENT },
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true },
  })
  if (current) {
    return current
  }

  const latest = await prisma.semester.findFirst({
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true },
  })
  if (!latest) {
    throw new NotFoundError('学期')
  }
  return latest
}

export function schedulesConflict(a: Schedule, b: Schedule): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) {
    return false
  }

  const weeksOverlap = a.startWeek <= b.endWeek && b.startWeek <= a.endWeek
  const periodsOverlap = a.startPeriod <= b.endPeriod && b.startPeriod <= a.endPeriod
  return weeksOverlap && periodsOverlap
}

export async function assertNoScheduleConflict(
  studentId: string,
  targetOfferingId: string,
  excludeOfferingId?: string
): Promise<void> {
  const targetSchedules = await prisma.schedule.findMany({
    where: { courseOfferingId: targetOfferingId },
  })

  if (targetSchedules.length === 0) {
    return
  }

  const enrolledOfferings = await prisma.enrollment.findMany({
    where: {
      studentId,
      status: EnrollmentStatus.ENROLLED,
      courseOfferingId: excludeOfferingId ? { not: excludeOfferingId } : undefined,
    },
    select: {
      courseOffering: {
        select: {
          id: true,
          course: { select: { name: true } },
          schedules: true,
        },
      },
    },
  })

  for (const enrollment of enrolledOfferings) {
    for (const existingSchedule of enrollment.courseOffering.schedules) {
      for (const targetSchedule of targetSchedules) {
        if (schedulesConflict(existingSchedule, targetSchedule)) {
          throw new AppError(
            COURSE_SELECTION_ERROR_CODES.SCHEDULE_CONFLICT,
            422,
            '手动加课失败：存在课表冲突',
            {
              code: COURSE_SELECTION_ERROR_CODES.SCHEDULE_CONFLICT,
              field: 'course_offering_id',
              message: `与已选课程 ${enrollment.courseOffering.course.name} 时间冲突`,
            }
          )
        }
      }
    }
  }
}

export async function resolveMaxCreditsForSemester(semesterId: string): Promise<number | null> {
  const now = new Date()
  const periods = await prisma.selectionPeriod.findMany({
    where: { semesterId, isActive: true },
    orderBy: { startTime: 'desc' },
  })

  const openPeriod = periods.find(
    (period) => now >= period.startTime && now <= period.endTime && period.maxCredits !== null
  )
  if (openPeriod?.maxCredits) {
    return decimalToNumber(openPeriod.maxCredits)
  }

  const withCredits = periods.find((period) => period.maxCredits !== null)
  return withCredits ? decimalToNumber(withCredits.maxCredits) : null
}

export async function assertWithinMaxCredits(
  studentId: string,
  semesterId: string,
  additionalCredits: number,
  excludeOfferingId?: string
): Promise<void> {
  const maxCredits = await resolveMaxCreditsForSemester(semesterId)
  if (maxCredits === null) {
    return
  }

  const enrolled = await prisma.enrollment.findMany({
    where: {
      studentId,
      status: EnrollmentStatus.ENROLLED,
      courseOffering: { semesterId },
      courseOfferingId: excludeOfferingId ? { not: excludeOfferingId } : undefined,
    },
    include: {
      courseOffering: {
        include: { course: { select: { credits: true } } },
      },
    },
  })

  const currentCredits = enrolled.reduce(
    (sum, item) => sum + decimalToNumber(item.courseOffering.course.credits),
    0
  )

  if (currentCredits + additionalCredits > maxCredits) {
    throw new AppError(
      COURSE_SELECTION_ERROR_CODES.MAX_CREDITS_EXCEEDED,
      422,
      '手动加课失败：超过当前阶段最大学分',
      {
        code: COURSE_SELECTION_ERROR_CODES.MAX_CREDITS_EXCEEDED,
        field: 'course_offering_id',
        message: `当前已选 ${currentCredits} 学分，加上本课程后将超过上限 ${maxCredits} 学分`,
      }
    )
  }
}

export async function assertActivePeriodsDoNotOverlap(params: {
  semesterId: string
  phase: SelectionPhaseValue | string
  startTime: Date
  endTime: Date
  isActive: boolean
  excludePeriodId?: string
}): Promise<void> {
  if (!params.isActive) {
    return
  }

  const prismaPhase = phaseToPrisma(typeof params.phase === 'string' ? params.phase : params.phase)

  const existing = await prisma.selectionPeriod.findMany({
    where: {
      semesterId: params.semesterId,
      phase: prismaPhase,
      isActive: true,
      id: params.excludePeriodId ? { not: params.excludePeriodId } : undefined,
    },
  })

  const overlaps = existing.some(
    (period) => params.startTime < period.endTime && params.endTime > period.startTime
  )

  if (overlaps) {
    throw new AppError(
      COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED,
      422,
      '同一学期同一阶段已存在启用且时间重叠的选课时间段',
      {
        code: COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED,
        field: 'start_time',
        message: '请调整开始/结束时间，或先停用冲突阶段',
      }
    )
  }
}

export const mapEnrollmentStatus = (status: EnrollmentStatus): EnrollmentStatusValue =>
  toEnrollmentStatusValue(status)

export const formatClassroomLabel = (schedule: {
  classroom?: { campus: string | null; building: string; roomNumber: string } | null
}): string | null => {
  if (!schedule.classroom) {
    return null
  }
  const parts = [schedule.classroom.campus, schedule.classroom.building, schedule.classroom.roomNumber].filter(
    Boolean
  )
  return parts.length > 0 ? parts.join(' ') : null
}

export async function loadCourseOfferingForManualEnroll(courseOfferingId: string) {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: {
      course: { select: { id: true, name: true, credits: true, status: true } },
      semester: { select: { id: true, name: true } },
    },
  })

  if (!offering) {
    throw new NotFoundError('课程开设', courseOfferingId)
  }

  if (offering.status === OfferingStatus.CANCELLED) {
    throw new AppError(COURSE_SELECTION_ERROR_CODES.OFFERING_CLOSED, 422, '手动加课失败：课程已取消', {
      code: COURSE_SELECTION_ERROR_CODES.OFFERING_CLOSED,
      field: 'course_offering_id',
      message: '目标课程开设已取消',
    })
  }

  return offering
}
