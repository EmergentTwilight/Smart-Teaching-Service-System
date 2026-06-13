import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForbiddenError, NotFoundError } from '@stss/shared'

const prismaMock = vi.hoisted(() => ({
  score: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  enrollment: {
    findMany: vi.fn(),
  },
  student: {
    findUnique: vi.fn(),
  },
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

import { scoreQueryService } from '../../../modules/score-management/score-query.service.js'

describe('scoreQueryService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getMyScores', () => {
    it('student should get own scores with pagination', async () => {
      const visibleScores = [
        {
          id: 'score-1',
          enrollmentId: 'enr-1',
          courseOfferingId: 'off-1',
          usualScore: 30,
          midtermScore: 25,
          finalScore: 40,
          totalScore: 95,
          gradePoint: 4,
          gradeLetter: 'A',
          status: 'SUBMITTED',
          modificationRequest: null,
          enteredAt: new Date('2026-01-01'),
          modifiedAt: null,
          enrollment: {},
          courseOffering: {
            courseId: 'course-1',
            semesterId: 'sem-1',
            course: {
              id: 'course-1',
              code: 'CS101',
              name: 'Data Structure',
              credits: 3,
              courseType: 'REQUIRED',
            },
            semester: {
              name: '2025-2026-1',
            },
          },
        },
      ]

      prismaMock.score.findMany.mockResolvedValueOnce(visibleScores).mockResolvedValueOnce([
        {
          id: 'score-1',
          totalScore: 95,
          enteredAt: new Date('2026-01-01'),
          modifiedAt: null,
          courseOffering: {
            courseId: 'course-1',
            course: {
              id: 'course-1',
            },
          },
        },
      ])
      prismaMock.score.count.mockResolvedValue(1)

      const result = await scoreQueryService.getMyScores(
        { userId: 'stu-1', roles: ['student'] },
        { page: 1, pageSize: 20 }
      )

      expect(result.items).toHaveLength(1)
      expect(result.items[0].courseName).toBe('Data Structure')
      expect(result.items[0].isEffective).toBe(true)
      expect(result.pagination.total).toBe(1)
      expect(prismaMock.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            studentId: 'stu-1',
            status: {
              in: ['SUBMITTED', 'CONFIRMED'],
            },
          },
        })
      )
    })

    it('admin should be forbidden on /students/me/scores', async () => {
      await expect(
        scoreQueryService.getMyScores(
          { userId: 'admin-1', roles: ['admin'] },
          { page: 1, pageSize: 20 }
        )
      ).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  describe('getStudentScoreSummary', () => {
    it('student should get own summary', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        userId: 'stu-1',
        grade: 2023,
        user: { realName: 'Alice' },
        major: {
          name: 'CS',
          curriculums: [
            {
              id: 'cur-1',
              name: 'CS 2023',
              totalCredits: 120,
              requiredCredits: 90,
              electiveCredits: 30,
              courses: [
                { courseId: 'course-1', courseType: 'REQUIRED' },
                { courseId: 'course-3', courseType: 'ELECTIVE' },
              ],
            },
          ],
        },
      })

      prismaMock.score.findMany.mockResolvedValue([
        {
          id: 'score-1',
          totalScore: 95,
          gradePoint: 4,
          status: 'SUBMITTED',
          enteredAt: new Date('2026-01-01'),
          modifiedAt: null,
          courseOffering: {
            courseId: 'course-1',
            course: {
              id: 'course-1',
              credits: 3,
              courseType: 'REQUIRED',
            },
          },
        },
        {
          id: 'score-2',
          totalScore: 88,
          gradePoint: 3.7,
          status: 'SUBMITTED',
          enteredAt: new Date('2026-06-01'),
          modifiedAt: null,
          courseOffering: {
            courseId: 'course-1',
            course: {
              id: 'course-1',
              credits: 3,
              courseType: 'REQUIRED',
            },
          },
        },
        {
          id: 'score-3',
          totalScore: 55,
          gradePoint: 1,
          status: 'SUBMITTED',
          enteredAt: new Date('2026-01-01'),
          modifiedAt: null,
          courseOffering: {
            courseId: 'course-2',
            course: {
              id: 'course-2',
              credits: 2,
              courseType: 'ELECTIVE',
            },
          },
        },
      ])
      prismaMock.enrollment.findMany.mockResolvedValue([
        {
          courseOffering: {
            course: {
              id: 'course-3',
              credits: 4,
            },
          },
        },
      ])

      const result = await scoreQueryService.getStudentScoreSummary(
        { userId: 'stu-1', roles: ['student'] },
        'stu-1'
      )

      expect(result.studentName).toBe('Alice')
      expect(result.passedCourseCount).toBe(1)
      expect(result.failedCourseCount).toBe(1)
      expect(result.averageScore).toBe(75)
      expect(result.gpa).toBe(2.8)
      expect(result.inProgressCredits).toBe(4)
      expect(result.curriculumProgress.passedCredits).toBe(3)
      expect(result.curriculumProgress.remainingRequiredCredits).toBe(117)
    })

    it('missing student should throw not found', async () => {
      prismaMock.student.findUnique.mockResolvedValue(null)

      await expect(
        scoreQueryService.getStudentScoreSummary({ userId: 'stu-1', roles: ['student'] }, 'stu-1')
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
