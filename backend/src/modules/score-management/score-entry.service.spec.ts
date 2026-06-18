import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scoreEntryService } from './score-entry.service.js'
import { ForbiddenError } from '@stss/shared'
import prisma from '../../shared/prisma/client.js'

// mock prisma
vi.mock('../../shared/prisma/client.js', () => ({
  default: {
    teacher: { findUnique: vi.fn() },
    courseOffering: { findUnique: vi.fn() },
    enrollment: { findMany: vi.fn(), findUnique: vi.fn() },
    score: { upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  },
}))

describe('scoreEntryService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('saveDraft', () => {
    it('教师操作自己的课程 - 正常保存', async () => {
      // 模拟教师存在
      vi.mocked(prisma.teacher.findUnique).mockResolvedValue({ userId: 'u1' } as never)
      vi.mocked(prisma.courseOffering.findUnique).mockResolvedValue({
        id: 'co1',
        teacherId: 'u1',
      } as never)
      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
        id: 'e1',
        courseOfferingId: 'co1',
        studentId: 's1',
        score: null,
      } as never)
      vi.mocked(prisma.score.upsert).mockResolvedValue({} as never)

      const result = await scoreEntryService.saveDraft(
        'co1',
        { scores: [{ enrollmentId: 'e1', usualScore: 80, midtermScore: 70, finalScore: 85 }] },
        'u1',
        ['teacher']
      )

      expect(result.savedCount).toBe(1)
      expect(result.skippedCount).toBe(0)
    })

    it('已提交成绩不能再保存草稿 - 应跳过', async () => {
      vi.mocked(prisma.teacher.findUnique).mockResolvedValue({ userId: 'u1' } as never)
      vi.mocked(prisma.courseOffering.findUnique).mockResolvedValue({
        id: 'co1',
        teacherId: 'u1',
      } as never)
      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
        id: 'e1',
        courseOfferingId: 'co1',
        studentId: 's1',
        score: { status: 'SUBMITTED' },
      } as never)

      const result = await scoreEntryService.saveDraft(
        'co1',
        { scores: [{ enrollmentId: 'e1', usualScore: 80 }] },
        'u1',
        ['teacher']
      )

      expect(result.skippedCount).toBe(1)
      expect(prisma.score.upsert).not.toHaveBeenCalled()
    })

    it('教师操作别人的课程 - 应抛出 ForbiddenError', async () => {
      vi.mocked(prisma.teacher.findUnique).mockResolvedValue({ userId: 'u1' } as never)
      // teacherId 是 't2'，不是当前教师
      vi.mocked(prisma.courseOffering.findUnique).mockResolvedValue({
        id: 'co1',
        teacherId: 't2',
      } as never)

      await expect(
        scoreEntryService.saveDraft('co1', { scores: [] }, 'u1', ['teacher'])
      ).rejects.toThrow(ForbiddenError)
    })
  })

  describe('submitScores', () => {
    it('只有 DRAFT 状态才能提交', async () => {
      vi.mocked(prisma.teacher.findUnique).mockResolvedValue({ userId: 'u1' } as never)
      vi.mocked(prisma.courseOffering.findUnique).mockResolvedValue({
        id: 'co1',
        teacherId: 'u1',
      } as never)
      vi.mocked(prisma.score.findUnique).mockResolvedValue({
        id: 'sc1',
        courseOfferingId: 'co1',
        status: 'SUBMITTED', // 已经提交过了
      } as never)

      const result = await scoreEntryService.submitScores('co1', { scoreIds: ['sc1'] }, 'u1', [
        'teacher',
      ])

      expect(result.skippedCount).toBe(1)
      expect(prisma.score.update).not.toHaveBeenCalled()
    })
  })
})
