/**
 * C5：SelectionPeriod 管理与手动加课事务（容量、冲突、学分、SystemLog）。
 * 手动加课与 C3 共用 Enrollment 表，但不实现学生自助选课流程。
 */
import { CourseStatus, EnrollmentStatus, OfferingStatus, UserStatus } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { AppError, NotFoundError } from '@stss/shared'
import prisma from '../../shared/prisma/client.js'
import type {
  CreateSelectionPeriodBody,
  ManualEnrollmentBody,
  ManualEnrollmentCourseOfferingOption,
  ManualEnrollmentLookupQuery,
  ManualEnrollmentResult,
  ManualEnrollmentStudentOption,
  PaginatedItems,
  SelectionPeriodItem,
  SelectionPeriodQuery,
  UpdateSelectionPeriodBody,
} from './course-selection.types.js'
import {
  COURSE_SELECTION_ERROR_CODES,
  toEnrollmentStatusValue,
  toOfferingStatusValue,
  toSelectionPhaseValue,
} from './course-selection.types.js'
import {
  SELECTION_PERIOD_LOG_ACTION,
  assertAcademicAdmin,
  assertActivePeriodsDoNotOverlap,
  assertNoScheduleConflict,
  assertWithinMaxCredits,
  buildPaginationMeta,
  decimalToNumber,
  loadCourseOfferingForManualEnroll,
  mapSelectionPeriodItem,
  parseSelectionPhaseFilter,
  phaseToPrisma,
} from './course-selection.support.js'

const includePeriodRelations = {
  semester: { select: { id: true, name: true } },
} as const

const formatScheduleSummary = (schedule: {
  dayOfWeek: number
  startWeek: number
  endWeek: number
  startPeriod: number
  endPeriod: number
  classroom?: {
    building?: string | null
    roomNumber?: string | null
    campus?: string | null
  } | null
}) => {
  const classroom = schedule.classroom
    ? ` ${[schedule.classroom.campus, schedule.classroom.building, schedule.classroom.roomNumber]
        .filter(Boolean)
        .join(' ')}`
    : ''

  return `周${schedule.dayOfWeek} 第${schedule.startPeriod}-${schedule.endPeriod}节 第${schedule.startWeek}-${schedule.endWeek}周${classroom}`
}

export const selectionPeriodService = {
  async listPeriods(query: SelectionPeriodQuery): Promise<PaginatedItems<SelectionPeriodItem>> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const where = {
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
      ...(query.phase ? { phase: parseSelectionPhaseFilter(query.phase) } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    }

    const [total, rows] = await Promise.all([
      prisma.selectionPeriod.count({ where }),
      prisma.selectionPeriod.findMany({
        where,
        include: includePeriodRelations,
        orderBy: [{ startTime: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      items: rows.map(mapSelectionPeriodItem),
      pagination: buildPaginationMeta(page, pageSize, total),
    }
  },

  async listManualEnrollmentStudents(
    operatorUserId: string,
    query: ManualEnrollmentLookupQuery
  ): Promise<PaginatedItems<ManualEnrollmentStudentOption>> {
    await assertAcademicAdmin(operatorUserId)

    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 10
    const keyword = query.keyword?.trim()
    const where: Prisma.StudentWhereInput = {
      user: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
      },
      ...(keyword
        ? {
            OR: [
              { studentNumber: { contains: keyword, mode: 'insensitive' } },
              { className: { contains: keyword, mode: 'insensitive' } },
              { user: { username: { contains: keyword, mode: 'insensitive' } } },
              { user: { realName: { contains: keyword, mode: 'insensitive' } } },
              { major: { name: { contains: keyword, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const [total, rows] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          user: { select: { username: true, realName: true } },
          major: { select: { name: true } },
        },
        orderBy: [{ studentNumber: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      items: rows.map((student) => ({
        studentId: student.userId,
        studentNumber: student.studentNumber,
        username: student.user.username,
        realName: student.user.realName,
        majorName: student.major?.name ?? null,
        grade: student.grade,
        className: student.className ?? null,
      })),
      pagination: buildPaginationMeta(page, pageSize, total),
    }
  },

  async listManualEnrollmentCourseOfferings(
    operatorUserId: string,
    query: ManualEnrollmentLookupQuery
  ): Promise<PaginatedItems<ManualEnrollmentCourseOfferingOption>> {
    await assertAcademicAdmin(operatorUserId)

    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 10
    const keyword = query.keyword?.trim()
    const where: Prisma.CourseOfferingWhereInput = {
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
      status: { in: [OfferingStatus.OPEN, OfferingStatus.PLANNED] },
      course: {
        status: CourseStatus.ACTIVE,
      },
      ...(keyword
        ? {
            OR: [
              { course: { code: { contains: keyword, mode: 'insensitive' } } },
              { course: { name: { contains: keyword, mode: 'insensitive' } } },
              { teacher: { teacherNumber: { contains: keyword, mode: 'insensitive' } } },
              { teacher: { user: { realName: { contains: keyword, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    }

    const rows = await prisma.courseOffering.findMany({
      where,
      include: {
        course: true,
        semester: true,
        teacher: {
          include: {
            user: true,
          },
        },
        schedules: {
          include: {
            classroom: true,
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
        },
      },
      orderBy: [{ semesterId: 'asc' }, { id: 'asc' }],
    })

    const availableRows = rows.filter((row) => row.enrolledCount < row.capacity)
    const total = availableRows.length
    const pagedRows = availableRows.slice((page - 1) * pageSize, page * pageSize)

    return {
      items: pagedRows.map((offering) => ({
        courseOfferingId: offering.id,
        courseCode: offering.course.code,
        courseName: offering.course.name,
        credits: decimalToNumber(offering.course.credits),
        semester: {
          id: offering.semester.id,
          name: offering.semester.name,
        },
        teacher: {
          id: offering.teacherId,
          realName: offering.teacher.user.realName,
          teacherNumber: offering.teacher.teacherNumber ?? null,
        },
        capacity: offering.capacity,
        enrolledCount: offering.enrolledCount,
        remainingCapacity: offering.capacity - offering.enrolledCount,
        status: toOfferingStatusValue(offering.status),
        scheduleSummary: offering.schedules.map(formatScheduleSummary),
      })),
      pagination: buildPaginationMeta(page, pageSize, total),
    }
  },

  async createPeriod(
    operatorUserId: string,
    body: CreateSelectionPeriodBody
  ): Promise<SelectionPeriodItem> {
    await assertAcademicAdmin(operatorUserId)

    const startTime = new Date(body.startTime)
    const endTime = new Date(body.endTime)
    if (startTime >= endTime) {
      throw new AppError(COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED, 400, '结束时间必须晚于开始时间')
    }

    const semester = await prisma.semester.findUnique({ where: { id: body.semesterId } })
    if (!semester) {
      throw new NotFoundError('学期', body.semesterId)
    }

    await assertActivePeriodsDoNotOverlap({
      semesterId: body.semesterId,
      phase: body.phase,
      startTime,
      endTime,
      isActive: body.isActive,
    })

    const period = await prisma.$transaction(async (tx) => {
      const created = await tx.selectionPeriod.create({
        data: {
          semesterId: body.semesterId,
          phase: phaseToPrisma(body.phase),
          startTime,
          endTime,
          maxCredits: body.maxCredits,
          allowDrop: body.allowDrop,
          isActive: body.isActive,
        },
        include: includePeriodRelations,
      })

      await tx.systemLog.create({
        data: {
          userId: operatorUserId,
          action: SELECTION_PERIOD_LOG_ACTION.create,
          resourceType: 'selection_period',
          resourceId: created.id,
          details: {
            semester_id: body.semesterId,
            phase: body.phase,
            start_time: body.startTime,
            end_time: body.endTime,
            max_credits: body.maxCredits ?? null,
            allow_drop: body.allowDrop,
            is_active: body.isActive,
          },
        },
      })

      return created
    })

    return mapSelectionPeriodItem(period)
  },

  async updatePeriod(
    operatorUserId: string,
    periodId: string,
    body: UpdateSelectionPeriodBody
  ): Promise<SelectionPeriodItem> {
    await assertAcademicAdmin(operatorUserId)

    const existing = await prisma.selectionPeriod.findUnique({
      where: { id: periodId },
      include: includePeriodRelations,
    })
    if (!existing) {
      throw new NotFoundError('选课时间段', periodId)
    }

    const startTime = body.startTime ? new Date(body.startTime) : existing.startTime
    const endTime = body.endTime ? new Date(body.endTime) : existing.endTime
    if (startTime >= endTime) {
      throw new AppError(COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED, 400, '结束时间必须晚于开始时间')
    }

    const nextSemesterId = body.semesterId ?? existing.semesterId
    if (body.semesterId) {
      const semester = await prisma.semester.findUnique({ where: { id: body.semesterId } })
      if (!semester) {
        throw new NotFoundError('学期', body.semesterId)
      }
    }

    const nextIsActive = body.isActive ?? existing.isActive

    await assertActivePeriodsDoNotOverlap({
      semesterId: nextSemesterId,
      phase: body.phase ?? toSelectionPhaseValue(existing.phase),
      startTime,
      endTime,
      isActive: nextIsActive,
      excludePeriodId: periodId,
    })

    const period = await prisma.$transaction(async (tx) => {
      const updated = await tx.selectionPeriod.update({
        where: { id: periodId },
        data: {
          semesterId: body.semesterId,
          phase: body.phase ? phaseToPrisma(body.phase) : undefined,
          startTime: body.startTime ? startTime : undefined,
          endTime: body.endTime ? endTime : undefined,
          maxCredits: body.maxCredits,
          allowDrop: body.allowDrop,
          isActive: body.isActive,
        },
        include: includePeriodRelations,
      })

      await tx.systemLog.create({
        data: {
          userId: operatorUserId,
          action: SELECTION_PERIOD_LOG_ACTION.update,
          resourceType: 'selection_period',
          resourceId: updated.id,
          details: {
            before: {
              semester_id: existing.semesterId,
              phase: existing.phase,
              start_time: existing.startTime.toISOString(),
              end_time: existing.endTime.toISOString(),
              max_credits: existing.maxCredits ? decimalToNumber(existing.maxCredits) : null,
              allow_drop: existing.allowDrop,
              is_active: existing.isActive,
            },
            after: {
              semester_id: updated.semesterId,
              phase: updated.phase,
              start_time: updated.startTime.toISOString(),
              end_time: updated.endTime.toISOString(),
              max_credits: updated.maxCredits ? decimalToNumber(updated.maxCredits) : null,
              allow_drop: updated.allowDrop,
              is_active: updated.isActive,
            },
          },
        },
      })

      return updated
    })

    return mapSelectionPeriodItem(period)
  },

  async manualEnroll(
    operatorUserId: string,
    body: ManualEnrollmentBody
  ): Promise<ManualEnrollmentResult> {
    await assertAcademicAdmin(operatorUserId)

    const student = await prisma.student.findUnique({
      where: { userId: body.studentId },
      select: { userId: true },
    })
    if (!student) {
      throw new NotFoundError('学生', body.studentId)
    }

    const offering = await loadCourseOfferingForManualEnroll(body.courseOfferingId)

    if (offering.course.status !== CourseStatus.ACTIVE) {
      throw new AppError(COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED, 422, '手动加课失败：课程未启用', {
        code: COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED,
        field: 'course_offering_id',
        message: '课程主数据未处于可用状态',
      })
    }

    if (offering.status !== OfferingStatus.OPEN && offering.status !== OfferingStatus.PLANNED) {
      throw new AppError(COURSE_SELECTION_ERROR_CODES.OFFERING_CLOSED, 422, '手动加课失败：课程未开放', {
        code: COURSE_SELECTION_ERROR_CODES.OFFERING_CLOSED,
        field: 'course_offering_id',
        message: '目标课程开设当前不可选课',
      })
    }

    if (offering.enrolledCount >= offering.capacity) {
      throw new AppError(COURSE_SELECTION_ERROR_CODES.OFFERING_FULL, 422, '手动加课失败：课程容量已满', {
        code: COURSE_SELECTION_ERROR_CODES.OFFERING_FULL,
        field: 'course_offering_id',
        message: '当前课程开设已达到容量上限，请先调整容量或处理退选后再加课',
      })
    }

    const additionalCredits = decimalToNumber(offering.course.credits)
    await assertWithinMaxCredits(body.studentId, offering.semesterId, additionalCredits, offering.id)
    await assertNoScheduleConflict(body.studentId, offering.id)

    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_courseOfferingId: {
          studentId: body.studentId,
          courseOfferingId: body.courseOfferingId,
        },
      },
    })

    if (existing?.status === EnrollmentStatus.ENROLLED) {
      throw new AppError(
        COURSE_SELECTION_ERROR_CODES.DUPLICATE_ENROLLMENT,
        409,
        '手动加课失败：学生已选该课程',
        {
          code: COURSE_SELECTION_ERROR_CODES.DUPLICATE_ENROLLMENT,
          field: 'course_offering_id',
          message: '该学生已存在有效选课记录',
        }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const lockedOffering = await tx.courseOffering.findUnique({
        where: { id: offering.id },
      })
      if (!lockedOffering || lockedOffering.enrolledCount >= lockedOffering.capacity) {
        throw new AppError(COURSE_SELECTION_ERROR_CODES.OFFERING_FULL, 422, '手动加课失败：课程容量已满')
      }

      const enrollment =
        existing && existing.status !== EnrollmentStatus.ENROLLED
          ? await tx.enrollment.update({
              where: { id: existing.id },
              data: {
                status: EnrollmentStatus.ENROLLED,
                enrolledAt: new Date(),
                droppedAt: null,
              },
            })
          : await tx.enrollment.create({
              data: {
                studentId: body.studentId,
                courseOfferingId: body.courseOfferingId,
                status: EnrollmentStatus.ENROLLED,
              },
            })

      const updatedOffering = await tx.courseOffering.update({
        where: { id: offering.id },
        data: {
          enrolledCount: {
            increment: existing?.status === EnrollmentStatus.ENROLLED ? 0 : 1,
          },
        },
      })

      if (existing?.status !== EnrollmentStatus.ENROLLED && updatedOffering.enrolledCount > updatedOffering.capacity) {
        throw new AppError(COURSE_SELECTION_ERROR_CODES.OFFERING_FULL, 422, '手动加课失败：课程容量已满')
      }

      await tx.systemLog.create({
        data: {
          userId: operatorUserId,
          action: SELECTION_PERIOD_LOG_ACTION.manualEnroll,
          resourceType: 'enrollment',
          resourceId: enrollment.id,
          details: {
            student_id: body.studentId,
            course_offering_id: body.courseOfferingId,
            reason: body.reason,
            notify_student: body.notifyStudent,
          },
        },
      })

      return { enrollment, updatedOffering }
    })

    return {
      enrollment: {
        id: result.enrollment.id,
        studentId: result.enrollment.studentId,
        courseOfferingId: result.enrollment.courseOfferingId,
        status: toEnrollmentStatusValue(result.enrollment.status),
        enrolledAt: result.enrollment.enrolledAt.toISOString(),
      },
      courseOffering: {
        id: result.updatedOffering.id,
        capacity: result.updatedOffering.capacity,
        enrolledCount: result.updatedOffering.enrolledCount,
        remainingCapacity: Math.max(
          0,
          result.updatedOffering.capacity - result.updatedOffering.enrolledCount
        ),
      },
      audit: {
        logged: true,
        action: SELECTION_PERIOD_LOG_ACTION.manualEnroll,
      },
    }
  },
}
