// auto-schedule.types.ts
// if modified, it (the new one) should be copied to the frontend

import { z } from 'zod'
import { scheduleInPrismaSchema } from '../schedule/schedule.types.js'

export const scheduleSchema = z.object({
  schedule: scheduleInPrismaSchema,
  teacherId: z.string().min(1),
})

export const scheduleSuccessSchema = z.object({
  courseOfferingId: z.string(),
  teacherId: z.string().min(1),
  classroomId: z.string(),
  dayOfWeek: z.coerce.number(),
  startWeek: z.coerce.number(),
  endWeek: z.coerce.number(),
  startPeriod: z.coerce.number(),
  endPeriod: z.coerce.number(),
  notes: z.string().nullable(),
})

export const scheduleFailureSchema = z.object({
  courseOfferingId: z.string().min(1),
  courseName: z.string().min(1),
  teacherName: z.string().min(1),
  reason: z.string(),
  detail: z.string(),
})

// --- Request Schemas ---

export const createTaskSchema = z.object({
  semesterId: z.string().min(1, '学期ID不能为空'),
  courseOfferingIds: z.array(z.string().min(1)).optional(),
})

// taskId: string
export const taskIdSchema = z.object({
  taskId: z.string().min(1, '任务ID不能为空'),
})

// --- Response Schemas ---

export const autoScheduleTaskResponseSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  progress: z.coerce.number().min(0).max(100),
  semesterId: z.string().min(1),
  result: z
    .object({
      successRate: z.coerce.number().min(0).max(100),
      schedules: z.array(scheduleSchema),
      failures: z.array(scheduleFailureSchema),
    })
    .optional(),
})

export const applyTaskResponseSchema = z.object({
  appliedCount: z.coerce.number().int().min(0),
  ignoredCount: z.coerce.number().int().min(0),
})

// --- infer ---

export type Schedule = z.infer<typeof scheduleSchema>
export type ScheduleSuccess = z.infer<typeof scheduleSchema>
export type ScheduleFailure = z.infer<typeof scheduleFailureSchema>

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type TaskIdInput = z.infer<typeof taskIdSchema>

export type AutoScheduleTaskResponse = z.infer<typeof autoScheduleTaskResponseSchema>
export type ApplyTaskResponse = z.infer<typeof applyTaskResponseSchema>
