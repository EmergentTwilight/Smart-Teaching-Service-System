/**
 * 课程相关类型定义
 * 包含课程创建、更新的 schema 和类型
 */
import { z } from 'zod'
import { CourseType, CourseStatus } from '@prisma/client'

/**
 * 获取课程列表 schema
 * API中定义的course_type和status参数为小写字符串，为了API与数据库枚举类型兼容，
 * 使用zod的preprocess将输入转换为大写后再验证。
 */
export const getCoursesListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().optional(),
  department_id: z.string().uuid().optional(),
  course_type: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.nativeEnum(CourseType).optional()
  ),
  status: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.nativeEnum(CourseStatus).optional()
  ),
})

/**
 * 课程Id Schema
 */
export const courseIdSchema = z.object({
  course_id: z.string().uuid(),
})

/**
 * 创建课程 schema
 * 数据库中定义的credits字段为decimal(3,1)，因此有以下限制。
 */
export const createCourseSchema = z.object({
  code: z.string().min(1, '课程代码不能为空').max(20, '课程代码最多20字符'),
  name: z.string().min(1, '课程名称不能为空').max(100, '课程名称最多100字符'),
  credits: z.number().min(0, '学分不能为负').max(999, '学分不能超过999').multipleOf(0.1),
  hours: z.number().int().min(0, '学时不能为负').optional(),
  course_type: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.nativeEnum(CourseType)
  ),
  category: z.string().optional(),
  department_id: z.string().uuid().optional(),
  teacher_id: z.string().uuid().optional(),
  description: z.string().optional(),
  assessment_method: z.string().optional(),
  prerequisite_ids: z.array(z.string().uuid()).optional(),
})

/**
 * 更新课程 schema
 * 与创建课程类似，但所有字段都可选
 */
export const updateCourseSchema = z.object({
  name: z.string().min(1, '课程名称不能为空').max(100, '课程名称最多100字符').optional(),
  credits: z.number().min(0, '学分不能为负').max(999, '学分不能超过999').multipleOf(0.1).optional(),
  description: z.string().optional(),
  prerequisite_ids: z.array(z.string().uuid()).optional(),
})

/**
 * 批量创建课程 schema
 */
export const batchCreateCoursesSchema = z.object({
  courses: z.array(createCourseSchema),
})

export type GetCoursesListInput = z.infer<typeof getCoursesListSchema>
export type CourseIdInput = z.infer<typeof courseIdSchema>
export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
export type BatchCreateCoursesInput = z.infer<typeof batchCreateCoursesSchema>
