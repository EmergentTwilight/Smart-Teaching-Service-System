/**
 * 规则 Schema 单元测试
 * 验证 rule.types.ts 中所有 Zod schema 的校验行为
 */
import { describe, expect, it } from 'vitest'
import {
  timeSlotSchema,
  setSchedulingRuleSchema,
  getRulesListSchema,
  idSchema,
  batchDeleteSchema,
  ruleResponseSchema,
  ruleListResponseSchema,
  saveRuleResponseSchema,
  overviewStatsResponseSchema,
} from '../../../modules/course-arrangement/rules/rule.types.js'

// ==================== timeSlotSchema ====================
describe('timeSlotSchema', () => {
  const validSlot = { dayOfWeek: 1, startPeriod: 1, endPeriod: 2 }

  describe('valid inputs', () => {
    it('应该接受合法时间段', () => {
      expect(timeSlotSchema.safeParse(validSlot).success).toBe(true)
    })

    it('应该接受 dayOfWeek = 7', () => {
      expect(timeSlotSchema.safeParse({ ...validSlot, dayOfWeek: 7 }).success).toBe(true)
    })

    it('应该接受字符串数值（coerce）', () => {
      const result = timeSlotSchema.safeParse({ dayOfWeek: '3', startPeriod: '1', endPeriod: '2' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.dayOfWeek).toBe(3)
      }
    })
  })

  describe('dayOfWeek validation', () => {
    it('应该拒绝 < 1', () => {
      expect(timeSlotSchema.safeParse({ ...validSlot, dayOfWeek: 0 }).success).toBe(false)
    })
    it('应该拒绝 > 7', () => {
      expect(timeSlotSchema.safeParse({ ...validSlot, dayOfWeek: 8 }).success).toBe(false)
    })
  })

  describe('startPeriod validation', () => {
    it('应该拒绝 < 1', () => {
      expect(timeSlotSchema.safeParse({ ...validSlot, startPeriod: 0 }).success).toBe(false)
    })
  })

  describe('endPeriod validation', () => {
    it('应该拒绝 < 1', () => {
      expect(timeSlotSchema.safeParse({ ...validSlot, endPeriod: 0 }).success).toBe(false)
    })
  })

  describe('missing fields', () => {
    it('应该拒绝空对象', () => {
      expect(timeSlotSchema.safeParse({}).success).toBe(false)
    })
  })
})

// ==================== setSchedulingRuleSchema ====================
describe('setSchedulingRuleSchema', () => {
  const validInput = {
    targetType: 'teacher' as const,
    targetId: 'tch-001',
    rules: {
      hardConstraints: {
        unavailableTimeSlots: [{ dayOfWeek: 1, startPeriod: 1, endPeriod: 2 }],
        requiredRoomType: 'LECTURE',
      },
      softConstraints: {
        preferredTimeSlots: [{ dayOfWeek: 3, startPeriod: 3, endPeriod: 4 }],
        continuousPeriods: true,
        preferredBuilding: '教学楼A',
      },
    },
  }

  describe('valid inputs', () => {
    it('应该接受完整的规则数据', () => {
      expect(setSchedulingRuleSchema.safeParse(validInput).success).toBe(true)
    })

    it('应该接受 targetType 为 course', () => {
      const result = setSchedulingRuleSchema.safeParse({ ...validInput, targetType: 'course' })
      expect(result.success).toBe(true)
    })

    it('应该接受不含 optional 字段的 softConstraints', () => {
      const result = setSchedulingRuleSchema.safeParse({
        ...validInput,
        rules: {
          hardConstraints: { unavailableTimeSlots: [] },
          softConstraints: { preferredTimeSlots: [], continuousPeriods: false },
        },
      })
      expect(result.success).toBe(true)
    })

    it('应该接受不含 requiredRoomType', () => {
      const result = setSchedulingRuleSchema.safeParse({
        ...validInput,
        rules: {
          hardConstraints: { unavailableTimeSlots: [] },
          softConstraints: { preferredTimeSlots: [], continuousPeriods: false },
        },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('targetType validation', () => {
    it('应该拒绝无效 targetType', () => {
      const result = setSchedulingRuleSchema.safeParse({ ...validInput, targetType: 'student' })
      expect(result.success).toBe(false)
    })

    it('应该拒绝空字符串', () => {
      const result = setSchedulingRuleSchema.safeParse({ ...validInput, targetType: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('targetId validation', () => {
    it('应该拒绝空 targetId', () => {
      const result = setSchedulingRuleSchema.safeParse({ ...validInput, targetId: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('目标ID不能为空')
      }
    })
  })

  describe('requiredRoomType validation', () => {
    it('应该拒绝小写教室类型', () => {
      const result = setSchedulingRuleSchema.safeParse({
        ...validInput,
        rules: {
          ...validInput.rules,
          hardConstraints: {
            ...validInput.rules.hardConstraints,
            requiredRoomType: 'lecture',
          },
        },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('hardConstraints validation', () => {
    it('unavailableTimeSlots 中应该拒绝无效 dayOfWeek', () => {
      const result = setSchedulingRuleSchema.safeParse({
        ...validInput,
        rules: {
          ...validInput.rules,
          hardConstraints: {
            unavailableTimeSlots: [{ dayOfWeek: 8, startPeriod: 1, endPeriod: 2 }],
          },
        },
      })
      expect(result.success).toBe(false)
    })
  })
})

// ==================== getRulesListSchema ====================
describe('getRulesListSchema', () => {
  it('应该使用默认分页值', () => {
    const result = getRulesListSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.pageSize).toBe(20)
    }
  })

  it('应该接受带筛选条件', () => {
    const result = getRulesListSchema.safeParse({
      page: 2,
      pageSize: 10,
      targetType: 'teacher',
      keyword: 'tch',
    })
    expect(result.success).toBe(true)
  })

  it('应该拒绝 page 为 0', () => {
    expect(getRulesListSchema.safeParse({ page: 0 }).success).toBe(false)
  })

  it('应该拒绝 pageSize 为 0', () => {
    expect(getRulesListSchema.safeParse({ pageSize: 0 }).success).toBe(false)
  })

  it('应该接受 pageSize 大于 100（无上限限制）', () => {
    // Schema 只约束了 positive，没有 max 限制
    expect(getRulesListSchema.safeParse({ pageSize: 200 }).success).toBe(true)
  })
})

// ==================== idSchema ====================
describe('idSchema (rules)', () => {
  it('应该接受有效 ID', () => {
    expect(idSchema.safeParse({ id: 'rule-001' }).success).toBe(true)
  })

  it('应该拒绝空 ID', () => {
    const result = idSchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('ID不能为空')
    }
  })
})

// ==================== batchDeleteSchema ====================
describe('batchDeleteSchema', () => {
  it('应该接受非空 ID 数组', () => {
    expect(batchDeleteSchema.safeParse({ ids: ['rule-1', 'rule-2'] }).success).toBe(true)
  })

  it('应该拒绝空数组', () => {
    const result = batchDeleteSchema.safeParse({ ids: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/不能为空/)
    }
  })

  it('应该拒绝空字符串 ID', () => {
    expect(batchDeleteSchema.safeParse({ ids: [''] }).success).toBe(false)
  })

  it('应该拒绝缺失 ids', () => {
    expect(batchDeleteSchema.safeParse({}).success).toBe(false)
  })
})

// ==================== ruleResponseSchema ====================
describe('ruleResponseSchema', () => {
  const validResponse = {
    id: 'rule-001',
    targetType: 'teacher',
    targetId: 'tch-001',
    rules: {
      hardConstraints: {
        unavailableTimeSlots: [],
        requiredRoomType: 'LECTURE',
      },
      softConstraints: {
        preferredTimeSlots: [],
        continuousPeriods: true,
      },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  it('应该接受合法响应', () => {
    expect(ruleResponseSchema.safeParse(validResponse).success).toBe(true)
  })

  it('应该拒绝无效 targetType', () => {
    const result = ruleResponseSchema.safeParse({ ...validResponse, targetType: 'student' })
    expect(result.success).toBe(false)
  })

  it('应该拒绝无效 requiredRoomType', () => {
    const result = ruleResponseSchema.safeParse({
      ...validResponse,
      rules: {
        ...validResponse.rules,
        hardConstraints: { ...validResponse.rules.hardConstraints, requiredRoomType: 'lecture' },
      },
    })
    expect(result.success).toBe(false)
  })
})

// ==================== ruleListResponseSchema ====================
describe('ruleListResponseSchema', () => {
  const validListResponse = {
    items: [
      {
        id: 'rule-001',
        targetType: 'teacher',
        targetId: 'tch-001',
        rules: {
          hardConstraints: { unavailableTimeSlots: [] },
          softConstraints: { preferredTimeSlots: [], continuousPeriods: true },
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    pagination: { page: 1, pageSize: 20, total: 1 },
  }

  it('应该接受合法列表响应', () => {
    expect(ruleListResponseSchema.safeParse(validListResponse).success).toBe(true)
  })

  it('应该接受空列表', () => {
    const result = ruleListResponseSchema.safeParse({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
    })
    expect(result.success).toBe(true)
  })

  it('应该拒绝缺失 pagination', () => {
    expect(ruleListResponseSchema.safeParse({ items: [] }).success).toBe(false)
  })
})

// ==================== saveRuleResponseSchema ====================
describe('saveRuleResponseSchema', () => {
  it('应该接受 isNew: true', () => {
    expect(saveRuleResponseSchema.safeParse({ ruleId: 'rule-001', isNew: true }).success).toBe(true)
  })

  it('应该接受 isNew: false', () => {
    expect(saveRuleResponseSchema.safeParse({ ruleId: 'rule-001', isNew: false }).success).toBe(
      true
    )
  })

  it('应该拒绝缺失 ruleId', () => {
    expect(saveRuleResponseSchema.safeParse({ isNew: true }).success).toBe(false)
  })
})

// ==================== overviewStatsResponseSchema ====================
describe('overviewStatsResponseSchema', () => {
  const validStats = {
    semesters: [
      {
        id: 'sem-001',
        name: '2026 春季',
        courseOfferings: [{ id: 'co-001', name: '高等数学' }],
      },
    ],
    classrooms: [{ id: 'cls-001', name: '教学楼A 101' }],
  }

  it('应该接受合法概览数据', () => {
    expect(overviewStatsResponseSchema.safeParse(validStats).success).toBe(true)
  })

  it('应该接受空数据', () => {
    expect(overviewStatsResponseSchema.safeParse({ semesters: [], classrooms: [] }).success).toBe(
      true
    )
  })

  it('应该拒绝缺失 classrooms', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { classrooms: _, ...rest } = validStats
    expect(overviewStatsResponseSchema.safeParse(rest).success).toBe(false)
  })
})
