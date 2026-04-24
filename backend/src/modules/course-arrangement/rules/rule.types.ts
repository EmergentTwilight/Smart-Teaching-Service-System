// rule.types.ts
import { z } from 'zod'
import { Prisma } from '@prisma/client'

export interface TimeSlot {
  dayOfWeek: number
  startPeriod: number
  endPeriod: number
}

export interface SchedulingRules {
  hardConstraints: {
    unavailableTimeSlots: TimeSlot[]
    requiredRoomType?: string
  }
  softConstraints: {
    preferredTimeSlots: TimeSlot[]
    continuousPeriods: boolean
    preferredBuilding?: string
  }
}

export interface RuleSaveInput {
  targetType: 'teacher' | 'course'
  targetId: string
  rules: SchedulingRules
}

export interface RuleSaveResponse {
  ruleId: string
}

export interface OverviewStats {
  semesters: Array<{
    id: string
    name: string
    courseOfferings: Array<{
      id: string
      name: string
    }>
  }>
  classrooms: Array<{
    id: string
    name: string
  }>
}

export type RuleJson = Prisma.JsonValue

export const timeSlotSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  startPeriod: z.number().int().min(1),
  endPeriod: z.number().int().min(1),
})

export const schedulingRulesSchema = z.object({
  hardConstraints: z.object({
    unavailableTimeSlots: z.array(timeSlotSchema),
    requiredRoomType: z.string().optional(),
  }),
  softConstraints: z.object({
    preferredTimeSlots: z.array(timeSlotSchema),
    continuousPeriods: z.boolean(),
    preferredBuilding: z.string().optional(),
  }),
})

export const ruleSaveInputSchema = z.object({
  targetType: z.enum(['teacher', 'course']),
  targetId: z.string().min(1, '目标ID不能为空'),
  rules: schedulingRulesSchema,
})

// 类型导出
export type RuleSaveInput = z.infer<typeof ruleSaveInputSchema>