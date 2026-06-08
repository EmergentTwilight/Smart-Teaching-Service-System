/**
 * 培养方案相关类型定义
 * 包含培养方案增、删、改、查等操作所需的类型定义
 */
import { z } from 'zod'
import { CourseType } from '@prisma/client'

/**
 * 获取培养方案列表请求验证 schema
 */
export const getCurriculumListSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  page_size: z.coerce.number().int().positive().optional().default(10),
  major_id: z.string().uuid().optional(),
  year: z.coerce.number().int().positive().optional(),
})

/**
 * 培养方案 ID schema
 */
export const curriculumIdSchema = z.object({
  id: z.string().uuid(),
})

/**
 * 创建培养方案请求验证 schema
 */
export const createCurriculumSchema = z.object({
  name: z.string().min(1).max(100),
  major_id: z.string().uuid(),
  year: z.number().int().positive(),
  total_credits: z.number().multipleOf(0.1).positive().max(9999),
  required_credits: z.number().multipleOf(0.1).positive().max(9999).optional(),
  elective_credits: z.number().multipleOf(0.1).positive().max(9999).optional(),
})

/**
 * 更新培养方案请求验证 schema
 */
export const updateCurriculumSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  total_credits: z.number().multipleOf(0.1).positive().max(9999).optional(),
  required_credits: z.number().multipleOf(0.1).positive().max(9999).optional(),
  elective_credits: z.number().multipleOf(0.1).positive().max(9999).optional(),
})

/**
 * 添加课程到培养方案请求验证 schema
 */
export const addCourseToCurriculumSchema = z.object({
  course_id: z.string().uuid(),
  course_type: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.nativeEnum(CourseType)
  ),
  semester_suggestion: z.number().int().positive().optional(),
})

/**
 * 批量添加课程到培养方案请求验证 schema
 */
export const batchAddCoursesSchema = z.object({
  courses: z.array(
    z.object({
      course_id: z.string().uuid(),
      course_type: z.preprocess(
        (val) => (typeof val === 'string' ? val.toUpperCase() : val),
        z.nativeEnum(CourseType)
      ),
      semester_suggestion: z.number().int().positive().optional(),
    })
  ),
})

/**
 * 更新培养方案中的课程请求验证 schema
 */
export const updateCurriculumCourseSchema = z
  .object({
    course_type: z.preprocess(
      (val) => (typeof val === 'string' ? val.toUpperCase() : val),
      z.nativeEnum(CourseType)
    ),
    semester_suggestion: z.number().int().positive(),
  })
  .refine((data) => data.course_type !== undefined || data.semester_suggestion !== undefined, {
    message: '至少需要提供 course_type 或 semester_suggestion 之一',
  })

export type GetCurriculumListSchema = z.infer<typeof getCurriculumListSchema>
export type CurriculumIdSchema = z.infer<typeof curriculumIdSchema>
export type CreateCurriculumSchema = z.infer<typeof createCurriculumSchema>
export type UpdateCurriculumSchema = z.infer<typeof updateCurriculumSchema>
export type AddCourseToCurriculumSchema = z.infer<typeof addCourseToCurriculumSchema>
export type BatchAddCoursesSchema = z.infer<typeof batchAddCoursesSchema>
export type UpdateCurriculumCourseSchema = z.infer<typeof updateCurriculumCourseSchema>
