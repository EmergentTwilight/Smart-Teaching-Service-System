import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../../../shared/prisma/client.js'
import { ruleService } from '../../../modules/course-arrangement/rules/rule.service.js'
import { AutoScheduleService } from '../../../modules/course-arrangement/auto-schedule/auto-schedule.service.js'
import type { SchedulingRule } from '../../../modules/course-arrangement/rules/rule.types.js'

vi.mock('../../../shared/prisma/client.js', () => ({
  default: {
    classroom: {
      findMany: vi.fn(),
    },
    courseOffering: {
      findMany: vi.fn(),
    },
    schedule: {
      createMany: vi.fn(),
    },
  },
}))

vi.mock('../../../modules/course-arrangement/rules/rule.service.js', () => ({
  ruleService: {
    getRulesMap: vi.fn(),
  },
}))

async function waitForTask(service: AutoScheduleService, taskId: string) {
  await vi.waitFor(async () => {
    const task = await service.getTaskStatus({ taskId })
    expect(['completed', 'failed']).toContain(task.status)
  })
  return service.getTaskStatus({ taskId })
}

function emptyRule(overrides: Partial<SchedulingRule> = {}): SchedulingRule {
  return {
    hardConstraints: {
      unavailableTimeSlots: [],
    },
    softConstraints: {
      preferredTimeSlots: [],
      continuousPeriods: false,
    },
    ...overrides,
  }
}

describe('AutoScheduleService', () => {
  let service: AutoScheduleService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AutoScheduleService()
  })

  it('自动排课应遵守课程要求的教室类型和容量硬约束', async () => {
    vi.mocked(prisma.courseOffering.findMany).mockResolvedValue([
      {
        id: 'co-1',
        courseId: 'course-1',
        semesterId: 'sem-1',
        teacherId: 'teacher-1',
        capacity: 80,
        course: { id: 'course-1', name: '数据库系统' },
        teacher: { user: { username: '王老师' } },
      },
    ] as never)
    vi.mocked(prisma.classroom.findMany).mockResolvedValue([
      {
        id: 'room-small',
        capacity: 40,
        roomType: 'LECTURE',
        building: '东1',
      },
      {
        id: 'room-computer',
        capacity: 120,
        roomType: 'COMPUTER',
        building: '东2',
      },
    ] as never)
    vi.mocked(ruleService.getRulesMap).mockResolvedValue(
      new Map([
        [
          'course:course-1',
          emptyRule({
            hardConstraints: { unavailableTimeSlots: [], requiredRoomType: 'COMPUTER' },
          }),
        ],
      ])
    )

    const task = await service.createSchedulingTask({ semesterId: 'sem-1' })
    const completed = await waitForTask(service, task.taskId)

    expect(completed.status).toBe('completed')
    expect(completed.result?.successRate).toBe(100)
    expect(completed.result?.schedules[0].schedule.classroomId).toBe('room-computer')
  })

  it('自动排课应避开教师不可用时间，并优先使用软约束偏好教学楼', async () => {
    vi.mocked(prisma.courseOffering.findMany).mockResolvedValue([
      {
        id: 'co-1',
        courseId: 'course-1',
        semesterId: 'sem-1',
        teacherId: 'teacher-1',
        capacity: 60,
        course: { id: 'course-1', name: '操作系统' },
        teacher: { user: { username: '李老师' } },
      },
    ] as never)
    vi.mocked(prisma.classroom.findMany).mockResolvedValue([
      {
        id: 'room-normal',
        capacity: 100,
        roomType: 'LECTURE',
        building: '东1',
      },
      {
        id: 'room-preferred',
        capacity: 100,
        roomType: 'LECTURE',
        building: '西2',
      },
    ] as never)
    vi.mocked(ruleService.getRulesMap).mockResolvedValue(
      new Map([
        [
          'teacher:teacher-1',
          emptyRule({
            hardConstraints: {
              unavailableTimeSlots: [{ dayOfWeek: 1, startPeriod: 1, endPeriod: 2 }],
            },
            softConstraints: {
              preferredBuilding: '西2',
              preferredTimeSlots: [{ dayOfWeek: 1, startPeriod: 1, endPeriod: 2 }],
              continuousPeriods: false,
            },
          }),
        ],
      ])
    )

    const task = await service.createSchedulingTask({ semesterId: 'sem-1' })
    const completed = await waitForTask(service, task.taskId)
    const schedule = completed.result?.schedules[0].schedule

    expect(completed.result?.successRate).toBe(100)
    expect(schedule?.classroomId).toBe('room-preferred')
    expect(
      schedule?.dayOfWeek === 1 && schedule?.startPeriod >= 1 && schedule?.startPeriod <= 2
    ).toBe(false)
  })

  it('应用自动排课结果后应批量写入 Schedule 并返回成功/失败数量', async () => {
    vi.mocked(prisma.courseOffering.findMany).mockResolvedValue([
      {
        id: 'co-1',
        courseId: 'course-1',
        semesterId: 'sem-1',
        teacherId: 'teacher-1',
        capacity: 60,
        course: { id: 'course-1', name: '软件工程' },
        teacher: { user: { username: '赵老师' } },
      },
    ] as never)
    vi.mocked(prisma.classroom.findMany).mockResolvedValue([
      {
        id: 'room-1',
        capacity: 100,
        roomType: 'LECTURE',
        building: '东1',
      },
    ] as never)
    vi.mocked(ruleService.getRulesMap).mockResolvedValue(new Map())
    vi.mocked(prisma.schedule.createMany).mockResolvedValue({ count: 1 } as never)

    const task = await service.createSchedulingTask({ semesterId: 'sem-1' })
    await waitForTask(service, task.taskId)

    await expect(service.applyResults({ taskId: task.taskId })).resolves.toEqual({
      appliedCount: 1,
      ignoredCount: 0,
    })
    expect(prisma.schedule.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          courseOfferingId: 'co-1',
          classroomId: 'room-1',
        }),
      ],
    })
  })
})
