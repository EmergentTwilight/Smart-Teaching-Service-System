/**
 * F1 成绩录入相关类型定义
 * 包含查询、草稿保存、提交的 schema 和类型
 */
import { z } from 'zod'

/**
 * 路由参数 schema
 */
export const courseOfferingParamsSchema = z.object({
  courseOfferingId: z.string().min(1, 'courseOfferingId 不能为空'),
})

/**
 * 成绩录入列表查询参数 schema
 */
export const getScoreListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  studentNumber: z.string().optional(),
  studentName: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'EMPTY']).optional(),
})

/**
 * 单条成绩草稿 schema
 */
const scoreDraftItemSchema = z.object({
  enrollmentId: z.string().min(1, 'enrollmentId 不能为空'),
  usualScore: z.number().min(0).max(100).nullable().optional(),
  midtermScore: z.number().min(0).max(100).nullable().optional(),
  finalScore: z.number().min(0).max(100).nullable().optional(),
})

/**
 * 批量保存草稿请求 schema
 */
export const saveDraftBodySchema = z.object({
  scores: z.array(scoreDraftItemSchema).min(1, '至少需要一条成绩数据'),
})

/**
 * 批量提交成绩请求 schema
 */
export const submitScoresBodySchema = z
  .object({
    enrollmentIds: z.array(z.string()).optional(),
    submitAll: z.boolean().optional(),
  })
  .refine((data) => data.enrollmentIds || data.submitAll, {
    message: '必须提供 enrollmentIds 或 submitAll: true',
  })

// ===== 导出的 TypeScript 类型 =====
export type GetScoreListQuery = z.infer<typeof getScoreListQuerySchema>
export type SaveDraftBody = z.infer<typeof saveDraftBodySchema>
export type SubmitScoresBody = z.infer<typeof submitScoresBodySchema>
