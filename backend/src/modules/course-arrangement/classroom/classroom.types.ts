// classroom.types.ts
// if modified, it (the new one) should be copied to the frontend

import { z } from 'zod'

export const RoomStatusEnum = z.enum(['AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE'])
export const RoomTypeEnum = z.enum(['COMPUTER', 'LAB', 'LECTURE', 'MULTIMEDIA'])

const equipmentSchema = z.object({
  projector: z.boolean(),
  airConditioner: z.boolean(),
  microphone: z.boolean(),
  computerCount: z.coerce.number().int().nonnegative(),
})

export const classroomInPrismaSchema = z.object({
  status: RoomStatusEnum.default('AVAILABLE'), // 注意这里也要大写
  building: z.string().min(1, '教学楼不能为空'),
  roomNumber: z.string().min(1, '教室号不能为空'),
  campus: z.string().min(1, '校区不能为空'),
  capacity: z.coerce.number().int().positive('容量必须是正整数'),
  roomType: RoomTypeEnum,
  equipment: equipmentSchema.optional(),
})

// --- Request Schemas ---

export const classroomQuerySchema = z.object({
  campus: z.string().optional(),
  building: z.string().optional(),
  roomType: RoomTypeEnum.optional(),
  status: RoomStatusEnum.optional(),
  keyword: z.string().optional(),
})

export const pagedClassroomQuerySchema = classroomQuerySchema.extend({
  page: z.coerce.number().int().positive(),
  pageSize: z.coerce.number().int().positive().max(100),
})

export const classroomIdSchema = z.object({
  id: z.string().min(1, '教室ID不能为空'),
})

export const updateClassroomSchema = z.object({
  id: z.string(),
  data: classroomInPrismaSchema,
})

export const availableQuerySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  startWeek: z.coerce.number().int().min(1),
  endWeek: z.coerce.number().int().min(1),
  startPeriod: z.coerce.number().int().min(1),
  endPeriod: z.coerce.number().int().min(1),
  capacity: z.coerce.number().int().positive('容量必须是正整数').optional(),
  campus: z.string().min(1, '校区不能为空').optional(),
  roomType: RoomTypeEnum.optional(),
})

// --- Response Schemas ---

const classrromWithIdSchema = z.object({
  id: z.string(),
  classroom: classroomInPrismaSchema,
})
export const nullableClassroomResponseSchema = classrromWithIdSchema.nullable()
export const classroomListResponseSchema = z.array(classrromWithIdSchema)
export const pagedClassroomListResponseSchema = z.object({
  total: z.coerce.number().int().nonnegative(),
  page: z.coerce.number().int().positive(),
  pageSize: z.coerce.number().int().positive(),
  items: classroomListResponseSchema,
})
export const classroomIdResponseSchema = classroomIdSchema

// --- infer ---
export type Equipment = z.infer<typeof equipmentSchema>
export type ClassroomInPrisma = z.infer<typeof classroomInPrismaSchema>
export type ClassroomWithId = z.infer<typeof classrromWithIdSchema>

export type UpdateClassroomInput = z.infer<typeof updateClassroomSchema>
export type ClassroomInput = z.infer<typeof classroomInPrismaSchema>
export type ClassroomQueryInput = z.infer<typeof classroomQuerySchema>
export type PagedClassroomQueryInput = z.infer<typeof pagedClassroomQuerySchema>
export type ClassroomIdInput = z.infer<typeof classroomIdSchema>
export type AvaliableQueryInput = z.infer<typeof availableQuerySchema>

export type ClassroomListResponse = z.infer<typeof classroomListResponseSchema>
export type ClassroomResponse = z.infer<typeof classrromWithIdSchema>
export type NullableClassroomResponse = z.infer<typeof nullableClassroomResponseSchema>
export type ClassroomIdResponse = z.infer<typeof classroomIdResponseSchema>
export type PagedClassroomListResponse = z.infer<typeof pagedClassroomListResponseSchema>
