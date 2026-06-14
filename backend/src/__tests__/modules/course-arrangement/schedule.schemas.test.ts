/**
 * 排课 Schema 单元测试
 * 验证 schedule.types.ts 中所有 Zod schema 的校验行为
 */
import { describe, expect, it } from 'vitest'
import {
  scheduleInPrismaSchema,
  updateScheduleSchema,
  idSchema,
  getSchedulesSchema,
  pagedGetSchedulesSchema,
  validateResponseSchema,
  idResponseSchema,
} from '../../../modules/course-arrangement/schedule/schedule.types.js'

// ==================== scheduleInPrismaSchema ====================
describe('scheduleInPrismaSchema', () => {
  const validSchedule = {
    courseOfferingId: 'co-001',
    classroomId: 'cls-001',
    dayOfWeek: 1,
    startWeek: 1,
    endWeek: 16,
    startPeriod: 1,
    endPeriod: 2,
    notes: null,
  }

  describe('valid inputs', () => {
    it('应该接受合法排课数据', () => {
      const result = scheduleInPrismaSchema.safeParse(validSchedule)
      expect(result.success).toBe(true)
    })

    it('应该接受 notes 为字符串', () => {
      const result = scheduleInPrismaSchema.safeParse({ ...validSchedule, notes: '补课' })
      expect(result.success).toBe(true)
    })

    it('应该接受 dayOfWeek = 1', () => {
      expect(scheduleInPrismaSchema.safeParse({ ...validSchedule, dayOfWeek: 1 }).success).toBe(
        true
      )
    })

    it('应该接受 dayOfWeek = 7', () => {
      expect(scheduleInPrismaSchema.safeParse({ ...validSchedule, dayOfWeek: 7 }).success).toBe(
        true
      )
    })

    it('应该接受 startWeek 等于 endWeek', () => {
      const result = scheduleInPrismaSchema.safeParse({
        ...validSchedule,
        startWeek: 5,
        endWeek: 5,
      })
      expect(result.success).toBe(true)
    })

    it('应该接受 startPeriod 等于 endPeriod', () => {
      const result = scheduleInPrismaSchema.safeParse({
        ...validSchedule,
        startPeriod: 3,
        endPeriod: 3,
      })
      expect(result.success).toBe(true)
    })

    it('应该接受字符串数值（coerce）', () => {
      const result = scheduleInPrismaSchema.safeParse({
        ...validSchedule,
        dayOfWeek: '3',
        startWeek: '1',
        endWeek: '16',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.dayOfWeek).toBe(3)
        expect(result.data.startWeek).toBe(1)
      }
    })
  })

  describe('courseOfferingId validation', () => {
    it('应该拒绝空 courseOfferingId', () => {
      const result = scheduleInPrismaSchema.safeParse({ ...validSchedule, courseOfferingId: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('无效的课程开设 ID')
      }
    })
  })

  describe('classroomId validation', () => {
    it('应该拒绝空 classroomId', () => {
      const result = scheduleInPrismaSchema.safeParse({ ...validSchedule, classroomId: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('无效的教室 ID')
      }
    })
  })

  describe('dayOfWeek validation', () => {
    it('应该拒绝 dayOfWeek < 1', () => {
      expect(scheduleInPrismaSchema.safeParse({ ...validSchedule, dayOfWeek: 0 }).success).toBe(
        false
      )
    })
    it('应该拒绝 dayOfWeek > 7', () => {
      expect(scheduleInPrismaSchema.safeParse({ ...validSchedule, dayOfWeek: 8 }).success).toBe(
        false
      )
    })
  })

  describe('startWeek / endWeek validation（refine）', () => {
    it('应该拒绝 startWeek 大于 endWeek', () => {
      const result = scheduleInPrismaSchema.safeParse({
        ...validSchedule,
        startWeek: 10,
        endWeek: 5,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('endWeek'))
        expect(issue?.message).toBe('开始周次不能大于结束周次')
      }
    })

    it('应该拒绝 startWeek 为 0', () => {
      expect(scheduleInPrismaSchema.safeParse({ ...validSchedule, startWeek: 0 }).success).toBe(
        false
      )
    })
  })

  describe('startPeriod / endPeriod validation（refine）', () => {
    it('应该拒绝 startPeriod 大于 endPeriod', () => {
      const result = scheduleInPrismaSchema.safeParse({
        ...validSchedule,
        startPeriod: 5,
        endPeriod: 3,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('endPeriod'))
        expect(issue?.message).toBe('开始节次不能大于结束节次')
      }
    })

    it('应该拒绝 startPeriod 为 0', () => {
      expect(scheduleInPrismaSchema.safeParse({ ...validSchedule, startPeriod: 0 }).success).toBe(
        false
      )
    })
  })

  describe('missing fields', () => {
    it('应该拒绝缺失 courseOfferingId', () => {
      const { courseOfferingId: _, ...rest } = validSchedule
      expect(scheduleInPrismaSchema.safeParse(rest).success).toBe(false)
    })
    it('应该拒绝缺失 classroomId', () => {
      const { classroomId: _, ...rest } = validSchedule
      expect(scheduleInPrismaSchema.safeParse(rest).success).toBe(false)
    })
    it('应该拒绝缺失 dayOfWeek', () => {
      const { dayOfWeek: _, ...rest } = validSchedule
      expect(scheduleInPrismaSchema.safeParse(rest).success).toBe(false)
    })
  })
})

// ==================== updateScheduleSchema ====================
describe('updateScheduleSchema', () => {
  const validUpdate = {
    id: 'sch-001',
    data: {
      courseOfferingId: 'co-002',
      classroomId: 'cls-002',
      dayOfWeek: 3,
      startWeek: 1,
      endWeek: 16,
      startPeriod: 3,
      endPeriod: 4,
      notes: null,
    },
  }

  it('应该接受合法更新数据', () => {
    expect(updateScheduleSchema.safeParse(validUpdate).success).toBe(true)
  })

  it('应该拒绝缺失 data', () => {
    expect(updateScheduleSchema.safeParse({ id: 'sch-001' }).success).toBe(false)
  })

  it('应该拒绝 data 中无效数据', () => {
    const result = updateScheduleSchema.safeParse({
      ...validUpdate,
      data: { ...validUpdate.data, dayOfWeek: 0 },
    })
    expect(result.success).toBe(false)
  })
})

// ==================== idSchema ====================
describe('idSchema', () => {
  it('应该接受有效 ID', () => {
    expect(idSchema.safeParse({ id: 'test-123' }).success).toBe(true)
  })

  it('应该拒绝空 ID', () => {
    const result = idSchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('ID 不能为空')
    }
  })

  it('应该拒绝缺失 id', () => {
    expect(idSchema.safeParse({}).success).toBe(false)
  })
})

// ==================== getSchedulesSchema ====================
describe('getSchedulesSchema', () => {
  it('应该接受空对象（所有字段可选）', () => {
    expect(getSchedulesSchema.safeParse({}).success).toBe(true)
  })

  it('应该接受带 classroomId', () => {
    expect(getSchedulesSchema.safeParse({ classroomId: 'cls-001' }).success).toBe(true)
  })

  it('应该接受带 courseOfferingId', () => {
    expect(getSchedulesSchema.safeParse({ courseOfferingId: 'co-001' }).success).toBe(true)
  })

  it('应该接受带两个筛选条件', () => {
    expect(
      getSchedulesSchema.safeParse({ classroomId: 'cls-001', courseOfferingId: 'co-001' }).success
    ).toBe(true)
  })
})

// ==================== pagedGetSchedulesSchema ====================
describe('pagedGetSchedulesSchema', () => {
  it('应该使用默认分页值', () => {
    const result = pagedGetSchedulesSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.pageSize).toBe(20)
    }
  })

  it('应该接受自定义分页', () => {
    const result = pagedGetSchedulesSchema.safeParse({ page: 2, pageSize: 10 })
    expect(result.success).toBe(true)
  })

  it('应该拒绝 page 为 0', () => {
    expect(pagedGetSchedulesSchema.safeParse({ page: 0 }).success).toBe(false)
  })

  it('应该拒绝 pageSize 为 0', () => {
    expect(pagedGetSchedulesSchema.safeParse({ pageSize: 0 }).success).toBe(false)
  })
})

// ==================== validateResponseSchema ====================
describe('validateResponseSchema', () => {
  it('应该接受 valid: true 且无冲突', () => {
    const result = validateResponseSchema.safeParse({ valid: true, conflicts: [] })
    expect(result.success).toBe(true)
  })

  it('应该接受 valid: false 且有冲突详情', () => {
    const result = validateResponseSchema.safeParse({
      valid: false,
      conflicts: [{ type: 'classroom_conflict', message: '教室在该时间段已被占用' }],
    })
    expect(result.success).toBe(true)
  })

  it('应该拒绝 missing conflicts', () => {
    expect(validateResponseSchema.safeParse({ valid: true }).success).toBe(false)
  })

  it('应该拒绝 conflicts 中缺少 message', () => {
    const result = validateResponseSchema.safeParse({
      valid: false,
      conflicts: [{ type: 'classroom_conflict' }],
    })
    expect(result.success).toBe(false)
  })
})

// ==================== idResponseSchema ====================
describe('idResponseSchema', () => {
  it('应该接受有效 ID 响应', () => {
    expect(idResponseSchema.safeParse({ id: 'test-123' }).success).toBe(true)
  })

  it('应该拒绝空 ID', () => {
    const result = idResponseSchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
  })
})
