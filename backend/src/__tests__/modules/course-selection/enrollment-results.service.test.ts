import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  enrollment: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  score: {
    findMany: vi.fn(),
  },
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

import { enrollmentResultsService } from '../../../modules/course-selection/enrollment-results.service.js'

const buildEnrollmentRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'enrollment-1',
  status: 'ENROLLED',
  enrolledAt: new Date('2026-03-01T00:00:00.000Z'),
  droppedAt: null,
  courseOffering: {
    id: 'offering-1',
    course: {
      id: 'course-1',
      code: 'CS101',
      name: '程序设计基础',
      credits: 4,
      courseType: 'REQUIRED',
    },
    teacher: {
      user: {
        realName: '王老师',
      },
    },
    semester: {
      name: '2026 春季',
    },
  },
  ...overrides,
})

beforeEach(() => {
  vi.resetAllMocks()

  prismaMock.enrollment.count.mockResolvedValue(3)
  prismaMock.enrollment.findMany.mockResolvedValueOnce([
    buildEnrollmentRow(),
    buildEnrollmentRow({
      id: 'enrollment-2',
      courseOffering: {
        id: 'offering-2',
        course: {
          id: 'course-2',
          code: 'CS102',
          name: '数据结构',
          credits: 4,
          courseType: 'REQUIRED',
        },
        teacher: {
          user: {
            realName: '李老师',
          },
        },
        semester: {
          name: '2026 春季',
        },
      },
    }),
    buildEnrollmentRow({
      id: 'enrollment-3',
      status: 'DROPPED',
      droppedAt: new Date('2026-03-08T00:00:00.000Z'),
      courseOffering: {
        id: 'offering-3',
        course: {
          id: 'course-3',
          code: 'CS103',
          name: '离散数学',
          credits: 3,
          courseType: 'REQUIRED',
        },
        teacher: {
          user: {
            realName: '赵老师',
          },
        },
        semester: {
          name: '2026 春季',
        },
      },
    }),
  ])
  prismaMock.enrollment.findMany.mockResolvedValueOnce([
    buildEnrollmentRow(),
    buildEnrollmentRow({
      id: 'enrollment-2',
      courseOffering: {
        id: 'offering-2',
        course: {
          id: 'course-2',
          code: 'CS102',
          name: '数据结构',
          credits: 4,
          courseType: 'REQUIRED',
        },
        teacher: {
          user: {
            realName: '李老师',
          },
        },
        semester: {
          name: '2026 春季',
        },
      },
    }),
  ])
  prismaMock.score.findMany.mockResolvedValue([
    {
      id: 'score-1',
      totalScore: 86,
      enteredAt: new Date('2026-07-01T00:00:00.000Z'),
      modifiedAt: null,
      courseOffering: {
        course: {
          id: 'course-1',
        },
      },
    },
  ])
})

describe('enrollmentResultsService.listMyEnrollments', () => {
  it('marks completed, in-progress, and dropped enrollment records without trusting frontend state', async () => {
    const result = await enrollmentResultsService.listMyEnrollments('student-1', {
      page: 1,
      pageSize: 20,
    })

    expect(result.items).toEqual([
      expect.objectContaining({
        enrollmentId: 'enrollment-1',
        status: 'enrolled',
        studyStatus: 'completed',
      }),
      expect.objectContaining({
        enrollmentId: 'enrollment-2',
        status: 'enrolled',
        studyStatus: 'in_progress',
      }),
      expect.objectContaining({
        enrollmentId: 'enrollment-3',
        status: 'dropped',
        studyStatus: 'not_started',
      }),
    ])
    expect(result.summary).toEqual({
      enrolledCount: 2,
      enrolledCredits: 8,
    })
    expect(prismaMock.score.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: 'student-1',
          courseOffering: {
            courseId: {
              in: ['course-1', 'course-2', 'course-3'],
            },
          },
        }),
      })
    )
  })
})
