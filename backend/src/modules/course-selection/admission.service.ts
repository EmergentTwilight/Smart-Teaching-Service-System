import { randomUUID } from 'node:crypto'
import { AppError } from '@stss/shared'
import { redisClient } from '../../config/redis.js'
import prisma from '../../shared/prisma/client.js'
import type {
  AdmissionEnterBody,
  AdmissionLeaseBody,
  AdmissionLeasePayload,
  AdmissionLeavePayload,
} from './course-selection.types.js'
import { COURSE_SELECTION_ERROR_CODES } from './course-selection.types.js'

interface AdmissionLeaseRecord {
  leaseId: string
  studentId: string
  expiresAt: number
  updatedAt: number
}

interface AdmissionState {
  leases: Record<string, AdmissionLeaseRecord>
}

const DEFAULT_MAX_ACTIVE_SESSIONS = 200
const DEFAULT_IDLE_TIMEOUT_SECONDS = 300
const DEFAULT_HEARTBEAT_INTERVAL_SECONDS = 30
const DEFAULT_LOCK_WAIT_MILLISECONDS = 30_000
const DEFAULT_LOCK_TTL_MILLISECONDS = 15_000

const readPositiveIntegerEnv = (name: string, fallback: number): number => {
  const raw = process.env[name]
  const value = raw ? Number(raw) : fallback

  return Number.isInteger(value) && value > 0 ? value : fallback
}

const getAdmissionConfig = () => ({
  maxActiveSessions: readPositiveIntegerEnv(
    'COURSE_SELECTION_MAX_ACTIVE_SESSIONS',
    DEFAULT_MAX_ACTIVE_SESSIONS
  ),
  idleTimeoutSeconds: readPositiveIntegerEnv(
    'COURSE_SELECTION_IDLE_TIMEOUT_SECONDS',
    DEFAULT_IDLE_TIMEOUT_SECONDS
  ),
  heartbeatIntervalSeconds: readPositiveIntegerEnv(
    'COURSE_SELECTION_HEARTBEAT_INTERVAL_SECONDS',
    DEFAULT_HEARTBEAT_INTERVAL_SECONDS
  ),
})

const stateKeyOf = (semesterId: string): string =>
  `course-selection:admission:${semesterId}`

const lockKeyOf = (semesterId: string): string =>
  `course-selection:admission:${semesterId}:lock`

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const throwAdmissionError = (message: string): never => {
  const code = COURSE_SELECTION_ERROR_CODES.ADMISSION_LIMITED
  throw new AppError(code, 429, message, { code })
}

const parseAdmissionState = (raw: string | null): AdmissionState => {
  if (!raw) {
    return { leases: {} }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AdmissionState>
    if (!parsed || typeof parsed !== 'object' || !parsed.leases) {
      return { leases: {} }
    }

    return { leases: parsed.leases }
  } catch {
    return { leases: {} }
  }
}

const pruneExpiredLeases = (state: AdmissionState, nowMs: number): AdmissionState => ({
  leases: Object.fromEntries(
    Object.entries(state.leases).filter(([, lease]) => lease.expiresAt > nowMs)
  ),
})

const activeLeaseCount = (state: AdmissionState): number => Object.keys(state.leases).length

const readState = async (semesterId: string, nowMs: number): Promise<AdmissionState> => {
  const state = parseAdmissionState(await redisClient.get(stateKeyOf(semesterId)))
  return pruneExpiredLeases(state, nowMs)
}

const writeState = async (
  semesterId: string,
  state: AdmissionState,
  ttlSeconds: number
): Promise<void> => {
  await redisClient.set(stateKeyOf(semesterId), JSON.stringify(state), { ex: ttlSeconds })
}

const withAdmissionLock = async <T>(
  semesterId: string,
  action: () => Promise<T>
): Promise<T> => {
  const lockKey = lockKeyOf(semesterId)
  const lockToken = randomUUID()
  const lockWaitMs = readPositiveIntegerEnv(
    'COURSE_SELECTION_ADMISSION_LOCK_WAIT_MS',
    DEFAULT_LOCK_WAIT_MILLISECONDS
  )
  const lockTtlMs = readPositiveIntegerEnv(
    'COURSE_SELECTION_ADMISSION_LOCK_TTL_MS',
    DEFAULT_LOCK_TTL_MILLISECONDS
  )
  const deadline = Date.now() + lockWaitMs

  while (Date.now() < deadline) {
    const acquired = await redisClient.set(lockKey, lockToken, { px: lockTtlMs, nx: true })
    if (acquired !== false) {
      try {
        return await action()
      } finally {
        if ((await redisClient.get(lockKey)) === lockToken) {
          await redisClient.del(lockKey)
        }
      }
    }

    await sleep(5 + Math.floor(Math.random() * 10))
  }

  return throwAdmissionError('选课准入系统繁忙，请稍后重试')
}

const loadOpenSelectionSemester = async (
  semesterId: string | undefined,
  now: Date
): Promise<string> => {
  const period = await prisma.selectionPeriod.findFirst({
    where: {
      ...(semesterId ? { semesterId } : {}),
      isActive: true,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    orderBy: [
      { endTime: 'asc' },
      { startTime: 'desc' },
    ],
    select: {
      semesterId: true,
    },
  })

  if (!period) {
    throw new AppError(
      COURSE_SELECTION_ERROR_CODES.PERIOD_CLOSED,
      422,
      '当前不在有效选课时间段内'
    )
  }

  return period.semesterId
}

const buildLeasePayload = (
  semesterId: string,
  lease: AdmissionLeaseRecord,
  activeSessions: number
): AdmissionLeasePayload => {
  const config = getAdmissionConfig()

  return {
    admitted: true,
    semesterId,
    leaseId: lease.leaseId,
    activeSessions,
    maxActiveSessions: config.maxActiveSessions,
    idleTimeoutSeconds: config.idleTimeoutSeconds,
    heartbeatIntervalSeconds: config.heartbeatIntervalSeconds,
    expiresAt: new Date(lease.expiresAt).toISOString(),
  }
}

export const admissionService = {
  async enter(studentId: string, body: AdmissionEnterBody): Promise<AdmissionLeasePayload> {
    const config = getAdmissionConfig()
    const now = new Date()
    const nowMs = now.getTime()
    const semesterId = await loadOpenSelectionSemester(body.semesterId, now)

    return withAdmissionLock(semesterId, async () => {
      const state = await readState(semesterId, nowMs)
      const existingLease = state.leases[studentId]

      if (existingLease) {
        const refreshedLease = {
          ...existingLease,
          expiresAt: nowMs + config.idleTimeoutSeconds * 1000,
          updatedAt: nowMs,
        }
        state.leases[studentId] = refreshedLease
        await writeState(semesterId, state, config.idleTimeoutSeconds + 60)

        return buildLeasePayload(semesterId, refreshedLease, activeLeaseCount(state))
      }

      if (activeLeaseCount(state) >= config.maxActiveSessions) {
        throwAdmissionError('选课核心流程达到准入上限，请稍后重试')
      }

      const lease: AdmissionLeaseRecord = {
        leaseId: randomUUID(),
        studentId,
        expiresAt: nowMs + config.idleTimeoutSeconds * 1000,
        updatedAt: nowMs,
      }
      state.leases[studentId] = lease
      await writeState(semesterId, state, config.idleTimeoutSeconds + 60)

      return buildLeasePayload(semesterId, lease, activeLeaseCount(state))
    })
  },

  async heartbeat(
    studentId: string,
    body: AdmissionLeaseBody
  ): Promise<AdmissionLeasePayload> {
    const config = getAdmissionConfig()
    const now = new Date()
    const nowMs = now.getTime()
    const semesterId = await loadOpenSelectionSemester(body.semesterId, now)

    return withAdmissionLock(semesterId, async () => {
      const state = await readState(semesterId, nowMs)
      const existingLease = state.leases[studentId]

      if (!existingLease || existingLease.leaseId !== body.leaseId) {
        throwAdmissionError('选课准入已过期，请重新进入选课页')
      }

      const refreshedLease = {
        ...existingLease,
        expiresAt: nowMs + config.idleTimeoutSeconds * 1000,
        updatedAt: nowMs,
      }
      state.leases[studentId] = refreshedLease
      await writeState(semesterId, state, config.idleTimeoutSeconds + 60)

      return buildLeasePayload(semesterId, refreshedLease, activeLeaseCount(state))
    })
  },

  async leave(studentId: string, body: AdmissionLeaseBody): Promise<AdmissionLeavePayload> {
    const config = getAdmissionConfig()
    const nowMs = Date.now()

    return withAdmissionLock(body.semesterId, async () => {
      const state = await readState(body.semesterId, nowMs)
      const existingLease = state.leases[studentId]
      let released = false

      if (existingLease?.leaseId === body.leaseId) {
        delete state.leases[studentId]
        released = true
        await writeState(body.semesterId, state, config.idleTimeoutSeconds + 60)
      }

      return {
        released,
        semesterId: body.semesterId,
      }
    })
  },

  async assertActiveLease(studentId: string, semesterId: string): Promise<void> {
    const config = getAdmissionConfig()
    const nowMs = Date.now()

    await withAdmissionLock(semesterId, async () => {
      const state = await readState(semesterId, nowMs)
      const lease = state.leases[studentId]

      if (!lease) {
        await writeState(semesterId, state, config.idleTimeoutSeconds + 60)
        throwAdmissionError('选课准入已过期，请重新进入选课页')
      }

      await writeState(semesterId, state, config.idleTimeoutSeconds + 60)
    })
  },
}
