// timetable.types.ts
// if modified, it (the new one) should be copied to the frontend

import { z } from 'zod'
import { scheduleSchema } from '../schedule/schedule.types.js'

// --- Request Schemas ---

export const getByCourseOfferingSchema = z.object({
  courseOfferingId: z.string().min(1, '无效的课程开设 ID'),
})

export const getByClassroomSchema = z.object({
  classroomId: z.string().min(1, '无效的教室 ID'),
  query: z.object({
    semesterId: z.string().optional(),
  }),
})

export const getTimetablesWithoutAuthSchema = z.object({
  semesterId: z.string().optional(),
  classroomId: z.string().optional(),
  courseOfferingId: z.string().optional(),
})

export const pagedGetTimetablesWithoutAuthSchema = getTimetablesWithoutAuthSchema.extend({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(10),
})

export const pagedGetTimetablesSchema = z.object({
  query: pagedGetTimetablesWithoutAuthSchema,
  user: z
    .object({
      userId: z.string().min(1),
      roles: z.array(z.enum(['teacher', 'student', 'admin', 'super_admin'])),
    })
    .passthrough(),
})

export const exportTimetableSchema = z.object({
  // targetType: classroom | teacher | student
  format: z.enum(['csv', 'excel', 'pdf']),
  targetType: z.enum(['classroom', 'teacher', 'student', 'global']),
  targetId: z.string().min(1, '目标 ID 不能为空'),
  semesterId: z.string().optional(),
  startWeek: z.coerce.number().positive().optional(),
  endWeek: z.coerce.number().positive().optional(),
})

// --- Response Schemas ---

export const timetableListResponseSchema = z.array(scheduleSchema)

export const pagedTimetableListResponseSchema = z.object({
  page: z.coerce.number(),
  pageSize: z.coerce.number(),
  total: z.coerce.number(),
  items: timetableListResponseSchema,
})

export const exportResponseSchema = z.object({
  filename: z.string().min(1),
  content: z.string(),
})

// --- infer ---
export type GetByCourseOfferingInput = z.infer<typeof getByCourseOfferingSchema>
export type GetByClassroomInput = z.infer<typeof getByClassroomSchema>
export type GetTimetablesInputWithoutAuth = z.infer<typeof getTimetablesWithoutAuthSchema>
export type PagedGetTimetablesInputWithoutAuth = z.infer<typeof pagedGetTimetablesWithoutAuthSchema>
export type PagedGetTimetablesInput = z.infer<typeof pagedGetTimetablesSchema>
export type ExportTimetableInput = z.infer<typeof exportTimetableSchema>

export type TimetableListResponse = z.infer<typeof timetableListResponseSchema>
export type PagedTimetableListResponse = z.infer<typeof pagedTimetableListResponseSchema>
export type ExportResponse = z.infer<typeof exportResponseSchema>
