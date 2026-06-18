/**
 * F1 成绩录入相关类型定义
 * 包含查询、草稿保存、提交的 schema 和类型
 */
import { z } from 'zod'

export const courseOfferingParamsSchema = z.object({
  courseOfferingId: z.string().min(1, 'courseOfferingId 不能为空'),
})

export const getScoreListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(), // 统一口径：同时匹配学号或姓名
  // CONFIRMED 是 F2 审批流产生的正式确认状态，F1 需要识别并展示，但不自己产生
  status: z.enum(['DRAFT', 'SUBMITTED', 'CONFIRMED', 'EMPTY']).optional(),
})

const scoreDraftItemSchema = z.object({
  enrollmentId: z.string().min(1, 'enrollmentId 不能为空'),
  usualScore: z.number().min(0).max(100).nullable().optional(),
  midtermScore: z.number().min(0).max(100).nullable().optional(),
  finalScore: z.number().min(0).max(100).nullable().optional(),
})

export const saveDraftBodySchema = z.object({
  scores: z.array(scoreDraftItemSchema).min(1, '至少需要一条成绩数据'),
})

/**
 * 批量提交成绩请求 schema
 * 统一口径：使用 scoreIds（Score 表的主键），与 F4 前端对齐
 */
export const submitScoresBodySchema = z.object({
  scoreIds: z.array(z.string()).min(1, '至少需要一个 scoreId'),
})

export type GetScoreListQuery = z.infer<typeof getScoreListQuerySchema>
export type SaveDraftBody = z.infer<typeof saveDraftBodySchema>
export type SubmitScoresBody = z.infer<typeof submitScoresBodySchema>
