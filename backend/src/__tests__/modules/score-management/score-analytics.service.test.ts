import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForbiddenError, NotFoundError } from '@stss/shared'

const prismaMock = vi.hoisted(() => ({
  courseOffering: {
    findUnique: vi.fn(),
  },
  enrollment: {
    count: vi.fn(),
  },
  score: {
    findMany: vi.fn(),
  },
  student: {
    findUnique: vi.fn(),
  },
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

import { scoreAnalyticsService } from '../../../modules/score-management/score-analytics.service.js'

describe('scoreAnalyticsService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getCourseScoreAnalytics', () => {
    it('teacher should query own course analytics', async () => {
      prismaMock.courseOffering.findUnique.mockResolvedValue({
        id: 'off-1',
        teacherId: 'tea-1',
        course: { name: 'Data Structure' },
        teacher: { user: { realName: 'Teacher A' } },
      })
      prismaMock.enrollment.count.mockResolvedValue(3)
      prismaMock.score.findMany.mockResolvedValue([
        {
          totalScore: 95,
          studentId: 'stu-1',
          student: { studentNumber: '2021001', user: { realName: 'A' } },
        },
        {
          totalScore: 80,
          studentId: 'stu-2',
          student: { studentNumber: '2021002', user: { realName: 'B' } },
        },
      ])

      const result = await scoreAnalyticsService.getCourseScoreAnalytics(
        { userId: 'tea-1', roles: ['teacher'] },
        'off-1'
      )

      expect(result.courseName).toBe('Data Structure')
      expect(result.totalStudents).toBe(3)
      expect(result.submittedCount).toBe(2)
      expect(result.averageScore).toBe(87.5)
      expect(result.rankingTop10[0].rank).toBe(1)
    })

    it('teacher should be forbidden for others course', async () => {
      prismaMock.courseOffering.findUnique.mockResolvedValue({
        id: 'off-1',
        teacherId: 'tea-2',
        course: { name: 'Data Structure' },
        teacher: { user: { realName: 'Teacher B' } },
      })

      await expect(
        scoreAnalyticsService.getCourseScoreAnalytics(
          { userId: 'tea-1', roles: ['teacher'] },
          'off-1'
        )
      ).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  describe('getStudentScoreAnalytics', () => {
    it('student should query own analytics', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        userId: 'stu-1',
        user: { realName: 'Student A' },
      })
      prismaMock.score.findMany.mockResolvedValue([
        {
          totalScore: 95,
          gradePoint: 4,
          courseOffering: {
            course: { courseType: 'REQUIRED', credits: 3 },
            semester: { id: 'sem-1', name: '2025-2026-1', startDate: new Date('2025-09-01') },
          },
        },
        {
          totalScore: 85,
          gradePoint: 3.7,
          courseOffering: {
            course: { courseType: 'ELECTIVE', credits: 2 },
            semester: { id: 'sem-2', name: '2025-2026-2', startDate: new Date('2026-02-20') },
          },
        },
      ])

      const result = await scoreAnalyticsService.getStudentScoreAnalytics(
        { userId: 'stu-1', roles: ['student'] },
        'stu-1'
      )

      expect(result.studentName).toBe('Student A')
      expect(result.semesterTrend).toHaveLength(2)
      expect(result.scoreDistribution).toHaveLength(5)
      expect(result.courseTypeBreakdown).toHaveLength(2)
    })

    it('student querying other student should fail', async () => {
      await expect(
        scoreAnalyticsService.getStudentScoreAnalytics(
          { userId: 'stu-1', roles: ['student'] },
          'stu-2'
        )
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('missing student should throw not found', async () => {
      prismaMock.student.findUnique.mockResolvedValue(null)

      await expect(
        scoreAnalyticsService.getStudentScoreAnalytics(
          { userId: 'admin-1', roles: ['admin'] },
          'stu-9'
        )
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
