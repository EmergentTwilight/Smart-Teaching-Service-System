/**
 * 部门管理相关类型定义
 */
import { z } from 'zod'

const normalizeKeys = (
  input: unknown,
  aliases: Record<string, string>
): Record<string, unknown> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {}
  }

  const data = { ...(input as Record<string, unknown>) }
  for (const [from, to] of Object.entries(aliases)) {
    if (data[to] === undefined && data[from] !== undefined) {
      data[to] = data[from]
    }
  }
  return data
}

/**
 * 部门 ID 参数 schema
 */
export const departmentIdSchema = z.object({
  id: z.string().uuid('院系ID格式无效'),
})

/**
 * 部门列表查询 schema
 */
export const getDepartmentListSchema = z.preprocess(
  (input) => normalizeKeys(input, { page_size: 'pageSize' }),
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    keyword: z.string().trim().optional(),
  })
)

/**
 * 创建部门 schema
 */
export const createDepartmentSchema = z.object({
  name: z.string(),
  code: z.string(),
  description: z.string().optional(),
})

/**
 * 更新部门 schema
 */
export const updateDepartmentSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: '至少需要提供 name 或 description 之一',
  })

/** 部门 ID 参数类型 */
export type DepartmentIdParams = z.infer<typeof departmentIdSchema>
export type GetDepartmentListInput = z.infer<typeof getDepartmentListSchema>
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>
