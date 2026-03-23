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

/** 部门 ID 参数类型 */
export type DepartmentIdParams = z.infer<typeof departmentIdSchema>
