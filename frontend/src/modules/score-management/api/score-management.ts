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
  const nested = isRecord(data) && isRecord((data as UnknownRecord).pagination)
    ? (data as UnknownRecord).pagination as UnknownRecord
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
    rawStatus === 'EMPTY' || isValidScoreStatus(rawStatus ?? '') ? (rawStatus as TeacherScoreStatus) : 'EMPTY'

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
}
