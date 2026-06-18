import { z } from 'zod'

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const myScoresQuerySchema = paginationSchema.extend({
  semesterId: z.string().uuid('学期 ID 格式不正确').optional(),
  keyword: z.string().trim().min(1, '关键词不能为空').optional(),
})

export const studentIdParamsSchema = z.object({
  studentId: z.string().uuid('学生 ID 格式不正确'),
})

export type MyScoresQuery = z.infer<typeof myScoresQuerySchema>
export type StudentIdParams = z.infer<typeof studentIdParamsSchema>
