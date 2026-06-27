import type { GradeLetter, ScoreStatus } from '../shared'

export type TeacherScoreStatus = ScoreStatus | 'EMPTY'

export interface EditableScoreValues {
  usualScore: number | null
  midtermScore: number | null
  finalScore: number | null
}

export type DraftScorePatch = Partial<EditableScoreValues>

export interface TeacherScoreRow extends EditableScoreValues {
  id: string
  scoreId: string | null
  enrollmentId: string
  courseOfferingId: string
  studentId: string
  studentNumber: string
  studentName: string
  className: string | null
  totalScore: number | null
  gradePoint: number | null
  gradeLetter: GradeLetter | null
  status: TeacherScoreStatus
  hasPendingModificationRequest: boolean
  enteredAt: string | null
  modifiedAt: string | null
}

export interface CourseScoresQueryParams {
  page?: number
  pageSize?: number
  // 与 F1 后端 getScoreListQuerySchema 对齐：keyword 同时匹配学号/姓名
  keyword?: string
  status?: TeacherScoreStatus
}

export interface CourseScoresPagination {
  page: number
  pageSize: number
  total: number
}

export interface SaveDraftScoreInput extends EditableScoreValues {
  enrollmentId: string
  scoreId?: string | null
}

export interface SaveDraftScoresPayload {
  scores: SaveDraftScoreInput[]
}

export interface SubmitScoresPayload {
  scoreIds: string[]
}

/**
 * 改分申请请求体，需与 F2 后端契约对齐：
 * POST /api/v1/scores/:scoreId/modification-request
 * body: { proposedChanges: { ...至少一项非空 }, reason }
 */
export interface ProposedScoreChanges {
  usualScore?: number
  midtermScore?: number
  finalScore?: number
  totalScore?: number
}

export interface ModificationRequestPayload {
  proposedChanges: ProposedScoreChanges
  reason: string
}
