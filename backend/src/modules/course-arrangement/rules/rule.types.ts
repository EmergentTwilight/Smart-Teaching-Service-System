// rule.types.ts
// if modified, it (the new one) should be copied to the frontend

import { z } from 'zod'

// --- Request Schemas ---

export const timeSlotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  startPeriod: z.coerce.number().int().min(1),
  endPeriod: z.coerce.number().int().min(1),
})

export const setSchedulingRuleSchema = z.object({
  targetType: z.enum(['teacher', 'course']),
  targetId: z.string().min(1, '目标ID不能为空'),
  rules: z.object({
    hardConstraints: z.object({
      unavailableTimeSlots: z.array(timeSlotSchema),
      requiredRoomType: z.string().optional(),
    }),
    softConstraints: z.object({
      preferredTimeSlots: z.array(timeSlotSchema),
      continuousPeriods: z.boolean(),
      preferredBuilding: z.string().optional(),
    }),
  }),
})

export const getRulesListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(20),
  targetType: z.string().optional(),
  keyword: z.string().optional(),
})

export const idSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
})

export const batchDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).nonempty('IDs 不能为空'),
})

// --- Response Schemas ---

const schedulingRuleSchema = z.object({
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

export const ruleResponseSchema = z.object({
  id: z.string(),
  targetType: z.enum(['teacher', 'course']),
  targetId: z.string(),
  rules: schedulingRuleSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

// 注意：列表响应中的 pagination，total 是 number
export const ruleListResponseSchema = z.object({
  items: z.array(ruleResponseSchema),
  pagination: z.object({
    page: z.coerce.number(),
    pageSize: z.coerce.number(),
    total: z.coerce.number(),
  }),
})

export const saveRuleResponseSchema = z.object({
  ruleId: z.string(),
  isNew: z.boolean(),
})

export const overviewStatsResponseSchema = z.object({
  semesters: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      courseOfferings: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        })
      ),
    })
  ),
  classrooms: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
})

// --- infer ---
export type TimeSlot = z.infer<typeof timeSlotSchema>
export type SchedulingRule = z.infer<typeof schedulingRuleSchema>

export type SetSchedulingRuleInput = z.infer<typeof setSchedulingRuleSchema>
export type GetRulesListInput = z.infer<typeof getRulesListSchema>
export type BatchDeleteInput = z.infer<typeof batchDeleteSchema>
export type IdInput = z.infer<typeof idSchema>

export type RuleResponse = z.infer<typeof ruleResponseSchema>
export type RuleListResponse = z.infer<typeof ruleListResponseSchema>
export type SaveRuleResponse = z.infer<typeof saveRuleResponseSchema>
export type OverviewStatsResponse = z.infer<typeof overviewStatsResponseSchema>
