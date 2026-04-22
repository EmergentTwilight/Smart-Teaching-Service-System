import type { ScoreStatus } from '@prisma/client'

/**
 * F2 只关心提交后的改分流程，为了避免前后端口径偏差，
 * 所有审批相关字段都在这里集中定义。
 */

export type ScoreField = 'usualScore' | 'midtermScore' | 'finalScore' | 'totalScore'

export interface ProposedScoreChanges {
  usualScore?: number
  midtermScore?: number
  finalScore?: number
  totalScore?: number
}

export interface ScoreSnapshot {
  usualScore: number | null
  midtermScore: number | null
  finalScore: number | null
  totalScore: number | null
}

// 这里是 ModificationRequest 的结构
export interface ScoreModificationRequestPayload {
  proposedChanges: ProposedScoreChanges
  reason: string
  applicantId: string
  appliedAt: string
}

export interface CreateScoreModificationRequestInput {
  proposedChanges: ProposedScoreChanges
  reason: string
}

export interface GetPendingModificationRequestsQuery {
  page: number
  pageSize: number
  courseOfferingId?: string
  teacherId?: string
}

export interface ApproveModificationRequestInput {
  comment?: string
}

export interface RejectModificationRequestInput {
  reason: string
}

export interface GetScoreModificationLogsQuery {
  page: number
  pageSize: number
}

export interface PendingModificationRequestItem {
  scoreId: string
  status: ScoreStatus
  courseOfferingId: string
  teacherId: string
  studentId: string
  request: ScoreModificationRequestPayload
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

export interface ScoreModificationLogItem {
  id: string
  scoreId: string
  modifierId: string
  modifierUsername: string | null
  modifierRealName: string | null
  oldValue: ScoreSnapshot
  newValue: ScoreSnapshot
  reason: string | null
  createdAt: Date
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PendingModificationRequestsResult {
  items: PendingModificationRequestItem[]
  pagination: PaginationMeta
}

export interface ScoreModificationLogsResult {
  items: ScoreModificationLogItem[]
  pagination: PaginationMeta
}
