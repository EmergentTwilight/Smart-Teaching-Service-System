import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForbiddenError, NotFoundError } from '@stss/shared'

const prismaMock = vi.hoisted(() => ({
  admin: {
    findUnique: vi.fn(),
  },
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
    prismaMock.admin.findUnique.mockResolvedValue({ adminType: 'SUPER', departmentId: null })
  })

  describe('getCourseScoreAnalytics', () => {
    it('teacher should query own course analytics', async () => {
      prismaMock.courseOffering.findUnique.mockResolvedValue({
        id: 'off-1',
        teacherId: 'tea-1',
        course: { name: 'Data Structure', departmentId: 'dept-1' },
        teacher: { user: { realName: 'Teacher A' } },
      })
      prismaMock.enrollment.count.mockResolvedValue(3)
      prismaMock.score.findMany.mockResolvedValue([
        {
          id: 'score-1',
          totalScore: 95,
          studentId: 'stu-1',
          student: { studentNumber: '2021001', user: { realName: 'A' } },
        },
        {
          id: 'score-2',
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
        course: { name: 'Data Structure', departmentId: 'dept-1' },
        teacher: { user: { realName: 'Teacher B' } },
      })

      await expect(
        scoreAnalyticsService.getCourseScoreAnalytics(
          { userId: 'tea-1', roles: ['teacher'] },
          'off-1'
        )
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('academic admin should be forbidden for other department course analytics', async () => {
      prismaMock.courseOffering.findUnique.mockResolvedValue({
        id: 'off-1',
        teacherId: 'tea-1',
        course: { name: 'Data Structure', departmentId: 'dept-2' },
        teacher: { user: { realName: 'Teacher A' } },
      })
      prismaMock.admin.findUnique.mockResolvedValue({
        adminType: 'ACADEMIC',
        departmentId: 'dept-1',
      })

      await expect(
        scoreAnalyticsService.getCourseScoreAnalytics(
          { userId: 'admin-1', roles: ['admin'] },
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
          id: 'score-1',
          totalScore: 95,
          gradePoint: 4,
          enteredAt: new Date('2026-01-01'),
          modifiedAt: null,
          courseOffering: {
            courseId: 'course-1',
            course: { id: 'course-1', courseType: 'REQUIRED', credits: 3 },
            semester: { id: 'sem-1', name: '2025-2026-1', startDate: new Date('2025-09-01') },
          },
        },
        {
          id: 'score-2',
          totalScore: 78,
          gradePoint: 3,
          enteredAt: new Date('2026-06-01'),
          modifiedAt: null,
          courseOffering: {
            courseId: 'course-1',
            course: { id: 'course-1', courseType: 'REQUIRED', credits: 3 },
            semester: { id: 'sem-2', name: '2025-2026-2', startDate: new Date('2026-02-20') },
          },
        },
        {
          id: 'score-3',
          totalScore: 85,
          gradePoint: 3.7,
          enteredAt: new Date('2026-06-01'),
          modifiedAt: null,
          courseOffering: {
            courseId: 'course-2',
            course: { id: 'course-2', courseType: 'ELECTIVE', credits: 2 },
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
      expect(result.semesterTrend[0].averageScore).toBe(95)
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
