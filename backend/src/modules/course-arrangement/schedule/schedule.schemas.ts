import { z } from 'zod'

export const createScheduleSchema = z
  .object({
    courseOfferingId: z.string().uuid('无效的课程开设 ID'),
    classroomId: z.string().uuid('无效的教室 ID'),
    dayOfWeek: z.number().min(1).max(7, '星期必须在 1-7 之间'),
    startWeek: z.number().positive(),
    endWeek: z.number().positive(),
    startPeriod: z.number().positive(),
    endPeriod: z.number().positive(),
    notes: z.string().optional(),
  })
  .refine((data) => data.startWeek <= data.endWeek, {
    message: '开始周次不能大于结束周次',
    path: ['endWeek'],
  })
  .refine((data) => data.startPeriod <= data.endPeriod, {
    message: '开始节次不能大于结束节次',
    path: ['endPeriod'],
  })

export type CreateScheduleDTO = z.infer<typeof createScheduleSchema>
