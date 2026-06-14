/**
 * 专业相关类型定义
 * 包含专业增、删、改、查等操作所需的类型定义
 */
import { z } from 'zod'
import { DegreeType } from '@prisma/client'

/**
 * 专业 ID schema
 */
export const getMajorIdSchema = z.object({
  id: z.string().uuid('专业ID格式无效'),
})

/**
 * 查询专业列表请求验证 schema
 */
export const getMajorListSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  page_size: z.coerce.number().int().positive().max(100).optional().default(20),
  department_id: z.string().uuid().optional(),
  keyword: z.string().trim().optional(),
})

/**
 * 创建专业请求验证 schema
 * 数据库 Major 表格中：
 * - name字段类型为 VARCHAR(100)，
 * - code字段类型为 VARCHAR(20)，
 * - total_credits字段类型为 DECIMAL(5,1)
 * 因此在验证 schema 中对这些字段加以限制
 */
export const createMajorSchema = z.object({
  department_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20).optional(),
  degree_type: z.nativeEnum(DegreeType).optional(),
  total_credits: z.number().multipleOf(0.1).positive().max(9999).optional(),
})

/**
 * 更新专业请求验证 schema
 */
export const updateMajorSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    total_credits: z.number().multipleOf(0.1).positive().max(9999).optional(),
  })
  .refine((data) => data.name !== undefined || data.total_credits !== undefined, {
    message: '至少需要提供 name 或 total_credits 之一',
  })

export type GetMajorIdSchema = z.infer<typeof getMajorIdSchema>
export type GetMajorListSchema = z.infer<typeof getMajorListSchema>
export type CreateMajorSchema = z.infer<typeof createMajorSchema>
export type UpdateMajorSchema = z.infer<typeof updateMajorSchema>
