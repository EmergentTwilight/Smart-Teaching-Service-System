import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CourseStatus,
  EnrollmentStatus,
  OfferingStatus,
  Prisma,
  SelectionPhase,
} from '@prisma/client'
import { COURSE_SELECTION_ERROR_CODES } from '../../../modules/course-selection/course-selection.types.js'

const prismaMock = vi.hoisted(() => ({
  student: {
    findUnique: vi.fn(),
  },
  courseOffering: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  selectionPeriod: {
    findFirst: vi.fn(),
  },
  enrollment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  curriculum: {
    findFirst: vi.fn(),
  },
  curriculumCourse: {
    findUnique: vi.fn(),
  },
  coursePrerequisite: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

import { enrollmentService } from '../../../modules/course-selection/enrollment.service.js'

const now = new Date('2026-05-19T04:00:00.000Z')

const buildStudent = (overrides: Record<string, unknown> = {}) => ({
  userId: 'student-1',
  majorId: 'major-1',
  grade: 2024,
  ...overrides,
})

const buildPeriod = (overrides: Record<string, unknown> = {}) => ({
  id: 'period-1',
  semesterId: 'semester-1',
  phase: SelectionPhase.SECOND_ROUND,
  startTime: new Date('2026-05-01T00:00:00.000Z'),
  endTime: new Date('2026-06-01T00:00:00.000Z'),
  maxCredits: 28,
  isActive: true,
  ...overrides,
})

const buildSchedule = (overrides: Record<string, unknown> = {}) => ({
  id: 'schedule-1',
  courseOfferingId: 'offering-1',
  classroomId: 'classroom-1',
  dayOfWeek: 1,
  startWeek: 1,
  endWeek: 16,
  startPeriod: 1,
  endPeriod: 2,
  notes: null,
  ...overrides,
})

const buildOffering = (overrides: Record<string, unknown> = {}) => ({
  id: 'offering-1',
  courseId: 'course-1',
  semesterId: 'semester-1',
  teacherId: 'teacher-1',
  capacity: 20,
  enrolledCount: 10,
  status: OfferingStatus.OPEN,
  course: {
    id: 'course-1',
    code: 'CS101',
    name: '程序设计基础',
    credits: 3,
    status: CourseStatus.ACTIVE,
  },
  schedules: [buildSchedule()],
  ...overrides,
})

const buildEnrollment = (overrides: Record<string, unknown> = {}) => ({
  id: 'enrollment-1',
  studentId: 'student-1',
  courseOfferingId: 'offering-1',
  status: EnrollmentStatus.ENROLLED,
  enrolledAt: new Date('2026-05-19T04:00:00.000Z'),
  droppedAt: null,
  ...overrides,
})

const buildCurrentEnrollment = (overrides: Record<string, unknown> = {}) => ({
  ...buildEnrollment({ id: 'current-enrollment-1', courseOfferingId: 'current-offering-1' }),
  courseOffering: {
    id: 'current-offering-1',
    semesterId: 'semester-1',
    course: {
      id: 'current-course-1',
      code: 'CS100',
      name: '大学计算机',
      credits: 2,
    },
    schedules: [],
  },
  ...overrides,
})

const expectCourseSelectionError = async (
  promise: Promise<unknown>,
  code: string,
  statusCode: number
) => {
  await expect(promise).rejects.toMatchObject({ code, statusCode })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  vi.resetAllMocks()

  prismaMock.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === 'function') {
      return callback(prismaMock)
    }
    return callback
  })

  prismaMock.student.findUnique.mockResolvedValue(buildStudent())
  prismaMock.selectionPeriod.findFirst.mockResolvedValue(buildPeriod())
  prismaMock.enrollment.findUnique.mockResolvedValue(null)
  prismaMock.enrollment.findMany.mockResolvedValue([])
  prismaMock.curriculum.findFirst.mockResolvedValue({ id: 'curriculum-1' })
  prismaMock.curriculumCourse.findUnique.mockResolvedValue({ courseId: 'course-1' })
  prismaMock.coursePrerequisite.findMany.mockResolvedValue([])
  prismaMock.courseOffering.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.enrollment.updateMany.mockResolvedValue({ count: 1 })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('enrollmentService.createEnrollment', () => {
  it('creates enrollment and increments offering count in one transaction', async () => {
    prismaMock.courseOffering.findUnique
      .mockResolvedValueOnce(buildOffering())
      .mockResolvedValueOnce(buildOffering({ enrolledCount: 11, schedules: undefined }))
    prismaMock.enrollment.create.mockResolvedValue(buildEnrollment())

    const result = await enrollmentService.createEnrollment('student-1', {
      courseOfferingId: 'offering-1',
      clientRequestId: 'select-1',
    })

    expect(prismaMock.enrollment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: 'student-1',
        courseOfferingId: 'offering-1',
        status: EnrollmentStatus.ENROLLED,
        droppedAt: null,
      }),
    })
    expect(prismaMock.courseOffering.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'offering-1',
        status: OfferingStatus.OPEN,
        capacity: 20,
        enrolledCount: { lt: 20 },
      },
      data: { enrolledCount: { increment: 1 } },
    })
    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })
    expect(result.courseOffering.enrolledCount).toBe(11)
    expect(result.courseOffering.remainingCapacity).toBe(9)
    expect(result.creditSummary).toEqual({
      currentSelectedCredits: 3,
      maxCredits: 28,
    })
  })

  it('retries serializable transaction conflicts before succeeding', async () => {
    prismaMock.$transaction
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockImplementationOnce(async (callback: unknown) => {
        if (typeof callback === 'function') {
          return callback(prismaMock)
        }
        return callback
      })
    prismaMock.courseOffering.findUnique
      .mockResolvedValueOnce(buildOffering())
      .mockResolvedValueOnce(buildOffering({ enrolledCount: 11, schedules: undefined }))
    prismaMock.enrollment.create.mockResolvedValue(buildEnrollment())

    const result = await enrollmentService.createEnrollment('student-1', {
      courseOfferingId: 'offering-1',
      clientRequestId: 'select-1',
    })

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2)
    expect(result.courseOffering.enrolledCount).toBe(11)
  })

  it('rejects full offerings before creating enrollment', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(
      buildOffering({ capacity: 20, enrolledCount: 20 })
    )

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('student-1', { courseOfferingId: 'offering-1' }),
      COURSE_SELECTION_ERROR_CODES.OFFERING_FULL,
      422
    )
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
  })

  it('rejects missing course offerings before creating enrollment', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(null)

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('student-1', { courseOfferingId: 'missing-offering' }),
      COURSE_SELECTION_ERROR_CODES.OFFERING_NOT_FOUND,
      404
    )
    expect(prismaMock.selectionPeriod.findFirst).not.toHaveBeenCalled()
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
  })

  it('rejects concurrent capacity changes that fail the conditional increment', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(
      buildOffering({ capacity: 20, enrolledCount: 19, schedules: [] })
    )
    prismaMock.enrollment.create.mockResolvedValueOnce(buildEnrollment())
    prismaMock.courseOffering.updateMany.mockResolvedValueOnce({ count: 0 })

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('student-1', { courseOfferingId: 'offering-1' }),
      COURSE_SELECTION_ERROR_CODES.OFFERING_FULL,
      422
    )
    expect(prismaMock.enrollment.create).toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'offering-1',
        status: OfferingStatus.OPEN,
        capacity: 20,
        enrolledCount: { lt: 20 },
      },
      data: { enrolledCount: { increment: 1 } },
    })
  })

  it('rejects users without a student profile', async () => {
    prismaMock.student.findUnique.mockResolvedValueOnce(null)

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('user-without-student', {
        courseOfferingId: 'offering-1',
      }),
      COURSE_SELECTION_ERROR_CODES.FORBIDDEN,
      403
    )
    expect(prismaMock.courseOffering.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
  })

  it('rejects closed offerings before creating enrollment', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(
      buildOffering({ status: OfferingStatus.CLOSED })
    )

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('student-1', { courseOfferingId: 'offering-1' }),
      COURSE_SELECTION_ERROR_CODES.OFFERING_CLOSED,
      422
    )
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('rejects duplicate active enrollment without creating another record', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(buildOffering())
    prismaMock.enrollment.findUnique.mockResolvedValueOnce(buildEnrollment())

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('student-1', { courseOfferingId: 'offering-1' }),
      COURSE_SELECTION_ERROR_CODES.DUPLICATE_ENROLLMENT,
      409
    )
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('rejects selection outside an active selection period', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(buildOffering())
    prismaMock.selectionPeriod.findFirst.mockResolvedValueOnce(null)

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('student-1', { courseOfferingId: 'offering-1' }),
      COURSE_SELECTION_ERROR_CODES.PERIOD_CLOSED,
      422
    )
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('rejects selection when the active period has no max credits configured', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(buildOffering())
    prismaMock.selectionPeriod.findFirst.mockResolvedValueOnce(buildPeriod({ maxCredits: null }))

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('student-1', { courseOfferingId: 'offering-1' }),
      COURSE_SELECTION_ERROR_CODES.PERIOD_CLOSED,
      422
    )
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('rejects archived courses before creating enrollment', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(
      buildOffering({
        course: {
          id: 'course-1',
          code: 'CS101',
          name: '程序设计基础',
          credits: 3,
          status: CourseStatus.ARCHIVED,
        },
      })
    )

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('student-1', { courseOfferingId: 'offering-1' }),
      COURSE_SELECTION_ERROR_CODES.OFFERING_CLOSED,
      422
    )
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('returns existing enrollment for idempotent duplicate even when offering is full', async () => {
    prismaMock.courseOffering.findUnique
      .mockResolvedValueOnce(buildOffering({ capacity: 20, enrolledCount: 20 }))
      .mockResolvedValueOnce(
        buildOffering({ capacity: 20, enrolledCount: 20, schedules: undefined })
      )
    prismaMock.enrollment.findUnique.mockResolvedValueOnce(buildEnrollment())
    prismaMock.enrollment.findMany.mockResolvedValueOnce([
      buildCurrentEnrollment({
        id: 'enrollment-1',
        courseOfferingId: 'offering-1',
        courseOffering: {
          id: 'offering-1',
          semesterId: 'semester-1',
          course: {
            id: 'course-1',
            code: 'CS101',
            name: '程序设计基础',
            credits: 3,
          },
          schedules: [],
        },
      }),
    ])

    const result = await enrollmentService.createEnrollment('student-1', {
      courseOfferingId: 'offering-1',
      clientRequestId: 'select-1',
    })

    expect(result.enrollment.id).toBe('enrollment-1')
    expect(result.courseOffering.remainingCapacity).toBe(0)
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('returns existing enrollment for idempotent create after a unique race', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(buildOffering())
    prismaMock.enrollment.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...buildEnrollment(),
        courseOffering: buildOffering({ enrolledCount: 11, schedules: undefined }),
      })
    prismaMock.enrollment.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        buildCurrentEnrollment({
          id: 'enrollment-1',
          courseOfferingId: 'offering-1',
          courseOffering: {
            id: 'offering-1',
            semesterId: 'semester-1',
            course: {
              id: 'course-1',
              code: 'CS101',
              name: '程序设计基础',
              credits: 3,
            },
            schedules: [],
          },
        }),
      ])
    prismaMock.enrollment.create.mockRejectedValueOnce({ code: 'P2002' })

    const result = await enrollmentService.createEnrollment('student-1', {
      courseOfferingId: 'offering-1',
      clientRequestId: 'select-1',
    })

    expect(result.enrollment.id).toBe('enrollment-1')
    expect(result.creditSummary).toEqual({
      currentSelectedCredits: 3,
      maxCredits: 28,
    })
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2)
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('restores a dropped enrollment instead of creating a duplicate record', async () => {
    prismaMock.courseOffering.findUnique
      .mockResolvedValueOnce(buildOffering())
      .mockResolvedValueOnce(buildOffering({ enrolledCount: 11, schedules: undefined }))
    prismaMock.enrollment.findUnique
      .mockResolvedValueOnce(
        buildEnrollment({
          status: EnrollmentStatus.DROPPED,
          droppedAt: new Date('2026-05-18T04:00:00.000Z'),
        })
      )
      .mockResolvedValueOnce(buildEnrollment())

    const result = await enrollmentService.createEnrollment('student-1', {
      courseOfferingId: 'offering-1',
    })

    expect(prismaMock.enrollment.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'enrollment-1',
        studentId: 'student-1',
        courseOfferingId: 'offering-1',
        status: EnrollmentStatus.DROPPED,
      },
      data: {
        status: EnrollmentStatus.ENROLLED,
        enrolledAt: now,
        droppedAt: null,
      },
    })
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'offering-1',
        status: OfferingStatus.OPEN,
        capacity: 20,
        enrolledCount: { lt: 20 },
      },
      data: { enrolledCount: { increment: 1 } },
    })
    expect(result.enrollment.status).toBe('enrolled')
    expect(result.courseOffering.enrolledCount).toBe(11)
  })

  it('returns restored enrollment for idempotent restore races without incrementing again', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(buildOffering())
    prismaMock.enrollment.findUnique
      .mockResolvedValueOnce(
        buildEnrollment({
          status: EnrollmentStatus.DROPPED,
          droppedAt: new Date('2026-05-18T04:00:00.000Z'),
        })
      )
      .mockResolvedValueOnce({
        ...buildEnrollment(),
        courseOffering: buildOffering({ enrolledCount: 11, schedules: undefined }),
      })
    prismaMock.enrollment.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        buildCurrentEnrollment({
          id: 'enrollment-1',
          courseOfferingId: 'offering-1',
          courseOffering: {
            id: 'offering-1',
            semesterId: 'semester-1',
            course: {
              id: 'course-1',
              code: 'CS101',
              name: '程序设计基础',
              credits: 3,
            },
            schedules: [],
          },
        }),
      ])
    prismaMock.enrollment.updateMany.mockResolvedValueOnce({ count: 0 })

    const result = await enrollmentService.createEnrollment('student-1', {
      courseOfferingId: 'offering-1',
      clientRequestId: 'select-1',
    })

    expect(result.enrollment.status).toBe('enrolled')
    expect(result.courseOffering.enrolledCount).toBe(11)
    expect(result.creditSummary).toEqual({
      currentSelectedCredits: 3,
      maxCredits: 28,
    })
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('rejects courses outside the student curriculum', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(buildOffering({ schedules: [] }))
    prismaMock.curriculumCourse.findUnique.mockResolvedValueOnce(null)

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('student-1', { courseOfferingId: 'offering-1' }),
      COURSE_SELECTION_ERROR_CODES.PREREQUISITE_NOT_MET,
      422
    )
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('rejects overlapping schedules with a clear business error code', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(buildOffering())
    prismaMock.enrollment.findMany.mockResolvedValueOnce([
      buildCurrentEnrollment({
        courseOffering: {
          id: 'current-offering-1',
          semesterId: 'semester-1',
          course: {
            id: 'current-course-1',
            code: 'CS200',
            name: '数据结构',
            credits: 3,
          },
          schedules: [buildSchedule({ id: 'schedule-2', startPeriod: 2, endPeriod: 3 })],
        },
      }),
    ])

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('student-1', { courseOfferingId: 'offering-1' }),
      COURSE_SELECTION_ERROR_CODES.SCHEDULE_CONFLICT,
      422
    )
  })

  it('rejects selections that exceed current period max credits', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(buildOffering({ schedules: [] }))
    prismaMock.enrollment.findMany.mockResolvedValueOnce([
      buildCurrentEnrollment({
        courseOffering: {
          id: 'current-offering-1',
          semesterId: 'semester-1',
          course: {
            id: 'current-course-1',
            code: 'CS300',
            name: '操作系统',
            credits: 26,
          },
          schedules: [],
        },
      }),
    ])

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('student-1', { courseOfferingId: 'offering-1' }),
      COURSE_SELECTION_ERROR_CODES.MAX_CREDITS_EXCEEDED,
      422
    )
  })

  it('rejects missing prerequisites', async () => {
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(buildOffering({ schedules: [] }))
    prismaMock.coursePrerequisite.findMany.mockResolvedValueOnce([
      {
        courseId: 'course-1',
        prerequisiteId: 'pre-course-1',
        prerequisite: {
          id: 'pre-course-1',
          code: 'CS100',
          name: '计算机导论',
        },
      },
    ])

    await expectCourseSelectionError(
      enrollmentService.createEnrollment('student-1', { courseOfferingId: 'offering-1' }),
      COURSE_SELECTION_ERROR_CODES.PREREQUISITE_NOT_MET,
      422
    )
  })
})

describe('enrollmentService.dropEnrollment', () => {
  it('rejects drop when the enrollment does not exist', async () => {
    prismaMock.enrollment.findUnique.mockResolvedValueOnce(null)

    await expectCourseSelectionError(
      enrollmentService.dropEnrollment('student-1', 'missing-enrollment', {}),
      COURSE_SELECTION_ERROR_CODES.ENROLLMENT_NOT_FOUND,
      404
    )
    expect(prismaMock.enrollment.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('marks own enrolled record as dropped and decrements offering count', async () => {
    prismaMock.enrollment.findUnique
      .mockResolvedValueOnce({
        ...buildEnrollment(),
        courseOffering: buildOffering({ schedules: undefined }),
      })
      .mockResolvedValueOnce(
        buildEnrollment({
          status: EnrollmentStatus.DROPPED,
          droppedAt: now,
        })
      )
    prismaMock.courseOffering.findUnique.mockResolvedValueOnce(
      buildOffering({ enrolledCount: 9, schedules: undefined })
    )

    const result = await enrollmentService.dropEnrollment('student-1', 'enrollment-1', {
      clientRequestId: 'drop-1',
      reason: '课表调整',
    })

    expect(prismaMock.enrollment.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'enrollment-1',
        studentId: 'student-1',
        status: EnrollmentStatus.ENROLLED,
      },
      data: {
        status: EnrollmentStatus.DROPPED,
        droppedAt: now,
      },
    })
    expect(prismaMock.courseOffering.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'offering-1',
        enrolledCount: { gt: 0 },
      },
      data: { enrolledCount: { decrement: 1 } },
    })
    expect(result.enrollment.status).toBe('dropped')
    expect(result.courseOffering.enrolledCount).toBe(9)
  })

  it('rejects drop when the active period does not allow dropping', async () => {
    prismaMock.enrollment.findUnique.mockResolvedValueOnce({
      ...buildEnrollment(),
      courseOffering: buildOffering({ schedules: undefined }),
    })
    prismaMock.selectionPeriod.findFirst.mockResolvedValueOnce(
      buildPeriod({ phase: SelectionPhase.FIRST_ROUND })
    )

    await expectCourseSelectionError(
      enrollmentService.dropEnrollment('student-1', 'enrollment-1', {}),
      COURSE_SELECTION_ERROR_CODES.PERIOD_CLOSED,
      422
    )
    expect(prismaMock.enrollment.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('rejects drop when enrollment is not currently enrolled', async () => {
    prismaMock.enrollment.findUnique.mockResolvedValueOnce({
      ...buildEnrollment({ status: EnrollmentStatus.DROPPED }),
      courseOffering: buildOffering({ schedules: undefined }),
    })

    await expectCourseSelectionError(
      enrollmentService.dropEnrollment('student-1', 'enrollment-1', {}),
      COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED,
      422
    )
    expect(prismaMock.enrollment.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('rejects drop when decrement would make enrolled count negative', async () => {
    prismaMock.enrollment.findUnique.mockResolvedValueOnce({
      ...buildEnrollment(),
      courseOffering: buildOffering({ schedules: undefined }),
    })
    prismaMock.courseOffering.updateMany.mockResolvedValueOnce({ count: 0 })

    await expectCourseSelectionError(
      enrollmentService.dropEnrollment('student-1', 'enrollment-1', {}),
      COURSE_SELECTION_ERROR_CODES.VALIDATION_FAILED,
      422
    )
    expect(prismaMock.enrollment.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'enrollment-1',
        studentId: 'student-1',
        status: EnrollmentStatus.ENROLLED,
      },
      data: {
        status: EnrollmentStatus.DROPPED,
        droppedAt: now,
      },
    })
    expect(prismaMock.courseOffering.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'offering-1',
        enrolledCount: { gt: 0 },
      },
      data: { enrolledCount: { decrement: 1 } },
    })
  })

  it('returns already dropped enrollment for idempotent drop without decrementing again', async () => {
    prismaMock.enrollment.findUnique.mockResolvedValueOnce({
      ...buildEnrollment({ status: EnrollmentStatus.DROPPED, droppedAt: now }),
      courseOffering: buildOffering({ schedules: undefined }),
    })

    const result = await enrollmentService.dropEnrollment('student-1', 'enrollment-1', {
      clientRequestId: 'drop-1',
    })

    expect(result.enrollment.status).toBe('dropped')
    expect(prismaMock.enrollment.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('returns dropped enrollment for idempotent drop races without decrementing again', async () => {
    prismaMock.enrollment.findUnique
      .mockResolvedValueOnce({
        ...buildEnrollment(),
        courseOffering: buildOffering({ schedules: undefined }),
      })
      .mockResolvedValueOnce({
        ...buildEnrollment({ status: EnrollmentStatus.DROPPED, droppedAt: now }),
        courseOffering: buildOffering({ enrolledCount: 9, schedules: undefined }),
      })
    prismaMock.enrollment.updateMany.mockResolvedValueOnce({ count: 0 })

    const result = await enrollmentService.dropEnrollment('student-1', 'enrollment-1', {
      clientRequestId: 'drop-1',
    })

    expect(result.enrollment.status).toBe('dropped')
    expect(result.courseOffering.enrolledCount).toBe(9)
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })

  it('rejects dropping another student enrollment', async () => {
    prismaMock.enrollment.findUnique.mockResolvedValueOnce({
      ...buildEnrollment({ studentId: 'student-2' }),
      courseOffering: buildOffering({ schedules: undefined }),
    })

    await expectCourseSelectionError(
      enrollmentService.dropEnrollment('student-1', 'enrollment-1', {}),
      COURSE_SELECTION_ERROR_CODES.FORBIDDEN,
      403
    )
    expect(prismaMock.enrollment.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.courseOffering.updateMany).not.toHaveBeenCalled()
  })
})
