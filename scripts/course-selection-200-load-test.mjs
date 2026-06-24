#!/usr/bin/env node

const DEFAULT_BASE_URL = 'http://localhost:3000/api/v1'
const DEFAULT_USER_COUNT = 200
const DEFAULT_USER_PREFIX = 'cload'
const DEFAULT_PASSWORD = 'student123'
const OFFERING_CAPACITY_50 = 'cload-offering-capacity-050'
const OFFERING_CAPACITY_200 = 'cload-offering-capacity-200'

const readPositiveIntegerEnv = (name, fallback) => {
  const raw = process.env[name]
  const value = raw ? Number(raw) : fallback

  return Number.isInteger(value) && value > 0 ? value : fallback
}

const parseBaseUrls = () => {
  const rawUrls = process.env.C_LOAD_BASE_URLS || process.env.C_LOAD_BASE_URL || DEFAULT_BASE_URL
  const urls = rawUrls
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)

  return urls.length > 0 ? urls : [DEFAULT_BASE_URL]
}

const config = {
  baseUrls: parseBaseUrls(),
  scenario: process.env.C_LOAD_SCENARIO || 'online',
  userCount: readPositiveIntegerEnv('C_LOAD_USER_COUNT', DEFAULT_USER_COUNT),
  userPrefix: process.env.C_LOAD_USER_PREFIX || DEFAULT_USER_PREFIX,
  password: process.env.C_LOAD_PASSWORD || DEFAULT_PASSWORD,
  semesterId: process.env.C_LOAD_SEMESTER_ID || '',
  offeringId: process.env.C_LOAD_OFFERING_ID || '',
  submitAttempts:
    process.env.C_LOAD_SUBMIT_ATTEMPTS !== undefined
      ? readPositiveIntegerEnv('C_LOAD_SUBMIT_ATTEMPTS', 1)
      : process.env.C_LOAD_SCENARIO === 'submit-full'
        ? 8
        : 1,
  submitRetryBaseMs: readPositiveIntegerEnv('C_LOAD_SUBMIT_RETRY_BASE_MS', 120),
}

const stageStats = new Map()
const failures = []
const scenarioRecords = []

const usernameOf = (index) => `${config.userPrefix}${String(index).padStart(3, '0')}`
const baseUrlOf = (index) => config.baseUrls[(index - 1) % config.baseUrls.length]
const nowMs = () => Number(process.hrtime.bigint() / 1_000_000n)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

async function requestJson(stage, baseUrl, method, path, { token, body, allowFailure = false } = {}) {
  const startedAt = nowMs()
  let status = 'network-error'
  let payload = null
  let rawText = ''

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: jsonHeaders(token),
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    status = response.status
    rawText = await response.text()
    payload = rawText ? JSON.parse(rawText) : null
    const ok = response.status >= 200 && response.status < 300
    recordStage(stage, nowMs() - startedAt, ok, status)

    if (!ok && !allowFailure) {
      throw new Error(`${method} ${path} returned HTTP ${response.status}: ${rawText.slice(0, 240)}`)
    }

    return {
      ok,
      status,
      payload,
      text: rawText,
    }
  } catch (error) {
    if (status === 'network-error') {
      recordStage(stage, nowMs() - startedAt, false, status)
    }
    if (allowFailure) {
      return {
        ok: false,
        status,
        payload,
        text: error instanceof Error ? error.message : String(error),
      }
    }
    throw error
  }
}

async function loginSession(index) {
  const username = usernameOf(index)
  const baseUrl = baseUrlOf(index)
  const login = await requestJson('login', baseUrl, 'POST', '/auth/login', {
    body: {
      username,
      password: config.password,
    },
  })
  const token = login.payload?.data?.access_token ?? login.payload?.data?.accessToken
  if (!token) {
    throw new Error(`missing access token for ${username}`)
  }

  return {
    username,
    baseUrl,
    token,
    semesterId: '',
    leaseId: '',
  }
}

async function enterAdmission(session) {
  const enterBody = config.semesterId ? { semester_id: config.semesterId } : {}
  const enter = await requestJson(
    'admission_enter',
    session.baseUrl,
    'POST',
    '/course-selection/admission/enter',
    {
      token: session.token,
      body: enterBody,
    }
  )
  if (!enter.payload?.data?.admitted) {
    throw new Error(`not admitted for ${session.username}`)
  }
  session.semesterId = enter.payload.data.semester_id
  session.leaseId = enter.payload.data.lease_id
  if (!session.semesterId || !session.leaseId) {
    throw new Error(`missing admission lease for ${session.username}`)
  }
}

async function leaveAdmission(session) {
  if (!session.token || !session.semesterId || !session.leaseId) {
    return
  }

  await requestJson('leave', session.baseUrl, 'POST', '/course-selection/admission/leave', {
    token: session.token,
    body: {
      semester_id: session.semesterId,
      lease_id: session.leaseId,
    },
  })
}

async function runOnlineUser(index) {
  let session = null

  try {
    session = await loginSession(index)
    await enterAdmission(session)

    const query = new URLSearchParams({
      semester_id: session.semesterId,
      page: '1',
      page_size: '10',
      include_unavailable: 'true',
    })
    await requestJson(
      'available_offerings',
      session.baseUrl,
      'GET',
      `/course-selection/offerings/available?${query.toString()}`,
      { token: session.token }
    )

    await requestJson('heartbeat', session.baseUrl, 'POST', '/course-selection/admission/heartbeat', {
      token: session.token,
      body: {
        semester_id: session.semesterId,
        lease_id: session.leaseId,
      },
    })
  } catch (error) {
    failures.push({
      username: usernameOf(index),
      message: error instanceof Error ? error.message : String(error),
    })
  } finally {
    if (session) {
      try {
        await leaveAdmission(session)
      } catch (error) {
        failures.push({
          username: session.username,
          message: `leave failed: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }
  }
}

async function prepareEnrollmentSession(index) {
  const session = await loginSession(index)
  await enterAdmission(session)
  return session
}

async function submitEnrollment(session, offeringId) {
  const clientRequestId = `${config.scenario}-${session.username}-${Date.now()}`
  let response = null

  for (let attempt = 1; attempt <= config.submitAttempts; attempt += 1) {
    response = await requestJson(
      'submit_enrollment',
      session.baseUrl,
      'POST',
      '/course-selection/enrollments',
      {
        token: session.token,
        body: {
          course_offering_id: offeringId,
          client_request_id: clientRequestId,
        },
        allowFailure: true,
      }
    )

    if (response.ok || response.status !== 429 || attempt === config.submitAttempts) {
      break
    }

    await delay(config.submitRetryBaseMs * attempt)
  }

  scenarioRecords.push({
    username: session.username,
    status: response?.status ?? 'network-error',
    ok: response?.ok ?? false,
    code: response?.payload?.errors?.code ?? response?.payload?.code ?? null,
    message: response?.payload?.message ?? response?.text,
  })
}

async function runEnrollmentScenario(offeringId) {
  const sessions = []

  try {
    const prepared = await Promise.allSettled(
      Array.from({ length: config.userCount }, (_, index) => prepareEnrollmentSession(index + 1))
    )

    for (let index = 0; index < prepared.length; index += 1) {
      const result = prepared[index]
      if (result.status === 'fulfilled') {
        sessions.push(result.value)
      } else {
        failures.push({
          username: usernameOf(index + 1),
          message: result.reason instanceof Error ? result.reason.message : String(result.reason),
        })
      }
    }

    await Promise.all(sessions.map((session) => submitEnrollment(session, offeringId)))
  } finally {
    await Promise.allSettled(sessions.map((session) => leaveAdmission(session)))
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

const statusCount = (status) => scenarioRecords.filter((record) => record.status === status).length
const successCount = () => scenarioRecords.filter((record) => record.ok).length
const controlledRejectCount = () => statusCount(422) + statusCount(429)
const serverErrorCount = () =>
  scenarioRecords.filter((record) => Number(record.status) >= 500 || record.status === 'network-error').length

const expectedOfferingId = () => {
  if (config.offeringId) return config.offeringId
  if (config.scenario === 'submit-capacity') return OFFERING_CAPACITY_50
  if (config.scenario === 'submit-full') return OFFERING_CAPACITY_200
  return ''
}

const evaluatePassed = (rows) => {
  if (config.scenario === 'online') {
    const expectedStages = ['login', 'admission_enter', 'available_offerings', 'heartbeat', 'leave']
    return (
      failures.length === 0 &&
      expectedStages.every((stage) => {
        const row = rows.find((item) => item.stage === stage)
        return row?.success === config.userCount && row.failed === 0
      })
    )
  }

  if (config.scenario === 'submit-capacity') {
    return (
      failures.length === 0 &&
      scenarioRecords.length === config.userCount &&
      successCount() === 50 &&
      controlledRejectCount() === config.userCount - 50 &&
      serverErrorCount() === 0
    )
  }

  if (config.scenario === 'submit-full') {
    return (
      failures.length === 0 &&
      scenarioRecords.length === config.userCount &&
      successCount() === config.userCount &&
      serverErrorCount() === 0
    )
  }

  throw new Error(`Unknown C_LOAD_SCENARIO: ${config.scenario}`)
}

const printSummary = (rows, passed, elapsedMs) => {
  console.log('')
  console.log('C Course Selection 200 User Load Test')
  console.log(`Scenario: ${config.scenario}`)
  console.log(`Base URLs: ${config.baseUrls.join(', ')}`)
  console.log(`Users: ${config.userCount}`)
  console.log(`Elapsed: ${round(elapsedMs)} ms`)
  if (expectedOfferingId()) {
    console.log(`Offering: ${expectedOfferingId()}`)
  }
  if (config.scenario === 'submit-capacity' || config.scenario === 'submit-full') {
    console.log(`Submit attempts: ${config.submitAttempts}`)
  }
  console.log('')
  console.log('| Stage | Requests | Success | Failed | p50 ms | p95 ms | Max ms | Statuses |')
  console.log('|---|---:|---:|---:|---:|---:|---:|---|')
  for (const row of rows) {
    console.log(
      `| ${row.stage} | ${row.requests} | ${row.success} | ${row.failed} | ${row.p50_ms} | ${row.p95_ms} | ${row.max_ms} | ${row.statuses} |`
    )
  }
  console.log('')

  if (scenarioRecords.length > 0) {
    console.log('| Scenario Metric | Value |')
    console.log('|---|---:|')
    console.log(`| enrollment_success | ${successCount()} |`)
    console.log(`| enrollment_422 | ${statusCount(422)} |`)
    console.log(`| enrollment_409 | ${statusCount(409)} |`)
    console.log(`| enrollment_429 | ${statusCount(429)} |`)
    console.log(`| enrollment_controlled_reject | ${controlledRejectCount()} |`)
    console.log(`| enrollment_5xx_or_network | ${serverErrorCount()} |`)
    console.log('')
  }

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
        scenario: config.scenario,
        users: config.userCount,
        base_urls: config.baseUrls,
        offering_id: expectedOfferingId() || null,
        elapsed_ms: round(elapsedMs),
        submit_attempts: config.submitAttempts,
        stages: rows,
        enrollment_success: successCount(),
        enrollment_422: statusCount(422),
        enrollment_409: statusCount(409),
        enrollment_429: statusCount(429),
        enrollment_controlled_reject: controlledRejectCount(),
        enrollment_5xx_or_network: serverErrorCount(),
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

  if (config.scenario === 'online') {
    await Promise.all(Array.from({ length: config.userCount }, (_, index) => runOnlineUser(index + 1)))
  } else if (config.scenario === 'submit-capacity' || config.scenario === 'submit-full') {
    await runEnrollmentScenario(expectedOfferingId())
  } else {
    throw new Error(`Unknown C_LOAD_SCENARIO: ${config.scenario}`)
  }

  const rows = [...stageStats.entries()].map(summarizeStage)
  const passed = evaluatePassed(rows)

  printSummary(rows, passed, nowMs() - startedAt)

  if (!passed) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
