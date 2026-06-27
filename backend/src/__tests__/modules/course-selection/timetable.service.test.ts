import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  selectionPeriod: {
    findFirst: vi.fn(),
  },
  semester: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  enrollment: {
    findMany: vi.fn(),
  },
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

import { timetableService } from '../../../modules/course-selection/timetable.service.js'

beforeEach(() => {
  vi.resetAllMocks()

  prismaMock.selectionPeriod.findFirst.mockResolvedValue(null)
  prismaMock.semester.findFirst.mockResolvedValue({
    id: 'semester-current',
    name: '2026 春季',
  })
  prismaMock.semester.findMany.mockResolvedValue([
    {
      id: 'semester-current',
      name: '2026 春季',
      status: 'CURRENT',
      startDate: new Date('2026-02-23T00:00:00.000Z'),
      endDate: new Date('2026-07-10T00:00:00.000Z'),
    },
    {
      id: 'semester-history',
      name: '2025 秋季',
      status: 'ENDED',
      startDate: new Date('2025-09-01T00:00:00.000Z'),
      endDate: new Date('2026-01-16T00:00:00.000Z'),
    },
  ])
  prismaMock.enrollment.findMany.mockResolvedValue([
    {
      courseOffering: {
        semesterId: 'semester-current',
        schedules: [{ id: 'schedule-1' }, { id: 'schedule-2' }],
      },
    },
    {
      courseOffering: {
        semesterId: 'semester-history',
        schedules: [{ id: 'schedule-history' }],
      },
    },
    {
      courseOffering: {
        semesterId: 'semester-history',
        schedules: [],
      },
    },
  ])
})

describe('timetableService.listMyTimetableSemesters', () => {
  it('returns selectable timetable semesters with current default and schedule counts', async () => {
    const result = await timetableService.listMyTimetableSemesters('student-1')

    expect(result.defaultSemesterId).toBe('semester-current')
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'semester-current',
        status: 'current',
        isCurrent: true,
        isDefault: true,
        enrolledCount: 1,
        scheduledItemCount: 2,
        missingScheduleCount: 0,
      }),
      expect.objectContaining({
        id: 'semester-history',
        status: 'ended',
        isCurrent: false,
        isDefault: false,
        enrolledCount: 2,
        scheduledItemCount: 1,
        missingScheduleCount: 1,
      }),
    ])
  })
})
