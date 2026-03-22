/**
 * 课程管理相关类型定义
 * 包含课程查询、创建、更新的 schema 和类型
 */
import { z } from 'zod'

/**
 * 课程查询参数 schema
 */
export const getCoursesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
  category: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
})

/**
 * 创建课程 schema
 */
export const createCourseSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  credits: z.number().min(0).max(10),
  hours: z.number().int().min(0),
  category: z.string().min(1).max(50),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  teacherId: z.string().optional(),
})

/**
 * 更新课程 schema
 */
export const updateCourseSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  credits: z.number().min(0).max(10).optional(),
  hours: z.number().int().min(0).optional(),
  category: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  teacherId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
})

/** 课程查询参数类型 */
export type GetCoursesQuery = z.infer<typeof getCoursesQuerySchema>
/** 创建课程输入类型 */
export type CreateCourseInput = z.infer<typeof createCourseSchema>
/** 更新课程输入类型 */
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
