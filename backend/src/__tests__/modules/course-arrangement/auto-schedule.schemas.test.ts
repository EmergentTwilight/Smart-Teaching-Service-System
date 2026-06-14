/**
 * 自动排课 Schema 单元测试
 * 验证 auto-schedule.types.ts 中所有 Zod schema 的校验行为
 */
import { describe, expect, it } from 'vitest'
import {
  createTaskSchema,
  taskIdSchema,
  autoScheduleTaskResponseSchema,
  applyTaskResponseSchema,
  scheduleSchema,
  scheduleSuccessSchema,
  scheduleFailureSchema,
} from '../../../modules/course-arrangement/auto-schedule/auto-schedule.types.js'

// ==================== createTaskSchema ====================
describe('createTaskSchema', () => {
  it('应该接受仅含 semesterId', () => {
    expect(createTaskSchema.safeParse({ semesterId: 'sem-001' }).success).toBe(true)
  })

  it('应该接受含 courseOfferingIds', () => {
    const result = createTaskSchema.safeParse({
      semesterId: 'sem-001',
      courseOfferingIds: ['co-001', 'co-002'],
    })
    expect(result.success).toBe(true)
  })

  it('应该接受空 courseOfferingIds 数组', () => {
    const result = createTaskSchema.safeParse({
      semesterId: 'sem-001',
      courseOfferingIds: [],
    })
    expect(result.success).toBe(true)
  })

  it('应该拒绝空 semesterId', () => {
    const result = createTaskSchema.safeParse({ semesterId: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('学期ID不能为空')
    }
  })

  it('应该拒绝缺失 semesterId', () => {
    expect(createTaskSchema.safeParse({}).success).toBe(false)
  })

  it('应该拒绝 courseOfferingIds 中包含空字符串', () => {
    const result = createTaskSchema.safeParse({
      semesterId: 'sem-001',
      courseOfferingIds: [''],
    })
    expect(result.success).toBe(false)
  })
})

// ==================== taskIdSchema ====================
describe('taskIdSchema', () => {
  it('应该接受有效 taskId', () => {
    expect(taskIdSchema.safeParse({ taskId: 'task-001' }).success).toBe(true)
  })

  it('应该拒绝空 taskId', () => {
    const result = taskIdSchema.safeParse({ taskId: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('任务ID不能为空')
    }
  })

  it('应该拒绝缺失 taskId', () => {
    expect(taskIdSchema.safeParse({}).success).toBe(false)
  })
})

// ==================== scheduleSchema (auto-schedule) ====================
describe('scheduleSchema (auto-schedule)', () => {
  const validSchedule = {
    schedule: {
      courseOfferingId: 'co-001',
      classroomId: 'cls-001',
      dayOfWeek: 1,
      startWeek: 1,
      endWeek: 16,
      startPeriod: 1,
      endPeriod: 2,
      notes: null,
    },
    teacherId: 'tch-001',
  }

  it('应该接受合法排课数据', () => {
    expect(scheduleSchema.safeParse(validSchedule).success).toBe(true)
  })

  it('应该拒绝空 teacherId', () => {
    const result = scheduleSchema.safeParse({ ...validSchedule, teacherId: '' })
    expect(result.success).toBe(false)
  })

  it('应该拒绝缺失 teacherId', () => {
    const { teacherId: _, ...rest } = validSchedule
    expect(scheduleSchema.safeParse(rest).success).toBe(false)
  })

  it('应该拒绝 schedule 中无效数据', () => {
    const result = scheduleSchema.safeParse({
      ...validSchedule,
      schedule: { ...validSchedule.schedule, dayOfWeek: 0 },
    })
    expect(result.success).toBe(false)
  })
})

// ==================== scheduleSuccessSchema ====================
describe('scheduleSuccessSchema', () => {
  const validSuccess = {
    courseOfferingId: 'co-001',
    teacherId: 'tch-001',
    classroomId: 'cls-001',
    dayOfWeek: 1,
    startWeek: 1,
    endWeek: 16,
    startPeriod: 1,
    endPeriod: 2,
    notes: null,
  }

  it('应该接受合法成功排课数据', () => {
    expect(scheduleSuccessSchema.safeParse(validSuccess).success).toBe(true)
  })

  it('应该拒绝缺失必填字段', () => {
    const { courseOfferingId: _, ...rest } = validSuccess
    expect(scheduleSuccessSchema.safeParse(rest).success).toBe(false)
  })
})

// ==================== scheduleFailureSchema ====================
describe('scheduleFailureSchema', () => {
  const validFailure = {
    courseOfferingId: 'co-001',
    courseName: '高等数学',
    teacherName: '张老师',
    reason: 'no_available_slot',
    detail: '无法在满足硬约束条件下找到可用教室或时间段',
  }

  it('应该接受合法失败记录', () => {
    expect(scheduleFailureSchema.safeParse(validFailure).success).toBe(true)
  })

  it('应该拒绝空 courseName', () => {
    const result = scheduleFailureSchema.safeParse({ ...validFailure, courseName: '' })
    expect(result.success).toBe(false)
  })

  it('应该拒绝空 teacherName', () => {
    const result = scheduleFailureSchema.safeParse({ ...validFailure, teacherName: '' })
    expect(result.success).toBe(false)
  })
})

// ==================== autoScheduleTaskResponseSchema ====================
describe('autoScheduleTaskResponseSchema', () => {
  describe('valid inputs', () => {
    it('应该接受 queued 状态（无 result）', () => {
      const result = autoScheduleTaskResponseSchema.safeParse({
        taskId: 'task-001',
        status: 'queued',
        progress: 0,
        semesterId: 'sem-001',
      })
      expect(result.success).toBe(true)
    })

    it('应该接受 completed 状态（含 result）', () => {
      const result = autoScheduleTaskResponseSchema.safeParse({
        taskId: 'task-001',
        status: 'completed',
        progress: 100,
        semesterId: 'sem-001',
        result: {
          successRate: 85,
          schedules: [],
          failures: [],
        },
      })
      expect(result.success).toBe(true)
    })

    it('应该接受 processing 状态（部分进度）', () => {
      const result = autoScheduleTaskResponseSchema.safeParse({
        taskId: 'task-001',
        status: 'processing',
        progress: 50,
        semesterId: 'sem-001',
      })
      expect(result.success).toBe(true)
    })

    it('应该接受 failed 状态', () => {
      const result = autoScheduleTaskResponseSchema.safeParse({
        taskId: 'task-001',
        status: 'failed',
        progress: 30,
        semesterId: 'sem-001',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('status validation', () => {
    it('应该拒绝无效状态', () => {
      const result = autoScheduleTaskResponseSchema.safeParse({
        taskId: 'task-001',
        status: 'unknown',
        progress: 0,
        semesterId: 'sem-001',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('progress validation', () => {
    it('应该拒绝 progress < 0', () => {
      const result = autoScheduleTaskResponseSchema.safeParse({
        taskId: 'task-001',
        status: 'queued',
        progress: -1,
        semesterId: 'sem-001',
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝 progress > 100', () => {
      const result = autoScheduleTaskResponseSchema.safeParse({
        taskId: 'task-001',
        status: 'completed',
        progress: 101,
        semesterId: 'sem-001',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('result validation', () => {
    it('应该拒绝 successRate > 100', () => {
      const result = autoScheduleTaskResponseSchema.safeParse({
        taskId: 'task-001',
        status: 'completed',
        progress: 100,
        semesterId: 'sem-001',
        result: {
          successRate: 150,
          schedules: [],
          failures: [],
        },
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝 successRate < 0', () => {
      const result = autoScheduleTaskResponseSchema.safeParse({
        taskId: 'task-001',
        status: 'completed',
        progress: 100,
        semesterId: 'sem-001',
        result: {
          successRate: -1,
          schedules: [],
          failures: [],
        },
      })
      expect(result.success).toBe(false)
    })
  })
})

// ==================== applyTaskResponseSchema ====================
describe('applyTaskResponseSchema', () => {
  it('应该接受合法应用结果', () => {
    expect(applyTaskResponseSchema.safeParse({ appliedCount: 10, ignoredCount: 2 }).success).toBe(
      true
    )
  })

  it('应该接受全部成功', () => {
    expect(applyTaskResponseSchema.safeParse({ appliedCount: 10, ignoredCount: 0 }).success).toBe(
      true
    )
  })

  it('应该接受全部失败', () => {
    expect(applyTaskResponseSchema.safeParse({ appliedCount: 0, ignoredCount: 10 }).success).toBe(
      true
    )
  })

  it('应该拒绝负数 appliedCount', () => {
    expect(applyTaskResponseSchema.safeParse({ appliedCount: -1, ignoredCount: 0 }).success).toBe(
      false
    )
  })

  it('应该拒绝小数 ignoredCount', () => {
    expect(applyTaskResponseSchema.safeParse({ appliedCount: 5, ignoredCount: 1.5 }).success).toBe(
      false
    )
  })
})
