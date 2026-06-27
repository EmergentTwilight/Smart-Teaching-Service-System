// schedule.types.ts
// if modified, it (the new one) should be copied to the frontend

import { z } from 'zod'

import { classroomInPrismaSchema } from '../classroom/classroom.types.js'

export const scheduleInPrismaSchema = z
  .object({
    courseOfferingId: z.string().min(1, '无效的课程开设 ID'),
    classroomId: z.string().min(1, '无效的教室 ID'),
    dayOfWeek: z.coerce.number().min(1).max(7, '星期必须在 1-7 之间'),
    startWeek: z.coerce.number().positive(),
    endWeek: z.coerce.number().positive(),
    startPeriod: z.coerce.number().positive(),
    endPeriod: z.coerce.number().positive(),
    notes: z.string().nullable(),
  })
  .refine((data) => data.startWeek <= data.endWeek, {
    message: '开始周次不能大于结束周次',
    path: ['endWeek'],
  })
  .refine((data) => data.startPeriod <= data.endPeriod, {
    message: '开始节次不能大于结束节次',
    path: ['endPeriod'],
  })

export const scheduleSchema = z.object({
  id: z.string(),
  schedule: scheduleInPrismaSchema,
  courseName: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1),
  classroom: z.object({
    id: z.string(),
    classroom: classroomInPrismaSchema,
  }),
})

// --- Request Schemas ---

export const createScheduleSchema = scheduleInPrismaSchema
export const idSchema = z.object({
  id: z.string().min(1, 'ID 不能为空'),
})

export const updateScheduleSchema = z.object({
  id: z.string(),
  data: scheduleInPrismaSchema,
})

export const getSchedulesSchema = z.object({
  classroomId: z.string().optional(),
  courseOfferingId: z.string().optional(),
})

export const pagedGetSchedulesSchema = getSchedulesSchema.extend({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(20),
})

// --- Response Schemas ---

export const nullableScheduleResponseSchema = scheduleSchema.nullable()

export const pagedScheduleListResponseSchema = z.object({
  page: z.coerce.number(),
  pageSize: z.coerce.number(),
  total: z.coerce.number(),
  items: z.array(scheduleSchema),
})

export const validateResponseSchema = z.object({
  valid: z.boolean(),
  conflicts: z.array(
    z.object({
      type: z.string(),
      message: z.string(),
    })
  ),
})
export const idResponseSchema = z.object({
  id: z.string().min(1, 'ID 不能为空'),
})

// --- infer ---
export type ScheduleInPrisma = z.infer<typeof scheduleInPrismaSchema>
export type Schedule = z.infer<typeof scheduleSchema>

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>
export type IdInput = z.infer<typeof idSchema>
export type GetSchedulesInput = z.infer<typeof getSchedulesSchema>
export type PagedGetSchedulesInput = z.infer<typeof pagedGetSchedulesSchema>

export type ScheduleResponse = z.infer<typeof scheduleSchema>
export type NullableScheduleResponse = z.infer<typeof nullableScheduleResponseSchema>
export type PagedScheduleListResponse = z.infer<typeof pagedScheduleListResponseSchema>
export type ValidateResponse = z.infer<typeof validateResponseSchema>
export type IdResponse = z.infer<typeof idResponseSchema>
