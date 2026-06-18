import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError, ForbiddenError, ValidationError } from '@stss/shared'

const APPLICANT_ID = '11111111-1111-4111-8111-111111111111'
const APPROVER_ID = '22222222-2222-4222-8222-222222222222'

const txMock = vi.hoisted(() => ({
  score: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  scoreModificationLog: {
    create: vi.fn(),
  },
  systemLog: {
    create: vi.fn(),
  },
}))

const prismaMock = vi.hoisted(() => ({
  score: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  scoreModificationLog: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

import { scoreModificationService } from '../../../modules/score-management/score-modification.service.js'
import { scoreModificationController } from '../../../modules/score-management/score-modification.controller.js'
import {
  createScoreModificationRequestSchema,
  scoreModificationRequestPayloadSchema,
} from '../../../modules/score-management/score-modification.schemas.js'

const requestPayload = (proposedChanges: Record<string, number>) =>
  JSON.stringify({
    proposedChanges,
    reason: '录入错误',
    applicantId: APPLICANT_ID,
    appliedAt: '2026-06-10T08:00:00.000Z',
  })

describe('scoreModificationService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    prismaMock.$transaction.mockImplementation(async (callback) => callback(txMock))
    txMock.score.updateMany.mockResolvedValue({ count: 1 })
    txMock.scoreModificationLog.create.mockResolvedValue({})
    txMock.systemLog.create.mockResolvedValue({})
  })

  it('creates a pending request without directly changing score fields', async () => {
    prismaMock.score.findUnique.mockResolvedValue({
      id: 'score-1',
      status: 'SUBMITTED',
      enteredBy: APPLICANT_ID,
      modificationRequest: null,
      courseOffering: { teacherId: APPLICANT_ID },
    })

    await scoreModificationService.createModificationRequest('score-1', APPLICANT_ID, ['teacher'], {
      proposedChanges: { finalScore: 90 },
      reason: '录入错误',
    })

    expect(txMock.score.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          modificationRequest: expect.any(String),
        },
      })
    )
    expect(txMock.systemLog.create).toHaveBeenCalledOnce()
  })

  it('rejects modification requests for draft scores and duplicate pending requests', async () => {
    prismaMock.score.findUnique.mockResolvedValueOnce({
      id: 'score-1',
      status: 'DRAFT',
      enteredBy: APPLICANT_ID,
      modificationRequest: null,
      courseOffering: { teacherId: APPLICANT_ID },
    })

    await expect(
      scoreModificationService.createModificationRequest('score-1', APPLICANT_ID, ['teacher'], {
        proposedChanges: { finalScore: 90 },
        reason: '录入错误',
      })
    ).rejects.toBeInstanceOf(ValidationError)

    prismaMock.score.findUnique.mockResolvedValueOnce({
      id: 'score-1',
      status: 'SUBMITTED',
      enteredBy: APPLICANT_ID,
      modificationRequest: requestPayload({ finalScore: 90 }),
      courseOffering: { teacherId: APPLICANT_ID },
    })

    await expect(
      scoreModificationService.createModificationRequest('score-1', APPLICANT_ID, ['teacher'], {
        proposedChanges: { finalScore: 90 },
        reason: '录入错误',
      })
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('recomputes derived values, confirms score, and writes both logs on approval', async () => {
    txMock.score.findUnique.mockResolvedValue({
      id: 'score-1',
      status: 'SUBMITTED',
      modificationRequest: requestPayload({ finalScore: 100 }),
      usualScore: 80,
      midtermScore: 90,
      finalScore: 70,
      totalScore: 77,
      gradePoint: 2.7,
      gradeLetter: 'C',
    })

    const result = await scoreModificationService.approveModificationRequest(
      'score-1',
      APPROVER_ID,
      ['admin'],
      { comment: '同意' }
    )

    expect(txMock.score.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          usualScore: 80,
          midtermScore: 90,
          finalScore: 100,
          totalScore: 92,
          gradePoint: 4,
          gradeLetter: 'A',
          status: 'CONFIRMED',
          modifiedBy: APPROVER_ID,
          modificationRequest: null,
        }),
      })
    )
    expect(txMock.scoreModificationLog.create).toHaveBeenCalledOnce()
    expect(txMock.systemLog.create).toHaveBeenCalledOnce()
    expect(result.status).toBe('CONFIRMED')
    expect(result.newValue.totalScore).toBe(92)
  })

  it('rejects stored requests that attempt to modify total score directly', async () => {
    txMock.score.findUnique.mockResolvedValue({
      id: 'score-1',
      status: 'CONFIRMED',
      modificationRequest: requestPayload({ totalScore: 85.5 }),
      usualScore: 80,
      midtermScore: 80,
      finalScore: 80,
      totalScore: 80,
      gradePoint: 3,
      gradeLetter: 'B',
    })

    await expect(
      scoreModificationService.approveModificationRequest(
        'score-1',
        APPROVER_ID,
        ['super_admin'],
        {}
      )
    ).rejects.toBeInstanceOf(ValidationError)
    expect(txMock.score.updateMany).not.toHaveBeenCalled()
  })

  it('rejects a request without modifying original score and writes system log', async () => {
    txMock.score.findUnique.mockResolvedValue({
      id: 'score-1',
      status: 'SUBMITTED',
      modificationRequest: requestPayload({ finalScore: 90 }),
    })

    await scoreModificationService.rejectModificationRequest('score-1', APPROVER_ID, ['admin'], {
      reason: '证据不足',
    })

    expect(txMock.score.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          modificationRequest: null,
        },
      })
    )
    expect(txMock.scoreModificationLog.create).not.toHaveBeenCalled()
    expect(txMock.systemLog.create).toHaveBeenCalledOnce()
  })

  it('enforces admin permission inside approval services', async () => {
    await expect(
      scoreModificationService.getPendingModificationRequests({ page: 1, pageSize: 20 }, [
        'teacher',
      ])
    ).rejects.toBeInstanceOf(ForbiddenError)

    await expect(
      scoreModificationService.approveModificationRequest('score-1', APPROVER_ID, ['teacher'], {})
    ).rejects.toBeInstanceOf(ForbiddenError)

    await expect(
      scoreModificationService.rejectModificationRequest('score-1', APPROVER_ID, ['teacher'], {
        reason: '拒绝',
      })
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('supports pending-request pagination and course/teacher filters', async () => {
    prismaMock.score.findMany.mockResolvedValue([
      {
        id: 'score-1',
        status: 'SUBMITTED',
        courseOfferingId: 'off-1',
        enteredBy: APPLICANT_ID,
        studentId: 'student-1',
        modificationRequest: requestPayload({ finalScore: 90 }),
        student: { user: { id: 'student-1', username: 'student', realName: '学生甲' } },
        enterer: { user: { id: APPLICANT_ID, username: 'teacher', realName: '教师甲' } },
      },
    ])
    prismaMock.score.count.mockResolvedValue(1)

    const result = await scoreModificationService.getPendingModificationRequests(
      {
        page: 2,
        pageSize: 10,
        courseOfferingId: 'off-1',
        teacherId: APPLICANT_ID,
      },
      ['admin']
    )

    expect(prismaMock.score.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: expect.objectContaining({
          courseOfferingId: 'off-1',
          OR: [{ enteredBy: APPLICANT_ID }, { courseOffering: { teacherId: APPLICANT_ID } }],
        }),
      })
    )
    expect(result.pagination).toEqual({ page: 2, pageSize: 10, total: 1, totalPages: 1 })
  })

  it('does not write approval logs when optimistic update loses the race', async () => {
    txMock.score.findUnique.mockResolvedValue({
      id: 'score-1',
      status: 'SUBMITTED',
      modificationRequest: requestPayload({ finalScore: 90 }),
      usualScore: 80,
      midtermScore: 80,
      finalScore: 80,
      totalScore: 80,
      gradePoint: 3,
      gradeLetter: 'B',
    })
    txMock.score.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      scoreModificationService.approveModificationRequest('score-1', APPROVER_ID, ['admin'], {})
    ).rejects.toBeInstanceOf(ConflictError)
    expect(txMock.scoreModificationLog.create).not.toHaveBeenCalled()
    expect(txMock.systemLog.create).not.toHaveBeenCalled()
  })

  it('allows only related users to view modification logs', async () => {
    prismaMock.score.findUnique.mockResolvedValue({
      id: 'score-1',
      enteredBy: APPLICANT_ID,
      studentId: 'student-1',
      courseOffering: { teacherId: APPLICANT_ID },
    })

    await expect(
      scoreModificationService.getScoreModificationLogs('score-1', 'other-student', ['student'], {
        page: 1,
        pageSize: 20,
      })
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('returns paginated modification logs with normalized score snapshots', async () => {
    const createdAt = new Date('2026-06-10T09:00:00.000Z')
    prismaMock.score.findUnique.mockResolvedValue({
      id: 'score-1',
      enteredBy: APPLICANT_ID,
      studentId: 'student-1',
      courseOffering: { teacherId: APPLICANT_ID },
    })
    prismaMock.scoreModificationLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        scoreId: 'score-1',
        modifierId: APPROVER_ID,
        oldValue: {
          usualScore: 80,
          midtermScore: 80,
          finalScore: 80,
          totalScore: 80,
          gradePoint: 3,
          gradeLetter: 'B',
        },
        newValue: {
          usualScore: 80,
          midtermScore: 90,
          finalScore: 100,
          totalScore: 92,
          gradePoint: 4,
          gradeLetter: 'A',
        },
        reason: '审批通过',
        createdAt,
        modifier: { id: APPROVER_ID, username: 'admin', realName: '管理员甲' },
      },
    ])
    prismaMock.scoreModificationLog.count.mockResolvedValue(1)

    const result = await scoreModificationService.getScoreModificationLogs(
      'score-1',
      APPROVER_ID,
      ['admin'],
      { page: 1, pageSize: 20 }
    )

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'log-1',
        modifierUsername: 'admin',
        oldValue: expect.objectContaining({ totalScore: 80, gradeLetter: 'B' }),
        newValue: expect.objectContaining({ totalScore: 92, gradeLetter: 'A' }),
      })
    )
    expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 })
  })

  it('rejects malformed stored request payloads before approval', async () => {
    txMock.score.findUnique.mockResolvedValue({
      id: 'score-1',
      status: 'SUBMITTED',
      modificationRequest: '{broken-json',
      usualScore: 80,
      midtermScore: 80,
      finalScore: 80,
      totalScore: 80,
      gradePoint: 3,
      gradeLetter: 'B',
    })

    await expect(
      scoreModificationService.approveModificationRequest('score-1', APPROVER_ID, ['admin'], {})
    ).rejects.toBeInstanceOf(ValidationError)
    expect(txMock.score.updateMany).not.toHaveBeenCalled()
  })

  it('detects concurrent rejection and does not write system log', async () => {
    txMock.score.findUnique.mockResolvedValue({
      id: 'score-1',
      status: 'SUBMITTED',
      modificationRequest: requestPayload({ finalScore: 90 }),
    })
    txMock.score.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      scoreModificationService.rejectModificationRequest('score-1', APPROVER_ID, ['admin'], {
        reason: '证据不足',
      })
    ).rejects.toBeInstanceOf(ConflictError)
    expect(txMock.systemLog.create).not.toHaveBeenCalled()
  })
})

describe('score modification schemas', () => {
  it('accepts a valid request with at most two decimals', () => {
    expect(
      createScoreModificationRequestSchema.safeParse({
        proposedChanges: { usualScore: 88.88 },
        reason: '录入错误',
      }).success
    ).toBe(true)
  })

  it('rejects empty changes, out-of-range values, and over-precision values', () => {
    expect(
      createScoreModificationRequestSchema.safeParse({
        proposedChanges: {},
        reason: '录入错误',
      }).success
    ).toBe(false)
    expect(
      createScoreModificationRequestSchema.safeParse({
        proposedChanges: { finalScore: 101 },
        reason: '录入错误',
      }).success
    ).toBe(false)
    expect(
      createScoreModificationRequestSchema.safeParse({
        proposedChanges: { finalScore: 88.888 },
        reason: '录入错误',
      }).success
    ).toBe(false)
    expect(
      createScoreModificationRequestSchema.safeParse({
        proposedChanges: { totalScore: 88 },
        reason: '录入错误',
      }).success
    ).toBe(false)
  })

  it('validates the complete stored JSON payload contract', () => {
    expect(
      scoreModificationRequestPayloadSchema.safeParse({
        proposedChanges: { finalScore: 90 },
        reason: '录入错误',
        applicantId: APPLICANT_ID,
        appliedAt: '2026-06-10T08:00:00.000Z',
      }).success
    ).toBe(true)
  })
})

describe('scoreModificationController', () => {
  it('returns a sanitized 500 response for unexpected errors', async () => {
    vi.spyOn(scoreModificationService, 'getPendingModificationRequests').mockRejectedValueOnce(
      new Error('database connection details')
    )

    const req = {
      query: {},
      user: { roles: ['admin'] },
    } as unknown as Request
    const status = vi.fn()
    const json = vi.fn()
    const res = { status, json } as unknown as Response
    status.mockReturnValue(res)

    await scoreModificationController.getPendingRequests(req, res)

    expect(status).toHaveBeenCalledWith(500)
    expect(json).toHaveBeenCalledWith({
      code: 500,
      message: '获取待处理申请失败',
    })
  })
})
