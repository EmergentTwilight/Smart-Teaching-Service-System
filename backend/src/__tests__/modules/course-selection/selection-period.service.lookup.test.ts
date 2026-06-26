import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  admin: {
    findUnique: vi.fn(),
  },
  student: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  courseOffering: {
    findMany: vi.fn(),
  },
}))

vi.mock('@prisma/client', () => ({
  AdminType: {
    ACADEMIC: 'ACADEMIC',
    SUPER: 'SUPER',
  },
  CourseStatus: {
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED',
  },
  EnrollmentStatus: {
    ENROLLED: 'ENROLLED',
    DROPPED: 'DROPPED',
    WITHDRAWN: 'WITHDRAWN',
  },
  OfferingStatus: {
    PLANNED: 'PLANNED',
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
    CANCELLED: 'CANCELLED',
  },
  SelectionPhase: {
    FIRST_ROUND: 'FIRST_ROUND',
    SECOND_ROUND: 'SECOND_ROUND',
    ADJUSTMENT: 'ADJUSTMENT',
  },
  SemesterStatus: {
    CURRENT: 'CURRENT',
    ARCHIVED: 'ARCHIVED',
  },
  UserStatus: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    BANNED: 'BANNED',
  },
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

import { selectionPeriodService } from '../../../modules/course-selection/selection-period.service.js'

beforeEach(() => {
  vi.resetAllMocks()
  prismaMock.admin.findUnique.mockResolvedValue({ adminType: 'ACADEMIC' })
})

describe('selectionPeriodService manual enrollment lookup', () => {
  it('returns student candidates for academic admin searches', async () => {
    prismaMock.student.count.mockResolvedValue(1)
    prismaMock.student.findMany.mockResolvedValue([
      {
        userId: 'student-user-1',
        studentNumber: 'CMAN202601',
        grade: 2026,
        className: 'CS-1',
        user: {
          username: 'cstudent01',
          realName: 'C Manual Student 01',
        },
        major: {
          name: 'Computer Science',
        },
      },
    ])

    const result = await selectionPeriodService.listManualEnrollmentStudents('academic-admin', {
      keyword: 'cstudent01',
      page: 1,
      pageSize: 10,
    })

    expect(prismaMock.admin.findUnique).toHaveBeenCalledWith({
      where: { userId: 'academic-admin' },
      select: { adminType: true },
    })
    expect(prismaMock.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { studentNumber: { contains: 'cstudent01', mode: 'insensitive' } },
          ]),
        }),
      })
    )
    expect(result.items).toEqual([
      {
        studentId: 'student-user-1',
        studentNumber: 'CMAN202601',
        username: 'cstudent01',
        realName: 'C Manual Student 01',
        majorName: 'Computer Science',
        grade: 2026,
        className: 'CS-1',
      },
    ])
  })

  it('returns only non-full active course offering candidates', async () => {
    prismaMock.courseOffering.findMany.mockResolvedValue([
      {
        id: 'offering-open',
        course: {
          code: 'CMAN-CS302',
          name: 'Operating Systems',
          credits: 4,
        },
        semester: {
          id: 'semester-1',
          name: '2026 Spring',
        },
        teacherId: 'teacher-1',
        teacher: {
          teacherNumber: 'T001',
          user: {
            realName: 'Ada Teacher',
          },
        },
        capacity: 40,
        enrolledCount: 10,
        status: 'OPEN',
        schedules: [
          {
            dayOfWeek: 2,
            startWeek: 1,
            endWeek: 16,
            startPeriod: 5,
            endPeriod: 6,
            classroom: {
              campus: 'Main',
              building: 'B1',
              roomNumber: '201',
            },
          },
        ],
      },
      {
        id: 'offering-full',
        course: {
          code: 'CMAN-CS303',
          name: 'Database Systems',
          credits: 3,
        },
        semester: {
          id: 'semester-1',
          name: '2026 Spring',
        },
        teacherId: 'teacher-2',
        teacher: {
          teacherNumber: 'T002',
          user: {
            realName: 'Grace Teacher',
          },
        },
        capacity: 30,
        enrolledCount: 30,
        status: 'OPEN',
        schedules: [],
      },
    ])

    const result = await selectionPeriodService.listManualEnrollmentCourseOfferings('academic-admin', {
      keyword: 'CMAN',
      page: 1,
      pageSize: 10,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      courseOfferingId: 'offering-open',
      courseCode: 'CMAN-CS302',
      courseName: 'Operating Systems',
      remainingCapacity: 30,
      status: 'open',
      scheduleSummary: ['周2 第5-6节 第1-16周 Main B1 201'],
    })
  })

  it('rejects lookup for non-academic admins', async () => {
    prismaMock.admin.findUnique.mockResolvedValue({ adminType: 'SUPER' })

    await expect(
      selectionPeriodService.listManualEnrollmentStudents('system-admin', {
        keyword: 'student',
        page: 1,
        pageSize: 10,
      })
    ).rejects.toThrow('仅教务管理人员可执行该操作')
  })
})
