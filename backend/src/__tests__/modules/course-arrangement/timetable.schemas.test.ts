/**
 * 课表 Schema 单元测试
 * 验证 timetable.types.ts 中所有 Zod schema 的校验行为
 */
import { describe, expect, it } from 'vitest'
import {
  getByCourseOfferingSchema,
  getByClassroomSchema,
  getTimetablesWithoutAuthSchema,
  pagedGetTimetablesWithoutAuthSchema,
  pagedGetTimetablesSchema,
  exportTimetableSchema,
  timetableListResponseSchema,
  pagedTimetableListResponseSchema,
  exportResponseSchema,
} from '../../../modules/course-arrangement/timetable/timetable.types.js'

// ==================== getByCourseOfferingSchema ====================
describe('getByCourseOfferingSchema', () => {
  it('应该接受有效 courseOfferingId', () => {
    expect(getByCourseOfferingSchema.safeParse({ courseOfferingId: 'co-001' }).success).toBe(true)
  })

  it('应该拒绝空 courseOfferingId', () => {
    const result = getByCourseOfferingSchema.safeParse({ courseOfferingId: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('无效的课程开设 ID')
    }
  })

  it('应该拒绝缺失 courseOfferingId', () => {
    expect(getByCourseOfferingSchema.safeParse({}).success).toBe(false)
  })
})

// ==================== getByClassroomSchema ====================
describe('getByClassroomSchema', () => {
  it('应该接受有效 classroomId（不含 semesterId）', () => {
    expect(getByClassroomSchema.safeParse({ classroomId: 'cls-001', query: {} }).success).toBe(true)
  })

  it('应该接受有效 classroomId（含 semesterId）', () => {
    const result = getByClassroomSchema.safeParse({
      classroomId: 'cls-001',
      query: { semesterId: 'sem-001' },
    })
    expect(result.success).toBe(true)
  })

  it('应该拒绝空 classroomId', () => {
    const result = getByClassroomSchema.safeParse({ classroomId: '', query: {} })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('无效的教室 ID')
    }
  })
})

// ==================== getTimetablesWithoutAuthSchema ====================
describe('getTimetablesWithoutAuthSchema', () => {
  it('应该接受空对象（所有字段可选）', () => {
    expect(getTimetablesWithoutAuthSchema.safeParse({}).success).toBe(true)
  })

  it('应该接受完整参数', () => {
    const result = getTimetablesWithoutAuthSchema.safeParse({
      semesterId: 'sem-001',
      classroomId: 'cls-001',
      courseOfferingId: 'co-001',
    })
    expect(result.success).toBe(true)
  })

  it('应该接受部分参数', () => {
    expect(getTimetablesWithoutAuthSchema.safeParse({ semesterId: 'sem-001' }).success).toBe(true)
  })
})

// ==================== pagedGetTimetablesWithoutAuthSchema ====================
describe('pagedGetTimetablesWithoutAuthSchema', () => {
  it('应该使用默认分页值', () => {
    const result = pagedGetTimetablesWithoutAuthSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.pageSize).toBe(10)
    }
  })

  it('应该接受自定义分页', () => {
    expect(pagedGetTimetablesWithoutAuthSchema.safeParse({ page: 2, pageSize: 20 }).success).toBe(
      true
    )
  })

  it('应该拒绝 page 为 0', () => {
    expect(pagedGetTimetablesWithoutAuthSchema.safeParse({ page: 0 }).success).toBe(false)
  })
})

// ==================== pagedGetTimetablesSchema ====================
describe('pagedGetTimetablesSchema', () => {
  const validInput = {
    query: { semesterId: 'sem-001', page: 1, pageSize: 10 },
    user: { userId: 'user-001', roles: ['teacher'] },
  }

  it('应该接受合法输入（teacher）', () => {
    expect(pagedGetTimetablesSchema.safeParse(validInput).success).toBe(true)
  })

  it('应该接受 student 角色', () => {
    const result = pagedGetTimetablesSchema.safeParse({
      ...validInput,
      user: { userId: 'user-002', roles: ['student'] },
    })
    expect(result.success).toBe(true)
  })

  it('应该接受 admin 角色', () => {
    const result = pagedGetTimetablesSchema.safeParse({
      ...validInput,
      user: { userId: 'user-003', roles: ['admin'] },
    })
    expect(result.success).toBe(true)
  })

  it('应该接受多角色', () => {
    const result = pagedGetTimetablesSchema.safeParse({
      ...validInput,
      user: { userId: 'user-004', roles: ['admin', 'teacher'] },
    })
    expect(result.success).toBe(true)
  })

  it('应该拒绝空 query', () => {
    expect(pagedGetTimetablesSchema.safeParse({ user: validInput.user }).success).toBe(false)
  })

  it('应该拒绝缺失 user', () => {
    expect(pagedGetTimetablesSchema.safeParse({ query: validInput.query }).success).toBe(false)
  })

  it('应该拒绝无效角色', () => {
    const result = pagedGetTimetablesSchema.safeParse({
      ...validInput,
      user: { userId: 'user-005', roles: ['superadmin'] },
    })
    expect(result.success).toBe(false)
  })
})

// ==================== exportTimetableSchema ====================
describe('exportTimetableSchema', () => {
  describe('valid inputs', () => {
    it('应该接受 classroom 导出', () => {
      const result = exportTimetableSchema.safeParse({
        format: 'csv',
        targetType: 'classroom',
        targetId: 'cls-001',
      })
      expect(result.success).toBe(true)
    })

    it('应该接受 teacher 导出', () => {
      const result = exportTimetableSchema.safeParse({
        format: 'csv',
        targetType: 'teacher',
        targetId: 'tch-001',
      })
      expect(result.success).toBe(true)
    })

    it('应该接受 student 导出', () => {
      const result = exportTimetableSchema.safeParse({
        format: 'csv',
        targetType: 'student',
        targetId: 'stu-001',
      })
      expect(result.success).toBe(true)
    })

    it('应该接受 global 导出', () => {
      const result = exportTimetableSchema.safeParse({
        format: 'csv',
        targetType: 'global',
        targetId: 'all',
      })
      expect(result.success).toBe(true)
    })

    it('应该接受带 semesterId', () => {
      const result = exportTimetableSchema.safeParse({
        format: 'csv',
        targetType: 'classroom',
        targetId: 'cls-001',
        semesterId: 'sem-001',
      })
      expect(result.success).toBe(true)
    })

    it('应该接受带周次范围', () => {
      const result = exportTimetableSchema.safeParse({
        format: 'csv',
        targetType: 'classroom',
        targetId: 'cls-001',
        startWeek: 1,
        endWeek: 16,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('format validation', () => {
    it('应该拒绝 pdf 格式', () => {
      const result = exportTimetableSchema.safeParse({
        format: 'pdf' as const,
        targetType: 'classroom',
        targetId: 'cls-001',
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝 excel 格式', () => {
      const result = exportTimetableSchema.safeParse({
        format: 'excel' as const,
        targetType: 'classroom',
        targetId: 'cls-001',
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝空格式', () => {
      const result = exportTimetableSchema.safeParse({
        format: '',
        targetType: 'classroom',
        targetId: 'cls-001',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('targetType validation', () => {
    it('应该拒绝无效 targetType', () => {
      const result = exportTimetableSchema.safeParse({
        format: 'csv',
        targetType: 'building',
        targetId: 'bld-001',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('targetId validation', () => {
    it('应该拒绝空 targetId', () => {
      const result = exportTimetableSchema.safeParse({
        format: 'csv',
        targetType: 'classroom',
        targetId: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('目标 ID 不能为空')
      }
    })
  })

  describe('missing fields', () => {
    it('应该拒绝缺失 format', () => {
      expect(
        exportTimetableSchema.safeParse({ targetType: 'classroom', targetId: 'cls-001' }).success
      ).toBe(false)
    })

    it('应该拒绝缺失 targetType', () => {
      expect(exportTimetableSchema.safeParse({ format: 'csv', targetId: 'cls-001' }).success).toBe(
        false
      )
    })

    it('应该拒绝缺失 targetId', () => {
      expect(
        exportTimetableSchema.safeParse({ format: 'csv', targetType: 'classroom' }).success
      ).toBe(false)
    })
  })
})

// ==================== timetableListResponseSchema ====================
describe('timetableListResponseSchema', () => {
  const validSchedule = {
    id: 'sch-001',
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
    courseName: '高等数学',
    teacherId: 'tch-001',
    teacherName: '张老师',
    classroom: {
      id: 'cls-001',
      classroom: {
        building: '教学楼A',
        roomNumber: '101',
        campus: '主校区',
        capacity: 60,
        roomType: 'LECTURE',
        status: 'AVAILABLE',
      },
    },
  }

  it('应该接受合法课表列表', () => {
    expect(timetableListResponseSchema.safeParse([validSchedule]).success).toBe(true)
  })

  it('应该接受空数组', () => {
    expect(timetableListResponseSchema.safeParse([]).success).toBe(true)
  })

  it('应该拒绝非数组', () => {
    expect(timetableListResponseSchema.safeParse(validSchedule).success).toBe(false)
  })
})

// ==================== pagedTimetableListResponseSchema ====================
describe('pagedTimetableListResponseSchema', () => {
  it('应该接受合法分页响应', () => {
    const result = pagedTimetableListResponseSchema.safeParse({
      page: 1,
      pageSize: 10,
      total: 1,
      items: [],
    })
    expect(result.success).toBe(true)
  })

  it('应该拒绝缺失 total', () => {
    expect(
      pagedTimetableListResponseSchema.safeParse({ page: 1, pageSize: 10, items: [] }).success
    ).toBe(false)
  })
})

// ==================== exportResponseSchema ====================
describe('exportResponseSchema', () => {
  it('应该接受合法导出响应', () => {
    expect(
      exportResponseSchema.safeParse({ filename: 'timetable.csv', content: 'a,b,c\n1,2,3' }).success
    ).toBe(true)
  })

  it('应该拒绝空 filename', () => {
    expect(exportResponseSchema.safeParse({ filename: '', content: '' }).success).toBe(false)
  })
})
