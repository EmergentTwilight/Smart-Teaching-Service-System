// classroom.schemas.ts

import { z } from 'zod'

// 修改为大写，匹配 Prisma 生成的枚举类型
export const RoomTypeSchema = z.enum(['LECTURE', 'LAB', 'COMPUTER', 'MULTIMEDIA'])
export const ClassroomStatusSchema = z.enum(['AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE'])

export const createClassroomSchema = z.object({
  building: z.string().min(1, '教学楼不能为空'),
  roomNumber: z.string().min(1, '教室号不能为空'),
  campus: z.string().min(1, '校区不能为空'),
  capacity: z.number().int().positive('容量必须是正整数'),
  roomType: RoomTypeSchema,
  status: ClassroomStatusSchema.default('AVAILABLE'), // 注意这里也要大写
  equipment: z.record(z.any()).optional(),
})

export type CreateClassroomDTO = z.infer<typeof createClassroomSchema>
