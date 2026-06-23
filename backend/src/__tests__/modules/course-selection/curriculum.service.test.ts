import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  student: {
    findUnique: vi.fn(),
  },
  curriculum: {
    findMany: vi.fn(),
  },
  curriculumCourse: {
    findMany: vi.fn(),
  },
  studentCurriculumConfirmation: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  semester: {
    findUnique: vi.fn(),
  },
  score: {
    findMany: vi.fn(),
  },
  enrollment: {
    findMany: vi.fn(),
  },
  courseOffering: {
    findUnique: vi.fn(),
  },
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

import { curriculumService } from '../../../modules/course-selection/curriculum.service.js'

const buildStudent = () => ({
  userId: 'student-1',
  majorId: 'major-1',
  grade: 2024,
  major: {
    id: 'major-1',
    name: '软件工程',
    code: 'SE',
  },
})

const buildCurriculum = (overrides: Record<string, unknown> = {}) => ({
  id: 'curriculum-1',
  majorId: 'major-1',
  name: '软件工程 2024 级培养方案',
  year: 2024,
  totalCredits: 160,
  requiredCredits: 100,
  electiveCredits: 40,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-02-01T00:00:00.000Z'),
  ...overrides,
})

beforeEach(() => {
  vi.resetAllMocks()

  prismaMock.student.findUnique.mockResolvedValue(buildStudent())
  prismaMock.curriculum.findMany.mockResolvedValue([buildCurriculum()])
  prismaMock.curriculumCourse.findMany.mockResolvedValue([])
  prismaMock.studentCurriculumConfirmation.findUnique.mockResolvedValue(null)
  prismaMock.studentCurriculumConfirmation.upsert.mockResolvedValue({
    confirmedAt: new Date('2026-03-01T00:00:00.000Z'),
  })
  prismaMock.semester.findUnique.mockResolvedValue({
    id: 'semester-1',
    endDate: new Date('2026-07-10T00:00:00.000Z'),
  })
  prismaMock.score.findMany.mockResolvedValue([])
  prismaMock.enrollment.findMany.mockResolvedValue([])
})

describe('curriculumService confirmation', () => {
  it('returns unconfirmed status when no confirmation record exists', async () => {
    const result = await curriculumService.getMyCurriculum('student-1', {
      includeCourses: false,
    })

    expect(result).not.toBeTypeOf('string')
    if (typeof result === 'string') {
      throw new Error(result)
    }

    expect(result.confirmation).toEqual({
      requiredBeforeSelection: true,
      confirmed: false,
      confirmedAt: null,
      message: '请先确认当前培养方案后再进入正式选课流程。',
    })
  })

  it('creates or refreshes the current curriculum confirmation', async () => {
    const result = await curriculumService.confirmMyCurriculum('student-1', {
      curriculumId: 'curriculum-1',
    })

    expect(result).not.toBeTypeOf('string')
    if (typeof result === 'string') {
      throw new Error(result)
    }

    expect(prismaMock.studentCurriculumConfirmation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId_curriculumId: {
            studentId: 'student-1',
            curriculumId: 'curriculum-1',
          },
        },
      })
    )
    expect(result.confirmation.confirmed).toBe(true)
  })

  it('treats stale confirmation as not confirmed after curriculum update', async () => {
    prismaMock.studentCurriculumConfirmation.findUnique.mockResolvedValueOnce({
      confirmedAt: new Date('2026-01-15T00:00:00.000Z'),
    })

    const result = await curriculumService.getMyCurriculum('student-1', {
      includeCourses: false,
    })

    expect(result).not.toBeTypeOf('string')
    if (typeof result === 'string') {
      throw new Error(result)
    }

    expect(result.confirmation.confirmed).toBe(false)
    expect(result.confirmation.confirmedAt).toBeNull()
  })

  it('rejects confirming a curriculum that does not match the current student', async () => {
    const result = await curriculumService.confirmMyCurriculum('student-1', {
      curriculumId: 'other-curriculum',
    })

    expect(result).toBe('提交的培养方案与当前学生匹配培养方案不一致')
    expect(prismaMock.studentCurriculumConfirmation.upsert).not.toHaveBeenCalled()
  })

  it('counts effective passed scores before current in-progress enrollments for progress', async () => {
    prismaMock.score.findMany.mockResolvedValueOnce([
      {
        id: 'score-required',
        totalScore: 86,
        enteredAt: new Date('2026-01-01T00:00:00.000Z'),
        modifiedAt: null,
        courseOffering: {
          course: {
            id: 'course-required',
            credits: 4,
            courseType: 'REQUIRED',
          },
        },
      },
      {
        id: 'score-failed',
        totalScore: 55,
        enteredAt: new Date('2026-01-01T00:00:00.000Z'),
        modifiedAt: null,
        courseOffering: {
          course: {
            id: 'course-failed',
            credits: 3,
            courseType: 'ELECTIVE',
          },
        },
      },
    ])
    prismaMock.enrollment.findMany.mockResolvedValueOnce([
      {
        courseOffering: {
          course: {
            id: 'course-elective',
            credits: 3,
            courseType: 'ELECTIVE',
          },
        },
      },
      {
        courseOffering: {
          course: {
            id: 'course-required',
            credits: 4,
            courseType: 'REQUIRED',
          },
        },
      },
    ])

    const result = await curriculumService.getMyCurriculumProgress('student-1', {})

    expect(result).not.toBeTypeOf('string')
    if (typeof result === 'string') {
      throw new Error(result)
    }

    expect(result.selected).toMatchObject({
      totalCredits: 7,
      requiredCredits: 4,
      electiveCredits: 3,
    })
    expect(result.byCourseType).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ courseType: 'required', selectedCredits: 4, courseCount: 1 }),
        expect.objectContaining({ courseType: 'elective', selectedCredits: 3, courseCount: 1 }),
      ])
    )
  })
})
