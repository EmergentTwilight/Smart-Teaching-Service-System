import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../../../shared/prisma/client.js'
import { ScheduleService } from '../../../modules/course-arrangement/schedule/schedule.service.js'

vi.mock('../../../shared/prisma/client.js', () => ({
  default: {
    classroom: {
      findUnique: vi.fn(),
    },
    schedule: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe('ScheduleService', () => {
  const service = new ScheduleService()
  const input = {
    courseOfferingId: 'co-1',
    classroomId: 'room-1',
    dayOfWeek: 2,
    startWeek: 1,
    endWeek: 16,
    startPeriod: 3,
    endPeriod: 4,
    notes: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('创建排课前应检查教室存在且状态可用', async () => {
    vi.mocked(prisma.classroom.findUnique).mockResolvedValue({
      id: 'room-1',
      status: 'MAINTENANCE',
    } as never)

    await expect(service.create(input)).rejects.toThrow('教室不存在或当前不可用')
    expect(prisma.schedule.create).not.toHaveBeenCalled()
  })

  it('创建排课时应拒绝同教室周次和节次重叠的冲突', async () => {
    vi.mocked(prisma.classroom.findUnique).mockResolvedValue({
      id: 'room-1',
      status: 'AVAILABLE',
    } as never)
    vi.mocked(prisma.schedule.findFirst).mockResolvedValue({ id: 'schedule-existing' } as never)

    await expect(service.create(input)).rejects.toThrow('排课冲突：该教室内已有课程安排')
    expect(prisma.schedule.create).not.toHaveBeenCalled()
  })

  it('校验排课时遇到冲突应返回 valid=false 而不是抛异常', async () => {
    vi.mocked(prisma.schedule.findFirst).mockResolvedValue({ id: 'schedule-existing' } as never)

    await expect(service.validate(input)).resolves.toEqual({
      valid: false,
      conflicts: [{ type: 'classroom_conflict', message: '教室在该时间段已被占用' }],
    })
  })

  it('更新排课时应排除当前记录后再做冲突检测', async () => {
    vi.mocked(prisma.schedule.findUnique).mockResolvedValue({
      id: 'schedule-1',
      ...input,
    } as never)
    vi.mocked(prisma.schedule.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.schedule.update).mockResolvedValue({ id: 'schedule-1' } as never)

    await expect(
      service.update({
        id: 'schedule-1',
        data: {
          ...input,
          startPeriod: 5,
          endPeriod: 6,
        },
      })
    ).resolves.toEqual({ id: 'schedule-1' })

    expect(prisma.schedule.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          classroomId: 'room-1',
          dayOfWeek: 2,
          AND: expect.arrayContaining([{ id: { not: 'schedule-1' } }]),
        }),
      })
    )
  })
})
