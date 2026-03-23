/**
 * 课程管理相关类型定义
 * 包含课程查询、创建、更新的 schema 和类型
 */
import { z } from 'zod'
import { CourseType, CourseStatus } from '@prisma/client'

/**
 * 课程查询参数 schema
 */
export const getCoursesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
  category: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.nativeEnum(CourseStatus).optional(),
})

/**
 * 课程类型标签映射（用于前端展示）
 */
export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  REQUIRED: '必修课',
  ELECTIVE: '选修课',
  GENERAL: '通识课',
}

/**
 * 创建课程 schema
 * 字段与 Prisma Course 模型对应
 */
export const createCourseSchema = z.object({
  code: z.string().min(1, '课程代码不能为空').max(20),
  name: z.string().min(1, '课程名称不能为空').max(100),
  credits: z.number().min(0, '学分不能为负').max(10),
  hours: z.number().int('学时必须为整数').min(0, '学时不能为负'),
  courseType: z.nativeEnum(CourseType).default('ELECTIVE'),
  category: z.string().min(1, '课程类别不能为空').max(50).optional(),
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
  courseType: z.nativeEnum(CourseType).optional(),
  category: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  teacherId: z.string().optional().nullable(),
  status: z.nativeEnum(CourseStatus).optional(),
})

/** 课程查询参数类型 */
export type GetCoursesQuery = z.infer<typeof getCoursesQuerySchema>
/** 创建课程输入类型 */
export type CreateCourseInput = z.infer<typeof createCourseSchema>
/** 更新课程输入类型 */
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
