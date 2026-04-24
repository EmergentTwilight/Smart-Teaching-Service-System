import { z } from 'zod'

export const courseOfferingIdParamsSchema = z.object({
  courseOfferingId: z.string().uuid('开课 ID 格式不正确'),
})

export const studentIdParamsSchema = z.object({
  studentId: z.string().uuid('学生 ID 格式不正确'),
})

export type CourseOfferingIdParams = z.infer<typeof courseOfferingIdParamsSchema>
export type StudentIdParams = z.infer<typeof studentIdParamsSchema>
