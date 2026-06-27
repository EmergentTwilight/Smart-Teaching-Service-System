import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COURSE_SELECTION_ERROR_CODES } from '../../../modules/course-selection/course-selection.types.js'

const redisMock = vi.hoisted(() => {
  const store = new Map<string, string>()

  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value)
    }),
    incr: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(async (...keys: string[]) => {
      let deleted = 0
      keys.forEach((key) => {
        if (store.delete(key)) {
          deleted += 1
        }
      })
      return deleted
    }),
  }
})

const prismaMock = vi.hoisted(() => ({
  selectionPeriod: {
    findFirst: vi.fn(),
  },
}))

vi.mock('../../../config/redis.js', () => ({
  redisClient: redisMock,
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

import { admissionService } from '../../../modules/course-selection/admission.service.js'

const now = new Date('2026-05-19T04:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  redisMock.store.clear()
  vi.clearAllMocks()
  delete process.env.COURSE_SELECTION_MAX_ACTIVE_SESSIONS
  delete process.env.COURSE_SELECTION_IDLE_TIMEOUT_SECONDS
  delete process.env.COURSE_SELECTION_HEARTBEAT_INTERVAL_SECONDS

  prismaMock.selectionPeriod.findFirst.mockResolvedValue({
    semesterId: 'semester-1',
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('admissionService', () => {
  it('enters the selection flow and returns a lease', async () => {
    const result = await admissionService.enter('student-1', {})

    expect(result).toEqual(
      expect.objectContaining({
        admitted: true,
        semesterId: 'semester-1',
        activeSessions: 1,
        maxActiveSessions: 200,
        idleTimeoutSeconds: 300,
        heartbeatIntervalSeconds: 30,
      })
    )
    expect(result.leaseId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('refreshes duplicate enter for the same student instead of consuming another slot', async () => {
    const first = await admissionService.enter('student-1', {})
    vi.setSystemTime(new Date(now.getTime() + 60_000))

    const second = await admissionService.enter('student-1', {})

    expect(second.leaseId).toBe(first.leaseId)
    expect(second.activeSessions).toBe(1)
    expect(Date.parse(second.expiresAt)).toBeGreaterThan(Date.parse(first.expiresAt))
  })

  it('rejects enter when active sessions reach the configured limit', async () => {
    process.env.COURSE_SELECTION_MAX_ACTIVE_SESSIONS = '1'
    await admissionService.enter('student-1', {})

    await expect(admissionService.enter('student-2', {})).rejects.toMatchObject({
      code: COURSE_SELECTION_ERROR_CODES.ADMISSION_LIMITED,
      statusCode: 429,
    })
  })

  it('refreshes a lease on heartbeat', async () => {
    const first = await admissionService.enter('student-1', {})
    vi.setSystemTime(new Date(now.getTime() + 60_000))

    const heartbeat = await admissionService.heartbeat('student-1', {
      semesterId: first.semesterId,
      leaseId: first.leaseId,
    })

    expect(heartbeat.leaseId).toBe(first.leaseId)
    expect(Date.parse(heartbeat.expiresAt)).toBeGreaterThan(Date.parse(first.expiresAt))
  })

  it('releases a lease on leave', async () => {
    const lease = await admissionService.enter('student-1', {})

    const result = await admissionService.leave('student-1', {
      semesterId: lease.semesterId,
      leaseId: lease.leaseId,
    })

    expect(result).toEqual({
      released: true,
      semesterId: 'semester-1',
    })
    await expect(admissionService.assertActiveLease('student-1', 'semester-1')).rejects.toMatchObject({
      code: COURSE_SELECTION_ERROR_CODES.ADMISSION_LIMITED,
      statusCode: 429,
    })
  })

  it('expires idle leases before enrollment assertion', async () => {
    process.env.COURSE_SELECTION_IDLE_TIMEOUT_SECONDS = '5'
    await admissionService.enter('student-1', {})
    vi.setSystemTime(new Date(now.getTime() + 6_000))

    await expect(admissionService.assertActiveLease('student-1', 'semester-1')).rejects.toMatchObject({
      code: COURSE_SELECTION_ERROR_CODES.ADMISSION_LIMITED,
      statusCode: 429,
    })
  })
})
