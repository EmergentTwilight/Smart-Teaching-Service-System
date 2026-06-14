/**
 * 教室 Schema 单元测试
 * 验证 classroom.types.ts 中所有 Zod schema 的校验行为
 */
import { describe, expect, it } from 'vitest'
import {
  RoomStatusEnum,
  RoomTypeEnum,
  classroomInPrismaSchema,
  classroomQuerySchema,
  pagedClassroomQuerySchema,
  classroomIdSchema,
  updateClassroomSchema,
  availableQuerySchema,
} from '../../../modules/course-arrangement/classroom/classroom.types.js'

// ==================== RoomStatusEnum ====================
describe('RoomStatusEnum', () => {
  describe('valid inputs', () => {
    it('应该接受 AVAILABLE', () => {
      expect(RoomStatusEnum.safeParse('AVAILABLE').success).toBe(true)
    })
    it('应该接受 MAINTENANCE', () => {
      expect(RoomStatusEnum.safeParse('MAINTENANCE').success).toBe(true)
    })
    it('应该接受 UNAVAILABLE', () => {
      expect(RoomStatusEnum.safeParse('UNAVAILABLE').success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('应该拒绝小写值', () => {
      expect(RoomStatusEnum.safeParse('available').success).toBe(false)
      expect(RoomStatusEnum.safeParse('maintenance').success).toBe(false)
    })
    it('应该拒绝空字符串', () => {
      expect(RoomStatusEnum.safeParse('').success).toBe(false)
    })
    it('应该拒绝无效字符串', () => {
      expect(RoomStatusEnum.safeParse('UNKNOWN').success).toBe(false)
    })
  })
})

// ==================== RoomTypeEnum ====================
describe('RoomTypeEnum', () => {
  describe('valid inputs', () => {
    it('应该接受 COMPUTER', () => {
      expect(RoomTypeEnum.safeParse('COMPUTER').success).toBe(true)
    })
    it('应该接受 LAB', () => {
      expect(RoomTypeEnum.safeParse('LAB').success).toBe(true)
    })
    it('应该接受 LECTURE', () => {
      expect(RoomTypeEnum.safeParse('LECTURE').success).toBe(true)
    })
    it('应该接受 MULTIMEDIA', () => {
      expect(RoomTypeEnum.safeParse('MULTIMEDIA').success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('应该拒绝小写值', () => {
      expect(RoomTypeEnum.safeParse('computer').success).toBe(false)
      expect(RoomTypeEnum.safeParse('lab').success).toBe(false)
    })
    it('应该拒绝空字符串', () => {
      expect(RoomTypeEnum.safeParse('').success).toBe(false)
    })
    it('应该拒绝无效值', () => {
      expect(RoomTypeEnum.safeParse('AUDITORIUM').success).toBe(false)
    })
  })
})

// ==================== classroomInPrismaSchema ====================
describe('classroomInPrismaSchema', () => {
  const validClassroom = {
    building: '教学楼A',
    roomNumber: '101',
    campus: '主校区',
    capacity: 60,
    roomType: 'LECTURE',
  }

  describe('valid inputs', () => {
    it('应该接受合法教室数据（不含设备信息）', () => {
      const result = classroomInPrismaSchema.safeParse(validClassroom)
      expect(result.success).toBe(true)
    })

    it('应该接受合法教室数据（含完整设备信息）', () => {
      const result = classroomInPrismaSchema.safeParse({
        ...validClassroom,
        equipment: {
          projector: true,
          airConditioner: true,
          microphone: false,
          computerCount: 30,
        },
      })
      expect(result.success).toBe(true)
    })

    it('状态为空时应该使用默认值 AVAILABLE', () => {
      const result = classroomInPrismaSchema.safeParse(validClassroom)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('AVAILABLE')
      }
    })

    it('应该接受 capacity 为字符串数值（coerce）', () => {
      const result = classroomInPrismaSchema.safeParse({ ...validClassroom, capacity: '30' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.capacity).toBe(30)
      }
    })

    it('应该接受 computerCount 为 0', () => {
      const result = classroomInPrismaSchema.safeParse({
        ...validClassroom,
        equipment: { projector: false, airConditioner: false, microphone: false, computerCount: 0 },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('building validation', () => {
    it('应该拒绝空教学楼', () => {
      const result = classroomInPrismaSchema.safeParse({ ...validClassroom, building: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('教学楼不能为空')
      }
    })
  })

  describe('roomNumber validation', () => {
    it('应该拒绝空教室号', () => {
      const result = classroomInPrismaSchema.safeParse({ ...validClassroom, roomNumber: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('教室号不能为空')
      }
    })
  })

  describe('campus validation', () => {
    it('应该拒绝空校区', () => {
      const result = classroomInPrismaSchema.safeParse({ ...validClassroom, campus: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('校区不能为空')
      }
    })
  })

  describe('capacity validation', () => {
    it('应该拒绝负数容量', () => {
      const result = classroomInPrismaSchema.safeParse({ ...validClassroom, capacity: -1 })
      expect(result.success).toBe(false)
    })

    it('应该拒绝 0 容量', () => {
      const result = classroomInPrismaSchema.safeParse({ ...validClassroom, capacity: 0 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/正整数/)
      }
    })

    it('应该拒绝非整数容量', () => {
      const result = classroomInPrismaSchema.safeParse({ ...validClassroom, capacity: 30.5 })
      expect(result.success).toBe(false)
    })
  })

  describe('roomType validation', () => {
    it('应该拒绝无效教室类型', () => {
      const result = classroomInPrismaSchema.safeParse({
        ...validClassroom,
        roomType: 'AUDITORIUM',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('equipment validation', () => {
    it('应该拒绝 computerCount 为负数', () => {
      const result = classroomInPrismaSchema.safeParse({
        ...validClassroom,
        equipment: { projector: true, airConditioner: true, microphone: true, computerCount: -1 },
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝 computerCount 为小数', () => {
      const result = classroomInPrismaSchema.safeParse({
        ...validClassroom,
        equipment: { projector: true, airConditioner: true, microphone: true, computerCount: 1.5 },
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝 equipment 中缺少必填字段', () => {
      const result = classroomInPrismaSchema.safeParse({
        ...validClassroom,
        equipment: { projector: true },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('missing fields', () => {
    it('应该拒绝缺失 building', () => {
      const { building, ...rest } = validClassroom
      expect(classroomInPrismaSchema.safeParse(rest).success).toBe(false)
    })
    it('应该拒绝缺失 roomNumber', () => {
      const { roomNumber, ...rest } = validClassroom
      expect(classroomInPrismaSchema.safeParse(rest).success).toBe(false)
    })
    it('应该拒绝缺失 campus', () => {
      const { campus, ...rest } = validClassroom
      expect(classroomInPrismaSchema.safeParse(rest).success).toBe(false)
    })
    it('应该拒绝缺失 capacity', () => {
      const { capacity, ...rest } = validClassroom
      expect(classroomInPrismaSchema.safeParse(rest).success).toBe(false)
    })
    it('应该拒绝缺失 roomType', () => {
      const { roomType, ...rest } = validClassroom
      expect(classroomInPrismaSchema.safeParse(rest).success).toBe(false)
    })
  })
})

// ==================== classroomQuerySchema ====================
describe('classroomQuerySchema', () => {
  it('应该接受空对象（所有字段可选）', () => {
    expect(classroomQuerySchema.safeParse({}).success).toBe(true)
  })

  it('应该接受完整查询参数', () => {
    const result = classroomQuerySchema.safeParse({
      campus: '主校区',
      building: '教学楼A',
      roomType: 'LECTURE',
      status: 'AVAILABLE',
      keyword: '101',
    })
    expect(result.success).toBe(true)
  })

  it('应该拒绝无效 roomType', () => {
    const result = classroomQuerySchema.safeParse({ roomType: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('应该拒绝无效 status', () => {
    const result = classroomQuerySchema.safeParse({ status: 'invalid' })
    expect(result.success).toBe(false)
  })
})

// ==================== pagedClassroomQuerySchema ====================
describe('pagedClassroomQuerySchema', () => {
  describe('valid inputs', () => {
    it('应该接受合法的分页参数', () => {
      const result = pagedClassroomQuerySchema.safeParse({ page: 1, pageSize: 20 })
      expect(result.success).toBe(true)
    })

    it('应该接受 pageSize 为字符串数值（coerce）', () => {
      const result = pagedClassroomQuerySchema.safeParse({ page: '1', pageSize: '10' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.pageSize).toBe(10)
      }
    })
  })

  describe('invalid inputs', () => {
    it('应该拒绝 page 为 0', () => {
      expect(pagedClassroomQuerySchema.safeParse({ page: 0, pageSize: 20 }).success).toBe(false)
    })

    it('应该拒绝 page 为负数', () => {
      expect(pagedClassroomQuerySchema.safeParse({ page: -1, pageSize: 20 }).success).toBe(false)
    })

    it('应该拒绝 pageSize 为 0', () => {
      expect(pagedClassroomQuerySchema.safeParse({ page: 1, pageSize: 0 }).success).toBe(false)
    })

    it('应该拒绝 pageSize 超过 100', () => {
      expect(pagedClassroomQuerySchema.safeParse({ page: 1, pageSize: 101 }).success).toBe(false)
    })

    it('应该拒绝缺失必填分页字段', () => {
      expect(pagedClassroomQuerySchema.safeParse({}).success).toBe(false)
    })
  })
})

// ==================== classroomIdSchema ====================
describe('classroomIdSchema', () => {
  it('应该接受有效教室 ID', () => {
    expect(classroomIdSchema.safeParse({ id: 'cls-123' }).success).toBe(true)
  })

  it('应该拒绝空教室 ID', () => {
    const result = classroomIdSchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('教室ID不能为空')
    }
  })

  it('应该拒绝缺失 id', () => {
    expect(classroomIdSchema.safeParse({}).success).toBe(false)
  })
})

// ==================== updateClassroomSchema ====================
describe('updateClassroomSchema', () => {
  const validUpdate = {
    id: 'cls-123',
    data: {
      building: '教学楼B',
      roomNumber: '202',
      campus: '主校区',
      capacity: 80,
      roomType: 'LAB',
    },
  }

  it('应该接受合法更新数据', () => {
    expect(updateClassroomSchema.safeParse(validUpdate).success).toBe(true)
  })

  it('应该拒绝缺失 data', () => {
    const result = updateClassroomSchema.safeParse({ id: 'cls-123' })
    expect(result.success).toBe(false)
  })

  it('应该拒绝 data 中无效字段', () => {
    const result = updateClassroomSchema.safeParse({
      ...validUpdate,
      data: { ...validUpdate.data, roomType: 'INVALID' },
    })
    expect(result.success).toBe(false)
  })
})

// ==================== availableQuerySchema ====================
describe('availableQuerySchema', () => {
  const validQuery = {
    dayOfWeek: 1,
    startWeek: 1,
    endWeek: 16,
    startPeriod: 1,
    endPeriod: 2,
  }

  describe('valid inputs', () => {
    it('应该接受合法查询（不含可选字段）', () => {
      expect(availableQuerySchema.safeParse(validQuery).success).toBe(true)
    })

    it('应该接受合法查询（含所有可选字段）', () => {
      const result = availableQuerySchema.safeParse({
        ...validQuery,
        capacity: 50,
        campus: '主校区',
        roomType: 'LECTURE',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('dayOfWeek validation', () => {
    it('应该拒绝 dayOfWeek < 1', () => {
      expect(availableQuerySchema.safeParse({ ...validQuery, dayOfWeek: 0 }).success).toBe(false)
    })
    it('应该拒绝 dayOfWeek > 7', () => {
      expect(availableQuerySchema.safeParse({ ...validQuery, dayOfWeek: 8 }).success).toBe(false)
    })
    it('应该接受 dayOfWeek = 1', () => {
      expect(availableQuerySchema.safeParse({ ...validQuery, dayOfWeek: 1 }).success).toBe(true)
    })
    it('应该接受 dayOfWeek = 7', () => {
      expect(availableQuerySchema.safeParse({ ...validQuery, dayOfWeek: 7 }).success).toBe(true)
    })
  })

  describe('capacity validation', () => {
    it('应该拒绝 capacity 为 0', () => {
      const result = availableQuerySchema.safeParse({ ...validQuery, capacity: 0 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/正整数/)
      }
    })
    it('应该拒绝 capacity 为负数', () => {
      expect(availableQuerySchema.safeParse({ ...validQuery, capacity: -1 }).success).toBe(false)
    })
  })

  describe('roomType validation', () => {
    it('应该拒绝无效教室类型', () => {
      expect(availableQuerySchema.safeParse({ ...validQuery, roomType: 'INVALID' }).success).toBe(
        false
      )
    })
  })
})
