import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../../../shared/prisma/client.js'
import { ClassroomService } from '../../../modules/course-arrangement/classroom/classroom.service.js'

vi.mock('../../../shared/prisma/client.js', () => ({
  default: {
    classroom: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    schedule: {
      findMany: vi.fn(),
    },
  },
}))

describe('ClassroomService', () => {
  const service = new ClassroomService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('创建教室时应拒绝同校区同楼同房间号的重复教室', async () => {
    vi.mocked(prisma.classroom.findFirst).mockResolvedValue({ id: 'room-existing' } as never)

    await expect(
      service.create({
        status: 'AVAILABLE',
        campus: '紫金港',
        building: '东1',
        roomNumber: '101',
        capacity: 80,
        roomType: 'LECTURE',
      })
    ).rejects.toThrow('该教室已存在')

    expect(prisma.classroom.create).not.toHaveBeenCalled()
  })

  it('创建教室时应保留设备信息', async () => {
    vi.mocked(prisma.classroom.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.classroom.create).mockResolvedValue({ id: 'room-1' } as never)

    const input = {
      status: 'AVAILABLE' as const,
      campus: '紫金港',
      building: '东1',
      roomNumber: '101',
      capacity: 80,
      roomType: 'MULTIMEDIA' as const,
      equipment: {
        projector: true,
        airConditioner: true,
        microphone: false,
        computerCount: 1,
      },
    }

    await expect(service.create(input)).resolves.toEqual({ id: 'room-1' })
    expect(prisma.classroom.create).toHaveBeenCalledWith({ data: input })
  })

  it('查询可用教室时应排除时间冲突教室并保留容量/校区/类型条件', async () => {
    vi.mocked(prisma.schedule.findMany).mockResolvedValue([{ classroomId: 'room-busy' }] as never)
    vi.mocked(prisma.classroom.findMany).mockResolvedValue([
      {
        id: 'room-free',
        status: 'AVAILABLE',
        campus: '紫金港',
        building: '东2',
        roomNumber: '201',
        capacity: 120,
        roomType: 'LECTURE',
        equipment: null,
      },
    ] as never)

    const result = await service.findAvailable({
      dayOfWeek: 1,
      startWeek: 1,
      endWeek: 16,
      startPeriod: 1,
      endPeriod: 2,
      capacity: 100,
      campus: '紫金港',
      roomType: 'LECTURE',
    })

    expect(prisma.classroom.findMany).toHaveBeenCalledWith({
      where: {
        id: { notIn: ['room-busy'] },
        status: 'AVAILABLE',
        capacity: { gte: 100 },
        roomType: 'LECTURE',
        campus: '紫金港',
      },
    })
    expect(result).toEqual([
      {
        id: 'room-free',
        classroom: {
          status: 'AVAILABLE',
          campus: '紫金港',
          building: '东2',
          roomNumber: '201',
          capacity: 120,
          roomType: 'LECTURE',
          equipment: undefined,
        },
      },
    ])
  })
})
