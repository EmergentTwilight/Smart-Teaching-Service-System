import request from '@/shared/utils/request'
import { DEFAULT_PAGE_SIZE, isValidScoreStatus } from '../shared'
import type {
  CourseScoresPagination,
  CourseScoresQueryParams,
  ModificationRequestPayload,
  SaveDraftScoresPayload,
  SubmitScoresPayload,
  TeacherScoreRow,
  TeacherScoreStatus,
} from '../teacher/types'

type UnknownRecord = Record<string, unknown>
type GradeLetter = TeacherScoreRow['gradeLetter']

export interface CourseScoresApiResult {
  rows: TeacherScoreRow[]
  pagination: CourseScoresPagination
}

export interface ScoreSnapshot {
  usualScore: number | null
  midtermScore: number | null
  finalScore: number | null
  totalScore: number | null
  gradePoint: number | null
  gradeLetter: string | null
}

export interface PendingModificationRequest {
  scoreId: string
  status: TeacherScoreStatus
  courseOfferingId: string
  teacherId: string
  studentId: string
  request: {
    proposedChanges: {
      usualScore?: number
      midtermScore?: number
      finalScore?: number
    }
    reason: string
    applicantId: string
    appliedAt: string
  }
  student: {
    id: string
    username: string
    realName: string
  } | null
  teacher: {
    id: string
    username: string
    realName: string
  } | null
}

export interface ModificationLogItem {
  id: string
  scoreId: string
  modifierId: string
  modifierUsername: string | null
  modifierRealName: string | null
  oldValue: ScoreSnapshot
  newValue: ScoreSnapshot
  reason: string | null
  createdAt: string
}

export interface ModificationRequestQuery {
  page?: number
  pageSize?: number
  courseOfferingId?: string
  teacherId?: string
}

export interface PaginatedApiResult<T> {
  items: T[]
  pagination: CourseScoresPagination
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getBoolean(value: unknown): boolean {
  return value === true
}

function getGradeLetter(value: unknown): GradeLetter {
  if (
    value === 'A+' ||
    value === 'A' ||
    value === 'A-' ||
    value === 'B+' ||
    value === 'B' ||
    value === 'B-' ||
    value === 'C+' ||
    value === 'C' ||
    value === 'D' ||
    value === 'F'
  ) {
    return value
  }

  return null
}

function pickRecords(data: unknown): UnknownRecord[] {
  if (!isRecord(data)) return []
  if (Array.isArray(data.items)) return data.items.filter(isRecord)
  if (Array.isArray(data.rows)) return data.rows.filter(isRecord)
  return []
}

function pickPagination(data: unknown, params?: CourseScoresQueryParams): CourseScoresPagination {
  const nested =
    isRecord(data) && isRecord((data as UnknownRecord).pagination)
      ? ((data as UnknownRecord).pagination as UnknownRecord)
      : null
  return {
    page: getNumber(nested?.page) ?? params?.page ?? 1,
    pageSize: getNumber(nested?.pageSize) ?? params?.pageSize ?? DEFAULT_PAGE_SIZE,
    total: getNumber(nested?.total) ?? 0,
  }
}

function normalizeRow(record: UnknownRecord, courseOfferingId: string): TeacherScoreRow {
  const enrollmentId =
    getString(record.enrollmentId) ??
    `${courseOfferingId}-${getString(record.studentNumber) ?? Math.random().toString(36).slice(2, 8)}`

  const rawStatus = getString(record.status)
  const status: TeacherScoreStatus =
    rawStatus === 'EMPTY' || isValidScoreStatus(rawStatus ?? '')
      ? (rawStatus as TeacherScoreStatus)
      : 'EMPTY'

  return {
    id: enrollmentId,
    scoreId: getString(record.scoreId),
    enrollmentId,
    courseOfferingId,
    studentId: getString(record.studentId) ?? '',
    studentNumber: getString(record.studentNumber) ?? '--',
    studentName: getString(record.studentName) ?? '未命名学生',
    className: getString(record.className),
    usualScore: getNumber(record.usualScore),
    midtermScore: getNumber(record.midtermScore),
    finalScore: getNumber(record.finalScore),
    totalScore: getNumber(record.totalScore),
    gradePoint: getNumber(record.gradePoint),
    gradeLetter: getGradeLetter(record.gradeLetter),
    status,
    hasPendingModificationRequest: getBoolean(record.hasPendingModificationRequest),
    enteredAt: getString(record.enteredAt),
    modifiedAt: getString(record.modifiedAt),
  }
}

export function normalizeCourseScoresResult(
  data: unknown,
  courseOfferingId: string,
  params?: CourseScoresQueryParams
): CourseScoresApiResult {
  const rows = pickRecords(data).map((record) => normalizeRow(record, courseOfferingId))

  return {
    rows,
    pagination: pickPagination(data, params),
  }
}

export const scoreManagementApi = {
  getCourseScores(courseOfferingId: string, params?: CourseScoresQueryParams) {
    return request.get<unknown, unknown>(`/course-offerings/${courseOfferingId}/scores`, { params })
  },

  saveDraftScores(courseOfferingId: string, payload: SaveDraftScoresPayload) {
    return request.post<SaveDraftScoresPayload, unknown>(
      `/course-offerings/${courseOfferingId}/scores/draft`,
      payload
    )
  },

  submitScores(courseOfferingId: string, payload: SubmitScoresPayload) {
    return request.post<SubmitScoresPayload, unknown>(
      `/course-offerings/${courseOfferingId}/scores/submit`,
      payload
    )
  },

  createModificationRequest(scoreId: string, payload: ModificationRequestPayload) {
    return request.post<ModificationRequestPayload, unknown>(
      `/scores/${scoreId}/modification-request`,
      payload
    )
  },

  getPendingModificationRequests(params?: ModificationRequestQuery) {
    return request.get<unknown, PaginatedApiResult<PendingModificationRequest>>(
      '/scores/modification-requests',
      { params }
    )
  },

  approveModificationRequest(scoreId: string, comment?: string) {
    return request.post<{ comment?: string }, unknown>(
      `/scores/${scoreId}/modification-request/approve`,
      comment ? { comment } : {}
    )
  },

  rejectModificationRequest(scoreId: string, reason: string) {
    return request.post<{ reason: string }, unknown>(
      `/scores/${scoreId}/modification-request/reject`,
      { reason }
    )
  },

  getModificationLogs(
    scoreId: string,
    params?: Pick<ModificationRequestQuery, 'page' | 'pageSize'>
  ) {
    return request.get<unknown, PaginatedApiResult<ModificationLogItem>>(
      `/scores/${scoreId}/modification-logs`,
      { params }
    )
  },
}
