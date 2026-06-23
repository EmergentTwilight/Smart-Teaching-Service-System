#!/usr/bin/env node

const DEFAULT_BASE_URL = 'http://localhost:3000/api/v1'
const DEFAULT_USER_COUNT = 200
const DEFAULT_USER_PREFIX = 'cload'
const DEFAULT_PASSWORD = 'student123'

const readPositiveIntegerEnv = (name, fallback) => {
  const raw = process.env[name]
  const value = raw ? Number(raw) : fallback

  return Number.isInteger(value) && value > 0 ? value : fallback
}

const config = {
  baseUrl: process.env.C_LOAD_BASE_URL || DEFAULT_BASE_URL,
  userCount: readPositiveIntegerEnv('C_LOAD_USER_COUNT', DEFAULT_USER_COUNT),
  userPrefix: process.env.C_LOAD_USER_PREFIX || DEFAULT_USER_PREFIX,
  password: process.env.C_LOAD_PASSWORD || DEFAULT_PASSWORD,
  semesterId: process.env.C_LOAD_SEMESTER_ID || '',
}

const stageStats = new Map()
const failures = []

const usernameOf = (index) => `${config.userPrefix}${String(index).padStart(3, '0')}`

const nowMs = () => Number(process.hrtime.bigint() / 1_000_000n)

const percentile = (values, pct) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1)
  return sorted[index]
}

const round = (value) => Math.round(value)

const recordStage = (stage, elapsedMs, ok, status) => {
  const current =
    stageStats.get(stage) ??
    {
      requests: 0,
      success: 0,
      failed: 0,
      statuses: new Map(),
      latencies: [],
    }

  current.requests += 1
  current.latencies.push(elapsedMs)
  if (ok) {
    current.success += 1
  } else {
    current.failed += 1
  }
  current.statuses.set(status, (current.statuses.get(status) ?? 0) + 1)
  stageStats.set(stage, current)
}

const jsonHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

async function requestJson(stage, method, path, { token, body } = {}) {
  const startedAt = nowMs()
  let status = 'network-error'
  let payload = null

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers: jsonHeaders(token),
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    status = response.status
    const text = await response.text()
    payload = text ? JSON.parse(text) : null
    const ok = response.status >= 200 && response.status < 300
    recordStage(stage, nowMs() - startedAt, ok, status)

    if (!ok) {
      throw new Error(`${method} ${path} returned HTTP ${response.status}: ${text.slice(0, 240)}`)
    }

    return payload
  } catch (error) {
    if (status === 'network-error') {
      recordStage(stage, nowMs() - startedAt, false, status)
    }
    throw error
  }
}

async function runUser(index) {
  const username = usernameOf(index)
  const session = {
    username,
    token: '',
    semesterId: '',
    leaseId: '',
  }

  try {
    const login = await requestJson('login', 'POST', '/auth/login', {
      body: {
        username,
        password: config.password,
      },
    })
    session.token = login?.data?.access_token ?? login?.data?.accessToken
    if (!session.token) {
      throw new Error(`missing access token for ${username}`)
    }

    const enterBody = config.semesterId ? { semester_id: config.semesterId } : {}
    const enter = await requestJson('admission_enter', 'POST', '/course-selection/admission/enter', {
      token: session.token,
      body: enterBody,
    })
    if (!enter?.data?.admitted) {
      throw new Error(`not admitted for ${username}`)
    }
    session.semesterId = enter.data.semester_id
    session.leaseId = enter.data.lease_id
    if (!session.semesterId || !session.leaseId) {
      throw new Error(`missing admission lease for ${username}`)
    }

    const query = new URLSearchParams({
      semester_id: session.semesterId,
      page: '1',
      page_size: '10',
      include_unavailable: 'true',
    })
    await requestJson(
      'available_offerings',
      'GET',
      `/course-selection/offerings/available?${query.toString()}`,
      {
        token: session.token,
      }
    )

    await requestJson('heartbeat', 'POST', '/course-selection/admission/heartbeat', {
      token: session.token,
      body: {
        semester_id: session.semesterId,
        lease_id: session.leaseId,
      },
    })
  } catch (error) {
    failures.push({
      username,
      message: error instanceof Error ? error.message : String(error),
    })
  } finally {
    if (session.token && session.semesterId && session.leaseId) {
      try {
        await requestJson('leave', 'POST', '/course-selection/admission/leave', {
          token: session.token,
          body: {
            semester_id: session.semesterId,
            lease_id: session.leaseId,
          },
        })
      } catch (error) {
        failures.push({
          username,
          message: `leave failed: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }
  }
}

const summarizeStage = ([stage, stats]) => {
  const latencies = stats.latencies
  const average = latencies.reduce((sum, value) => sum + value, 0) / Math.max(1, latencies.length)
  const statuses = [...stats.statuses.entries()]
    .map(([status, count]) => `${status}:${count}`)
    .join(', ')

  return {
    stage,
    requests: stats.requests,
    success: stats.success,
    failed: stats.failed,
    p50_ms: round(percentile(latencies, 50)),
    p95_ms: round(percentile(latencies, 95)),
    max_ms: round(Math.max(0, ...latencies)),
    avg_ms: round(average),
    statuses,
  }
}

const printSummary = (rows, passed, elapsedMs) => {
  console.log('')
  console.log('C Course Selection 200 User Load Test')
  console.log(`Base URL: ${config.baseUrl}`)
  console.log(`Users: ${config.userCount}`)
  console.log(`Elapsed: ${round(elapsedMs)} ms`)
  console.log('')
  console.log('| Stage | Requests | Success | Failed | p50 ms | p95 ms | Max ms | Statuses |')
  console.log('|---|---:|---:|---:|---:|---:|---:|---|')
  for (const row of rows) {
    console.log(
      `| ${row.stage} | ${row.requests} | ${row.success} | ${row.failed} | ${row.p50_ms} | ${row.p95_ms} | ${row.max_ms} | ${row.statuses} |`
    )
  }
  console.log('')

  if (failures.length > 0) {
    console.log('Failure samples:')
    for (const failure of failures.slice(0, 10)) {
      console.log(`- ${failure.username}: ${failure.message}`)
    }
    console.log('')
  }

  console.log(
    JSON.stringify(
      {
        passed,
        users: config.userCount,
        elapsed_ms: round(elapsedMs),
        stages: rows,
        failure_count: failures.length,
        failure_samples: failures.slice(0, 10),
      },
      null,
      2
    )
  )
}

const main = async () => {
  const startedAt = nowMs()
  await Promise.all(Array.from({ length: config.userCount }, (_, index) => runUser(index + 1)))

  const rows = [...stageStats.entries()].map(summarizeStage)
  const expectedStages = ['login', 'admission_enter', 'available_offerings', 'heartbeat', 'leave']
  const passed =
    failures.length === 0 &&
    expectedStages.every((stage) => {
      const row = rows.find((item) => item.stage === stage)
      return row?.success === config.userCount && row.failed === 0
    })

  printSummary(rows, passed, nowMs() - startedAt)

  if (!passed) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
