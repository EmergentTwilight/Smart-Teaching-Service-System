/**
 * 部门管理相关类型定义
 */
import { z } from 'zod'

/**
 * 部门 ID 参数 schema
 */
export const departmentIdSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})

/**
 * 创建部门 schema
 */
export const createDepartmentSchema = z.object({
  name: z.string(),
  code: z.string(),
  description: z.string(),
})

/**
 * 更新部门 schema
 */
export const updateDepartmentSchema = z.object({
  name: z.string(),
  description: z.string(),
})

/** 部门 ID 参数类型 */
export type DepartmentIdParams = z.infer<typeof departmentIdSchema>
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>
