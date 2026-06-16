/** C4/C5 共享工具函数单元测试（课表冲突、分页、阶段状态等）。 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../shared/prisma/client.js', () => ({
  default: {},
}))

import { EnrollmentStatus } from '@prisma/client'
import {
  buildPaginationMeta,
  computeSelectionPeriodServerStatus,
  parseEnrollmentStatusFilter,
  schedulesConflict,
} from '../../../modules/course-selection/course-selection.support.js'

describe('course-selection.support', () => {
  it('schedulesConflict detects overlapping slots on same day', () => {
    const a = {
      dayOfWeek: 1,
      startWeek: 1,
      endWeek: 16,
      startPeriod: 1,
      endPeriod: 2,
    }
    const b = {
      dayOfWeek: 1,
      startWeek: 10,
      endWeek: 18,
      startPeriod: 2,
      endPeriod: 4,
    }
    expect(schedulesConflict(a as never, b as never)).toBe(true)
  })

  it('schedulesConflict returns false for different weekdays', () => {
    const a = {
      dayOfWeek: 1,
      startWeek: 1,
      endWeek: 16,
      startPeriod: 1,
      endPeriod: 2,
    }
    const b = { ...a, dayOfWeek: 2 }
    expect(schedulesConflict(a as never, b as never)).toBe(false)
  })

  it('computeSelectionPeriodServerStatus reflects server time', () => {
    const start = new Date('2026-06-01T00:00:00Z')
    const end = new Date('2026-06-30T00:00:00Z')
    expect(computeSelectionPeriodServerStatus(start, end, new Date('2026-05-01T00:00:00Z'))).toBe(
      'not_started'
    )
    expect(computeSelectionPeriodServerStatus(start, end, new Date('2026-06-15T00:00:00Z'))).toBe(
      'open'
    )
    expect(computeSelectionPeriodServerStatus(start, end, new Date('2026-07-01T00:00:00Z'))).toBe(
      'ended'
    )
  })

  it('parseEnrollmentStatusFilter accepts enrolled', () => {
    expect(parseEnrollmentStatusFilter('enrolled')).toBe(EnrollmentStatus.ENROLLED)
  })

  it('parseEnrollmentStatusFilter rejects invalid status', () => {
    expect(() => parseEnrollmentStatusFilter('invalid')).toThrow()
  })

  it('buildPaginationMeta calculates total pages', () => {
    expect(buildPaginationMeta(1, 20, 45)).toEqual({
      page: 1,
      pageSize: 20,
      total: 45,
      totalPages: 3,
    })
  })
})
