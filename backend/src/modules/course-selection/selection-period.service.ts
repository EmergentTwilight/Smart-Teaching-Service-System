/**
 * C5：SelectionPeriod 管理与手动加课事务（容量、冲突、学分、SystemLog）。
 * 手动加课与 C3 共用 Enrollment 表，但不实现学生自助选课流程。
 */
import { CourseStatus, EnrollmentStatus, OfferingStatus } from '@prisma/client'
import { AppError, NotFoundError } from '@stss/shared'
import prisma from '../../shared/prisma/client.js'
import type {
  CreateSelectionPeriodBody,
  ManualEnrollmentBody,
  ManualEnrollmentResult,
  PaginatedItems,
  SelectionPeriodItem,
  SelectionPeriodQuery,
  UpdateSelectionPeriodBody,
} from './course-selection.types.js'
import {
  COURSE_SELECTION_ERROR_CODES,
  toEnrollmentStatusValue,
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
              is_active: existing.isActive,
            },
            after: {
              semester_id: updated.semesterId,
              phase: updated.phase,
              start_time: updated.startTime.toISOString(),
              end_time: updated.endTime.toISOString(),
              max_credits: updated.maxCredits ? decimalToNumber(updated.maxCredits) : null,
              is_active: updated.isActive,
            },
          },
        },
      })

      return updated
    })

    return mapSelectionPeriodItem(period)
  },

  // TODO(C5, FR-C-35, FR-C-36, NFR-C-01~NFR-C-03): 接入 Redis 连接数控制、心跳与无操作强制退出
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
