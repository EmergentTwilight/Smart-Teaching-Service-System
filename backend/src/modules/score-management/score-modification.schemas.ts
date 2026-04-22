import { z } from 'zod'

/**
 * 统一在入口层做 Zod 校验的原因：
 * 让非法输入在进入 service 之前被拦截，避免污染成绩与审计数据。
 */

const scoreValueSchema = z
  // 单个分数字段限制：0~100，且最多保留 2 位小数。
  .number()
  .min(0, '分数不能小于 0')
  .max(100, '分数不能大于 100')
  .refine((value: number) => Number.isInteger(value * 100), '分数最多保留 2 位小数')

// 拟修改分数字段限制：四项都可选，但至少要提交一项。
export const proposedScoreChangesSchema = z
  .object({
    usualScore: scoreValueSchema.optional(),
    midtermScore: scoreValueSchema.optional(),
    finalScore: scoreValueSchema.optional(),
    totalScore: scoreValueSchema.optional(),
  })
  .refine(
    (changes: {
      usualScore?: number
      midtermScore?: number
      finalScore?: number
      totalScore?: number
    }) =>
      changes.usualScore !== undefined ||
      changes.midtermScore !== undefined ||
      changes.finalScore !== undefined ||
      changes.totalScore !== undefined,
    {
      message: '至少需要提供一个拟修改分数字段',
    }
  )

// 存储在 Score.modificationRequest 的完整结构限制。
export const scoreModificationRequestPayloadSchema = z.object({
  proposedChanges: proposedScoreChangesSchema,
  reason: z.string().min(1).max(500),
  applicantId: z.string().uuid('申请人 ID 格式不正确'),
  appliedAt: z.string().datetime(),
})

// 路径参数限制：scoreId 必须是 UUID。
export const scoreIdParamSchema = z.object({
  scoreId: z.string().uuid('成绩 ID 格式不正确'),
})

// 发起申请 body 限制：changes 合法且 reason 必填，最大 500 字。
export const createScoreModificationRequestSchema = z.object({
  proposedChanges: proposedScoreChangesSchema,
  reason: z.string().min(1, '申请原因不能为空').max(500, '申请原因不能超过 500 字符'),
})

// 待审批列表 query 限制：分页参数合法，课程/教师筛选为可选 UUID。
export const getPendingModificationRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  courseOfferingId: z.string().uuid('课程开课 ID 格式不正确').optional(),
  teacherId: z.string().uuid('教师 ID 格式不正确').optional(),
})

// 审批通过 body 限制：comment 可选，最多 500 字。
export const approveModificationRequestSchema = z.object({
  comment: z.string().max(500, '审批备注不能超过 500 字符').optional(),
})

// 审批驳回 body 限制：reason 必填，长度 1~500。
export const rejectModificationRequestSchema = z.object({
  reason: z.string().min(1, '驳回原因不能为空').max(500, '驳回原因不能超过 500 字符'),
})

// 修改日志 query 限制：仅分页参数，且范围受控。
export const getScoreModificationLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
