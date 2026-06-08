import {
  CourseStatus,
  EnrollmentStatus,
  OfferingStatus,
  Prisma,
  SelectionPhase,
} from '@prisma/client'
import { AppError } from '@stss/shared'
import prisma from '../../shared/prisma/client.js'
import type {
  CreateEnrollmentBody,
  DropEnrollmentBody,
  EnrollmentCreditSummary,
  EnrollmentMutationCourseOffering,
  EnrollmentMutationPayload,
} from './course-selection.types.js'
import {
  COURSE_SELECTION_ERROR_CODES,
  toEnrollmentStatusValue,
} from './course-selection.types.js'

type CourseSelectionTx = Prisma.TransactionClient

type DecimalLike = Prisma.Decimal | number | string | null | undefined

interface ScheduleWindow {
  dayOfWeek: number
  startWeek: number
  endWeek: number
  startPeriod: number
  endPeriod: number
}

interface EnrollmentRecord {
  id: string
  status: EnrollmentStatus
  enrolledAt: Date
  droppedAt: Date | null
}

const SERIALIZABLE_TRANSACTION_RETRIES = 3

const toNumber = (value: DecimalLike): number | null => {
  if (value === null || value === undefined) return null
  return Number(value)
}

const toRequiredNumber = (value: DecimalLike): number => toNumber(value) ?? 0

const throwCourseSelectionError = (
  code: keyof typeof COURSE_SELECTION_ERROR_CODES,
  statusCode: number,
  message: string
): never => {
  const errorCode = COURSE_SELECTION_ERROR_CODES[code]
  throw new AppError(errorCode, statusCode, message, { code: errorCode })
}

function assertCourseSelectionExists<T>(
  value: T | null | undefined,
  code: keyof typeof COURSE_SELECTION_ERROR_CODES,
  statusCode: number,
  message: string
): asserts value is T {
  if (value === null || value === undefined) {
    throwCourseSelectionError(code, statusCode, message)
  }
}

const hasScheduleOverlap = (left: ScheduleWindow, right: ScheduleWindow): boolean =>
  left.dayOfWeek === right.dayOfWeek &&
  left.startWeek <= right.endWeek &&
  right.startWeek <= left.endWeek &&
  left.startPeriod <= right.endPeriod &&
  right.startPeriod <= left.endPeriod

const formatScheduleConflict = (
  courseName: string,
  target: ScheduleWindow,
  existing: ScheduleWindow
): string =>
  `与已选课程 ${courseName} 在第 ${Math.max(target.startWeek, existing.startWeek)}-${Math.min(
    target.endWeek,
    existing.endWeek
  )} 周、星期 ${target.dayOfWeek}、第 ${Math.max(target.startPeriod, existing.startPeriod)}-${Math.min(
    target.endPeriod,
    existing.endPeriod
  )} 节冲突`

const ensureStudent = async (tx: CourseSelectionTx, studentId: string) => {
  const student = await tx.student.findUnique({
    where: { userId: studentId },
    select: {
      userId: true,
      majorId: true,
      grade: true,
    },
  })

  assertCourseSelectionExists(student, 'FORBIDDEN', 403, '当前用户不是学生，不能执行选课操作')

  return student
}

const getActiveSelectionPeriod = async (
  tx: CourseSelectionTx,
  semesterId: string,
  now: Date
) => {
  const period = await tx.selectionPeriod.findFirst({
    where: {
      semesterId,
      isActive: true,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    orderBy: [
      { endTime: 'asc' },
      { startTime: 'desc' },
    ],
  })

  assertCourseSelectionExists(period, 'PERIOD_CLOSED', 422, '当前不在有效选课时间段内')

  return period
}

const ensurePeriodHasMaxCredits = (period: { maxCredits: Prisma.Decimal | null }): number => {
  const maxCredits = toNumber(period.maxCredits)

  assertCourseSelectionExists(
    maxCredits,
    'PERIOD_CLOSED',
    422,
    '当前选课阶段未配置最大学分，暂不能选课'
  )

  return maxCredits
}

const ensureDropAllowedInPeriod = (period: { phase: SelectionPhase }) => {
  // TODO-C-12: first_round 是否允许退选仍需教务确认；当前默认仅补退选与调整阶段允许退选。
  if (
    period.phase !== SelectionPhase.SECOND_ROUND &&
    period.phase !== SelectionPhase.ADJUSTMENT
  ) {
    throwCourseSelectionError('PERIOD_CLOSED', 422, '当前选课阶段不允许退选')
  }
}

const ensureWithinCurriculum = async (
  tx: CourseSelectionTx,
  student: { majorId: string | null; grade: number },
  courseId: string
) => {
  const majorId = student.majorId

  assertCourseSelectionExists(
    majorId,
    'PREREQUISITE_NOT_MET',
    422,
    '学生未绑定专业，无法匹配培养方案'
  )

  const curriculum = await tx.curriculum.findFirst({
    where: {
      majorId,
      year: student.grade,
    },
    select: { id: true },
  })

  assertCourseSelectionExists(
    curriculum,
    'PREREQUISITE_NOT_MET',
    422,
    '未找到当前学生匹配的培养方案'
  )

  const curriculumCourse = await tx.curriculumCourse.findUnique({
    where: {
      curriculumId_courseId: {
        curriculumId: curriculum.id,
        courseId,
      },
    },
    select: { courseId: true },
  })

  if (!curriculumCourse) {
    throwCourseSelectionError('PREREQUISITE_NOT_MET', 422, '目标课程不在当前学生培养方案内')
  }
}

const ensurePrerequisitesMet = async (
  tx: CourseSelectionTx,
  courseId: string
) => {
  const prerequisites = await tx.coursePrerequisite.findMany({
    where: { courseId },
    include: {
      prerequisite: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  })

  if (prerequisites.length === 0) return

  // TODO-C-10: 先修课程通过情况的数据源需由负责人和 F 子系统确认。
  // 在通过情况不可验证前，写事务选择阻止选课，避免绕过 FR-C-19。
  throwCourseSelectionError(
    'PREREQUISITE_NOT_MET',
    422,
    `目标课程存在先修要求，当前无法验证通过情况：${prerequisites
      .map((item) => `${item.prerequisite.code} ${item.prerequisite.name}`)
      .join('、')}`
  )
}

const getCurrentEnrollments = async (
  tx: CourseSelectionTx,
  studentId: string,
  semesterId: string
) =>
  tx.enrollment.findMany({
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
              code: true,
              name: true,
              credits: true,
            },
          },
          schedules: true,
        },
      },
    },
  })

const ensureNoScheduleConflict = (
  targetSchedules: ScheduleWindow[],
  currentEnrollments: Awaited<ReturnType<typeof getCurrentEnrollments>>
) => {
  for (const enrollment of currentEnrollments) {
    for (const targetSchedule of targetSchedules) {
      for (const existingSchedule of enrollment.courseOffering.schedules) {
        if (hasScheduleOverlap(targetSchedule, existingSchedule)) {
          throwCourseSelectionError(
            'SCHEDULE_CONFLICT',
            422,
            formatScheduleConflict(
              enrollment.courseOffering.course.name,
              targetSchedule,
              existingSchedule
            )
          )
        }
      }
    }
  }
}

const calculateSelectedCredits = (
  currentEnrollments: Awaited<ReturnType<typeof getCurrentEnrollments>>
): number =>
  currentEnrollments.reduce(
    (sum, enrollment) => sum + toRequiredNumber(enrollment.courseOffering.course.credits),
    0
  )

const ensureMaxCreditsNotExceeded = (
  currentSelectedCredits: number,
  targetCredits: number,
  maxCredits: number
) => {
  if (currentSelectedCredits + targetCredits > maxCredits) {
    throwCourseSelectionError(
      'MAX_CREDITS_EXCEEDED',
      422,
      `选课后总学分 ${currentSelectedCredits + targetCredits} 超过当前阶段最大学分 ${maxCredits}`
    )
  }
}

const toCourseOfferingPayload = (offering: {
  id: string
  capacity: number
  enrolledCount: number
  course: {
    code: string
    name: string
  }
}): EnrollmentMutationCourseOffering => ({
  id: offering.id,
  courseCode: offering.course.code,
  courseName: offering.course.name,
  capacity: offering.capacity,
  enrolledCount: offering.enrolledCount,
  remainingCapacity: Math.max(offering.capacity - offering.enrolledCount, 0),
})

const toEnrollmentPayload = (
  enrollment: {
    id: string
    status: EnrollmentStatus
    enrolledAt: Date
    droppedAt: Date | null
  },
  offering: {
    id: string
    capacity: number
    enrolledCount: number
    course: {
      code: string
      name: string
    }
  },
  creditSummary?: EnrollmentCreditSummary
): EnrollmentMutationPayload => ({
  enrollment: {
    id: enrollment.id,
    status: toEnrollmentStatusValue(enrollment.status),
    enrolledAt: enrollment.enrolledAt.toISOString(),
    droppedAt: enrollment.droppedAt?.toISOString() ?? null,
  },
  courseOffering: toCourseOfferingPayload(offering),
  ...(creditSummary ? { creditSummary } : {}),
})

const findOfferingForPayload = async (tx: CourseSelectionTx, offeringId: string) => {
  const offering = await tx.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      course: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  })

  assertCourseSelectionExists(offering, 'OFFERING_NOT_FOUND', 404, '课程开设不存在')

  return offering
}

const incrementOfferingCount = async (
  tx: CourseSelectionTx,
  offeringId: string,
  capacity: number
) => {
  const result = await tx.courseOffering.updateMany({
    where: {
      id: offeringId,
      status: OfferingStatus.OPEN,
      capacity,
      enrolledCount: { lt: capacity },
    },
    data: {
      enrolledCount: { increment: 1 },
    },
  })

  if (result.count !== 1) {
    throwCourseSelectionError('OFFERING_FULL', 422, '课程容量已满')
  }
}

const decrementOfferingCount = async (tx: CourseSelectionTx, offeringId: string) => {
  const result = await tx.courseOffering.updateMany({
    where: {
      id: offeringId,
      enrolledCount: { gt: 0 },
    },
    data: {
      enrolledCount: { decrement: 1 },
    },
  })

  if (result.count !== 1) {
    throwCourseSelectionError('VALIDATION_FAILED', 422, '课程已选人数异常，无法完成退选')
  }
}

interface PrismaKnownRequestErrorLike {
  code: string
}

const isPrismaKnownRequestError = (error: unknown): error is PrismaKnownRequestErrorLike =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof (error as { code?: unknown }).code === 'string'

const runSerializableCourseSelectionTransaction = async <T>(
  callback: (tx: CourseSelectionTx) => Promise<T>,
  conflictMessage = '选课请求并发冲突，请稍后重试'
): Promise<T> => {
  for (let attempt = 1; attempt <= SERIALIZABLE_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2034') {
        if (attempt < SERIALIZABLE_TRANSACTION_RETRIES) {
          continue
        }

        return throwCourseSelectionError('ADMISSION_LIMITED', 429, conflictMessage)
      }

      throw error
    }
  }

  return throwCourseSelectionError('ADMISSION_LIMITED', 429, conflictMessage)
}

const findIdempotentCreatePayload = async (
  tx: CourseSelectionTx,
  studentId: string,
  courseOfferingId: string
): Promise<EnrollmentMutationPayload | null> => {
  const enrollment = await tx.enrollment.findUnique({
    where: {
      studentId_courseOfferingId: {
        studentId,
        courseOfferingId,
      },
    },
    include: {
      courseOffering: {
        include: {
          course: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!enrollment || enrollment.status !== EnrollmentStatus.ENROLLED) {
    return null
  }

  const period = await getActiveSelectionPeriod(
    tx,
    enrollment.courseOffering.semesterId,
    new Date()
  )
  const maxCredits = ensurePeriodHasMaxCredits(period)
  const currentEnrollments = await getCurrentEnrollments(
    tx,
    studentId,
    enrollment.courseOffering.semesterId
  )

  return toEnrollmentPayload(enrollment, enrollment.courseOffering, {
    currentSelectedCredits: calculateSelectedCredits(currentEnrollments),
    maxCredits,
  })
}

const findIdempotentDropPayload = async (
  tx: CourseSelectionTx,
  studentId: string,
  enrollmentId: string
): Promise<EnrollmentMutationPayload | null> => {
  const enrollment = await tx.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      courseOffering: {
        include: {
          course: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (
    !enrollment ||
    enrollment.studentId !== studentId ||
    enrollment.status !== EnrollmentStatus.DROPPED
  ) {
    return null
  }

  return toEnrollmentPayload(enrollment, enrollment.courseOffering)
}

export const enrollmentService = {
  async createEnrollment(
    studentId: string,
    body: CreateEnrollmentBody
  ): Promise<EnrollmentMutationPayload> {
    try {
      return await runSerializableCourseSelectionTransaction(async (tx) => {
        const now = new Date()
        const student = await ensureStudent(tx, studentId)
        const offering = await tx.courseOffering.findUnique({
          where: { id: body.courseOfferingId },
          include: {
            course: true,
            schedules: true,
          },
        })

        assertCourseSelectionExists(offering, 'OFFERING_NOT_FOUND', 404, '课程开设不存在')

        const period = await getActiveSelectionPeriod(tx, offering.semesterId, now)
        const maxCredits = ensurePeriodHasMaxCredits(period)

        if (offering.status !== OfferingStatus.OPEN) {
          throwCourseSelectionError('OFFERING_CLOSED', 422, '课程开设未开放选课')
        }

        if (offering.course.status !== CourseStatus.ACTIVE) {
          throwCourseSelectionError('OFFERING_CLOSED', 422, '课程已归档，不能选课')
        }

        const existingEnrollment = await tx.enrollment.findUnique({
          where: {
            studentId_courseOfferingId: {
              studentId,
              courseOfferingId: body.courseOfferingId,
            },
          },
        })

        const currentEnrollments = await getCurrentEnrollments(tx, studentId, offering.semesterId)
        const currentSelectedCredits = calculateSelectedCredits(currentEnrollments)
        const targetCredits = toRequiredNumber(offering.course.credits)

        if (existingEnrollment?.status === EnrollmentStatus.ENROLLED) {
          if (body.clientRequestId) {
            const latestOffering = await findOfferingForPayload(tx, offering.id)
            return toEnrollmentPayload(existingEnrollment, latestOffering, {
              currentSelectedCredits,
              maxCredits,
            })
          }

          throwCourseSelectionError('DUPLICATE_ENROLLMENT', 409, '不能重复选择同一课程开设')
        }

        if (offering.enrolledCount >= offering.capacity) {
          throwCourseSelectionError('OFFERING_FULL', 422, '课程容量已满')
        }

        if (existingEnrollment && existingEnrollment.status !== EnrollmentStatus.DROPPED) {
          throwCourseSelectionError('DUPLICATE_ENROLLMENT', 409, '该课程开设已有不可恢复的选课记录')
        }

        ensureNoScheduleConflict(
          offering.schedules.map<ScheduleWindow>((schedule) => ({
            dayOfWeek: schedule.dayOfWeek,
            startWeek: schedule.startWeek,
            endWeek: schedule.endWeek,
            startPeriod: schedule.startPeriod,
            endPeriod: schedule.endPeriod,
          })),
          currentEnrollments
        )
        ensureMaxCreditsNotExceeded(currentSelectedCredits, targetCredits, maxCredits)
        await ensureWithinCurriculum(tx, student, offering.courseId)
        await ensurePrerequisitesMet(tx, offering.courseId)

        let enrollment: EnrollmentRecord | null

        if (existingEnrollment) {
          const updateResult = await tx.enrollment.updateMany({
            where: {
              id: existingEnrollment.id,
              studentId,
              courseOfferingId: body.courseOfferingId,
              status: EnrollmentStatus.DROPPED,
            },
            data: {
              status: EnrollmentStatus.ENROLLED,
              enrolledAt: now,
              droppedAt: null,
            },
          })

          if (updateResult.count !== 1) {
            if (body.clientRequestId) {
              const idempotentPayload = await findIdempotentCreatePayload(
                tx,
                studentId,
                body.courseOfferingId
              )

              if (idempotentPayload) {
                return idempotentPayload
              }
            }

            throwCourseSelectionError('DUPLICATE_ENROLLMENT', 409, '不能重复选择同一课程开设')
          }

          await incrementOfferingCount(tx, offering.id, offering.capacity)
          enrollment = await tx.enrollment.findUnique({
            where: { id: existingEnrollment.id },
          })
        } else {
          enrollment = await tx.enrollment.create({
            data: {
              studentId,
              courseOfferingId: body.courseOfferingId,
              status: EnrollmentStatus.ENROLLED,
              enrolledAt: now,
              droppedAt: null,
            },
          })
          await incrementOfferingCount(tx, offering.id, offering.capacity)
        }

        assertCourseSelectionExists(enrollment, 'VALIDATION_FAILED', 422, '选课记录写入失败')

        const latestOffering = await findOfferingForPayload(tx, offering.id)

        return toEnrollmentPayload(enrollment, latestOffering, {
          currentSelectedCredits: currentSelectedCredits + targetCredits,
          maxCredits,
        })
      })
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2002') {
        if (body.clientRequestId) {
          const idempotentPayload = await runSerializableCourseSelectionTransaction((tx) =>
            findIdempotentCreatePayload(tx, studentId, body.courseOfferingId)
          )

          if (idempotentPayload) {
            return idempotentPayload
          }
        }

        throwCourseSelectionError('DUPLICATE_ENROLLMENT', 409, '不能重复选择同一课程开设')
      }

      if (isPrismaKnownRequestError(error) && error.code === 'P2034') {
        throwCourseSelectionError('ADMISSION_LIMITED', 429, '选课请求并发冲突，请稍后重试')
      }

      throw error
    }
  },

  async dropEnrollment(
    studentId: string,
    enrollmentId: string,
    body: DropEnrollmentBody
  ): Promise<EnrollmentMutationPayload> {
    void body.reason

    try {
      return await runSerializableCourseSelectionTransaction(async (tx) => {
        const now = new Date()
        await ensureStudent(tx, studentId)

        const enrollment = await tx.enrollment.findUnique({
          where: { id: enrollmentId },
          include: {
            courseOffering: {
              include: {
                course: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        })

        assertCourseSelectionExists(
          enrollment,
          'ENROLLMENT_NOT_FOUND',
          404,
          '选课记录不存在'
        )

        if (enrollment.studentId !== studentId) {
          throwCourseSelectionError('FORBIDDEN', 403, '只能退选当前登录学生本人的课程')
        }

        const period = await getActiveSelectionPeriod(tx, enrollment.courseOffering.semesterId, now)
        ensureDropAllowedInPeriod(period)

        if (enrollment.status === EnrollmentStatus.DROPPED && body.clientRequestId) {
          return toEnrollmentPayload(enrollment, enrollment.courseOffering)
        }

        if (enrollment.status !== EnrollmentStatus.ENROLLED) {
          throwCourseSelectionError('VALIDATION_FAILED', 422, '只有已选状态的课程可以退选')
        }

        const enrollmentUpdate = await tx.enrollment.updateMany({
          where: {
            id: enrollmentId,
            studentId,
            status: EnrollmentStatus.ENROLLED,
          },
          data: {
            status: EnrollmentStatus.DROPPED,
            droppedAt: now,
          },
        })

        if (enrollmentUpdate.count !== 1) {
          if (body.clientRequestId) {
            const idempotentPayload = await findIdempotentDropPayload(tx, studentId, enrollmentId)

            if (idempotentPayload) {
              return idempotentPayload
            }
          }

          throwCourseSelectionError('VALIDATION_FAILED', 422, '选课记录状态已变化，无法退选')
        }

        await decrementOfferingCount(tx, enrollment.courseOfferingId)

        const updatedEnrollment = await tx.enrollment.findUnique({
          where: { id: enrollmentId },
        })
        const latestOffering = await findOfferingForPayload(tx, enrollment.courseOfferingId)

        assertCourseSelectionExists(
          updatedEnrollment,
          'ENROLLMENT_NOT_FOUND',
          404,
          '选课记录不存在'
        )

        return toEnrollmentPayload(updatedEnrollment, latestOffering)
      }, '退选请求并发冲突，请稍后重试')
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2034') {
        throwCourseSelectionError('ADMISSION_LIMITED', 429, '退选请求并发冲突，请稍后重试')
      }

      throw error
    }
  },
}
