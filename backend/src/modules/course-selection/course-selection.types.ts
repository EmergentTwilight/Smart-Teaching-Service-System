import type { Buffer } from 'node:buffer'

export type CourseTypeValue = 'required' | 'elective' | 'general'
export type CourseStatusValue = 'active' | 'archived'
export type OfferingStatusValue = 'planned' | 'open' | 'closed' | 'cancelled'
export type EnrollmentStatusValue = 'enrolled' | 'dropped' | 'withdrawn'
export type SelectionPhaseValue = 'first_round' | 'second_round' | 'adjustment'
export type SelectionPeriodServerStatusValue = 'not_started' | 'open' | 'ended'
export type StudyStatusValue = 'completed' | 'in_progress' | 'not_started'
export type SemesterStatusValue = 'upcoming' | 'current' | 'ended'

const toLowercaseApiEnum = <T extends string>(value: T): Lowercase<T> =>
  value.toLowerCase() as Lowercase<T>

export const toCourseTypeValue = (value: string): CourseTypeValue =>
  toLowercaseApiEnum(value) as CourseTypeValue

export const toCourseStatusValue = (value: string): CourseStatusValue =>
  toLowercaseApiEnum(value) as CourseStatusValue

export const toOfferingStatusValue = (value: string): OfferingStatusValue =>
  toLowercaseApiEnum(value) as OfferingStatusValue

export const toEnrollmentStatusValue = (value: string): EnrollmentStatusValue =>
  toLowercaseApiEnum(value) as EnrollmentStatusValue

export const toSelectionPhaseValue = (value: string): SelectionPhaseValue =>
  toLowercaseApiEnum(value) as SelectionPhaseValue

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedItems<T> {
  items: T[]
  pagination: PaginationMeta
}

export type StudentRole = 'student'
export type TeacherRole = 'teacher'
export type AdminRole = 'admin' | 'super_admin'

export interface BaseQuery {
  page?: number
  pageSize?: number
}

export interface CurriculumQuery extends BaseQuery {
  includeCourses?: boolean
  include_courses?: boolean
  courseType?: string
  course_type?: string
}

export interface CurriculumProgressQuery extends BaseQuery {
  semesterId?: string
  includeDropped?: boolean
  include_dropped?: boolean
}

export interface CourseSearchQuery extends BaseQuery {
  keyword?: string
  teacher?: string
  teacherId?: string
  teacher_id?: string
  semesterId?: string
  semester_id?: string
  courseType?: string
  course_type?: string
  status?: string
  offeringStatus?: string
  offering_status?: string
  availableOnly?: boolean
  available_only?: boolean
  includeUnavailable?: boolean
  include_unavailable?: boolean
}

export interface AvailableOfferingsQuery extends BaseQuery {
  keyword?: string
  teacher?: string
  teacherId?: string
  teacher_id?: string
  semesterId?: string
  semester_id?: string
  courseType?: string
  course_type?: string
  offeringStatus?: string
  offering_status?: string
  includeUnavailable?: boolean
  include_unavailable?: boolean
}

export interface EnrollmentQuery extends BaseQuery {
  semesterId?: string
  status?: string
  keyword?: string
}

export interface CreateEnrollmentBody {
  courseOfferingId: string
  clientRequestId?: string
}

export interface CurriculumConfirmationBody {
  curriculumId: string
}

export interface DropEnrollmentBody {
  reason?: string
  clientRequestId?: string
}

export interface AdmissionEnterBody {
  semesterId?: string
}

export interface AdmissionLeaseBody {
  semesterId: string
  leaseId: string
}

export interface AdmissionLeasePayload {
  admitted: boolean
  semesterId: string
  leaseId: string
  activeSessions: number
  maxActiveSessions: number
  idleTimeoutSeconds: number
  heartbeatIntervalSeconds: number
  expiresAt: string
}

export interface AdmissionLeavePayload {
  released: boolean
  semesterId: string
}

export interface SelectionPeriodQuery extends BaseQuery {
  semesterId?: string
  phase?: string
  isActive?: boolean
}

export interface CreateSelectionPeriodBody {
  semesterId: string
  phase: string
  startTime: string
  endTime: string
  maxCredits?: number
  allowDrop: boolean
  isActive: boolean
}

export interface UpdateSelectionPeriodBody {
  semesterId?: string
  phase?: string
  startTime?: string
  endTime?: string
  maxCredits?: number
  allowDrop?: boolean
  isActive?: boolean
}

export interface ManualEnrollmentBody {
  studentId: string
  courseOfferingId: string
  reason: string
  notifyStudent?: boolean
}

export interface ManualEnrollmentLookupQuery extends BaseQuery {
  keyword?: string
  semesterId?: string
}

export interface ManualEnrollmentStudentOption {
  studentId: string
  studentNumber: string
  username: string
  realName: string
  majorName?: string | null
  grade: number
  className?: string | null
}

export interface ManualEnrollmentCourseOfferingOption {
  courseOfferingId: string
  courseCode: string
  courseName: string
  credits: number
  semester: {
    id: string
    name: string
  }
  teacher: {
    id: string
    realName: string
    teacherNumber?: string | null
  }
  capacity: number
  enrolledCount: number
  remainingCapacity: number
  status: OfferingStatusValue
  scheduleSummary: string[]
}

export interface ManualEnrollmentResult {
  enrollment: {
    id: string
    studentId: string
    courseOfferingId: string
    status: EnrollmentStatusValue
    enrolledAt: string
  }
  courseOffering: {
    id: string
    capacity: number
    enrolledCount: number
    remainingCapacity: number
  }
  audit: {
    logged: boolean
    action: string
  }
}

export interface RosterQuery extends BaseQuery {
  offeringId?: string
  semesterId?: string
  status?: string
  keyword?: string
}

export interface RosterExportQuery {
  status?: string
  format: 'xlsx'
}

export interface RosterExportPayload {
  content: Buffer
  fileName: string
  contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

export interface TimetableQuery {
  semesterId?: string
  format?: 'grid' | 'list'
}

export interface TodoStatusPayload {
  module: `C${number}`
  fr: string[]
  nfr?: string[]
  message: string
}

export const COURSE_SELECTION_ERROR_CODES = {
  VALIDATION_FAILED: 'CS_VALIDATION_FAILED',
  UNAUTHORIZED: 'CS_UNAUTHORIZED',
  PERIOD_CLOSED: 'CS_PERIOD_CLOSED',
  NOT_FOUND: 'CS_NOT_FOUND',
  OFFERING_NOT_FOUND: 'CS_OFFERING_NOT_FOUND',
  OFFERING_CLOSED: 'CS_OFFERING_CLOSED',
  OFFERING_FULL: 'CS_OFFERING_FULL',
  DUPLICATE_ENROLLMENT: 'CS_DUPLICATE_ENROLLMENT',
  SCHEDULE_CONFLICT: 'CS_SCHEDULE_CONFLICT',
  MAX_CREDITS_EXCEEDED: 'CS_MAX_CREDITS_EXCEEDED',
  CURRICULUM_NOT_CONFIRMED: 'CS_CURRICULUM_NOT_CONFIRMED',
  PREREQUISITE_NOT_MET: 'CS_PREREQUISITE_NOT_MET',
  ENROLLMENT_NOT_FOUND: 'CS_ENROLLMENT_NOT_FOUND',
  FORBIDDEN: 'CS_FORBIDDEN',
  ADMISSION_LIMITED: 'CS_ADMISSION_LIMITED',
  AI_UNAVAILABLE: 'CS_AI_UNAVAILABLE',
} as const

export type CourseSelectionErrorCode =
  (typeof COURSE_SELECTION_ERROR_CODES)[keyof typeof COURSE_SELECTION_ERROR_CODES]

export interface CurriculumCourseItem {
  courseId: string
  courseCode: string
  courseName: string
  credits: number
  courseType: CourseTypeValue
  semesterSuggestion?: number | null
  status?: CourseStatusValue
  studyStatus?: StudyStatusValue
}

export interface CurriculumInfo {
  id: string
  name: string
  year: number
  major: {
    id: string
    name: string
    code: string
  }
  totalCredits: number
  requiredCredits?: number
  electiveCredits?: number
}

export interface CurriculumCourseGroup {
  courseType: CourseTypeValue
  courseTypeName: string
  courses: CurriculumCourseItem[]
}

export interface CurriculumConfirmation {
  requiredBeforeSelection: boolean
  confirmed: boolean
  confirmedAt?: string | null
  message?: string
}

export interface CurriculumPayload {
  curriculum: CurriculumInfo
  courseGroups: CurriculumCourseGroup[]
  confirmation: CurriculumConfirmation
}

export interface CurriculumConfirmationPayload {
  confirmation: CurriculumConfirmation
}

export interface CurriculumCreditSummary {
  totalCredits: number
  requiredCredits: number
  electiveCredits: number
  generalCredits?: number | null
}

export interface CurriculumCourseTypeProgress {
  courseType: CourseTypeValue
  selectedCredits: number
  completedCredits?: number
  inProgressCredits?: number
  requirementCredits?: number | null
  courseCount: number
}

export interface CurriculumProgressWarning {
  code: string
  message: string
}

export interface CurriculumProgress {
  curriculumId: string
  requirements: CurriculumCreditSummary
  selected: CurriculumCreditSummary
  completed?: CurriculumCreditSummary
  inProgress?: CurriculumCreditSummary
  remaining: Partial<CurriculumCreditSummary>
  byCourseType: CurriculumCourseTypeProgress[]
  warnings: CurriculumProgressWarning[]
}

export interface CourseListItem {
  courseId: string
  courseCode: string
  courseName: string
  credits: number
  courseType: CourseTypeValue
  category?: string | null
  assessmentMethod?: string | null
  status: CourseStatusValue
  offeringSummary?: {
    openCount: number
    plannedCount: number
    latestSemesterName?: string | null
  }
}

export interface CourseOfferingScheduleItem {
  id?: string
  dayOfWeek: number
  startWeek: number
  endWeek: number
  startPeriod: number
  endPeriod: number
  classroom?: {
    building?: string | null
    roomNumber?: string | null
    campus?: string | null
  } | null
  notes?: string | null
}

export interface CourseOfferingListItem {
  courseOfferingId: string
  course: {
    id: string
    code: string
    name: string
    credits: number
    courseType: CourseTypeValue
    status: CourseStatusValue
  }
  semester: {
    id: string
    name: string
  }
  teacher: {
    id: string
    realName: string
    teacherNumber?: string | null
  }
  capacity: number
  enrolledCount: number
  remainingCapacity: number
  status: OfferingStatusValue
  schedules: CourseOfferingScheduleItem[]
}

export interface CourseEligibilitySnapshot {
  isAvailable: boolean
  isEnrolled?: boolean
  isFull?: boolean
  hasTimeConflict?: boolean
  curriculumConfirmed?: boolean
  prerequisiteSatisfied?: boolean
  withinCurriculum?: boolean
  reasons: string[]
}

export interface AvailableOfferingItem {
  courseOfferingId: string
  courseCode: string
  courseName: string
  credits: number
  courseType: CourseTypeValue
  teacherName: string
  capacity: number
  enrolledCount: number
  remainingCapacity: number
  status: OfferingStatusValue
  eligibility: CourseEligibilitySnapshot
}

export interface CourseOfferingDetail {
  courseOfferingId: string
  course: {
    id: string
    code: string
    name: string
    credits: number
    courseType: CourseTypeValue
    category?: string | null
    description?: string | null
    assessmentMethod?: string | null
    status: CourseStatusValue
  }
  semester: {
    id: string
    name: string
  }
  teacher: {
    id: string
    realName: string
    teacherNumber?: string | null
    title?: string | null
  }
  capacity: number
  enrolledCount: number
  remainingCapacity: number
  status: OfferingStatusValue
  prerequisites: Array<{
    courseId?: string
    courseCode: string
    courseName: string
  }>
  schedules: CourseOfferingScheduleItem[]
  eligibility?: CourseEligibilitySnapshot
}

export interface EnrollmentItem {
  enrollmentId: string
  status: EnrollmentStatusValue
  studyStatus?: StudyStatusValue
  enrolledAt: string
  droppedAt?: string | null
  courseOffering: {
    id: string
    courseName: string
    courseCode: string
    credits: number
    courseType: CourseTypeValue
    teacherName: string
    semesterName: string
  }
}

export interface EnrollmentSummary {
  enrolledCount: number
  enrolledCredits: number
}

export interface EnrollmentListPayload {
  items: EnrollmentItem[]
  summary: EnrollmentSummary
  pagination: PaginationMeta
}

export interface EnrollmentMutationCourseOffering {
  id: string
  courseCode: string
  courseName: string
  capacity: number
  enrolledCount: number
  remainingCapacity: number
}

export interface EnrollmentCreditSummary {
  currentSelectedCredits: number
  maxCredits: number
}

export interface EnrollmentMutationPayload {
  enrollment: {
    id: string
    status: EnrollmentStatusValue
    enrolledAt: string
    droppedAt?: string | null
  }
  courseOffering: EnrollmentMutationCourseOffering
  creditSummary?: EnrollmentCreditSummary
}

export interface TimetableSlot {
  enrollmentId: string
  courseOfferingId: string
  courseName: string
  courseCode: string
  teacherName: string
  credits: number
  dayOfWeek: number
  startWeek: number
  endWeek: number
  startPeriod: number
  endPeriod: number
  classroom?: string | null
}

export interface MissingScheduleItem {
  courseOfferingId: string
  courseName: string
  message: string
}

export interface TimetablePayload {
  semester: {
    id: string
    name: string
  }
  printable: boolean
  items: TimetableSlot[]
  missingScheduleItems: MissingScheduleItem[]
}

export interface TimetableSemesterItem {
  id: string
  name: string
  status: SemesterStatusValue
  startDate: string
  endDate: string
  isCurrent: boolean
  isDefault: boolean
  enrolledCount: number
  scheduledItemCount: number
  missingScheduleCount: number
}

export interface TimetableSemesterListPayload {
  items: TimetableSemesterItem[]
  defaultSemesterId?: string
}

export interface SelectionPeriodItem {
  id: string
  semester: {
    id: string
    name: string
  }
  phase: SelectionPhaseValue
  startTime: string
  endTime: string
  maxCredits?: number
  allowDrop: boolean
  isActive: boolean
  serverStatus: SelectionPeriodServerStatusValue
}

export interface RosterStudentItem {
  studentNumber: string
  studentName: string
  majorName?: string
  className?: string
  enrollmentStatus: EnrollmentStatusValue
  enrolledAt: string
}

export interface RosterOfferingInfo {
  offeringId: string
  courseName: string
  teacherName: string
}

export interface RosterPayload {
  offering: RosterOfferingInfo
  students: RosterStudentItem[]
}

export interface PaginatedRosterPayload extends RosterPayload {
  pagination: PaginationMeta
}

export type AiAdvisorMode = 'full' | 'rule_only' | 'template_only' | 'disabled'

export interface AiCourseScoreBreakdown {
  curriculumMatch: number
  creditGapFit: number
  scheduleFit: number
  preferenceFit: number
  capacityFit: number
  riskInverse: number
}

export interface AiRecommendationItem {
  courseOfferingId: string
  courseCode: string
  courseName: string
  credits: number
  teacherName: string
  recommendationScore: number
  reasons: string[]
  risks: string[]
  eligibilitySnapshot: {
    isAvailable: boolean
    remainingCapacity?: number
    hasTimeConflict?: boolean
    prerequisiteSatisfied?: boolean
    isFull?: boolean
    isEnrolled?: boolean
    withinCurriculum?: boolean
    withinSelectionPeriod?: boolean
    underMaxCredits?: boolean
    reasons?: string[]
  }
  scoreBreakdown?: AiCourseScoreBreakdown
}

export interface AiRecommendationPlan {
  id: 'balanced' | 'required_first' | 'low_risk'
  title: string
  rationale: string
  recommendations: AiRecommendationItem[]
  projectedCredits: number
  totalCredits?: number
  riskLevel: 'low' | 'medium' | 'high'
  planScore?: number
  keyTradeoffs?: string[]
}

export interface AiScoreBreakdown {
  totalCandidates: number
  safeCandidates: number
  blockedCandidates: number
}

export interface AiProgressAudit {
  currentSelectedCredits: number
  completedCredits?: number
  inProgressCredits?: number
  projectedCredits?: number
  targetCredits: number
  maxCredits: number | null
  requiredGap: number
  electiveGap: number
  generalGap: number
  priorityGaps: {
    courseType: CourseTypeValue
    gapCredits: number
    urgency: 'low' | 'medium' | 'high'
    reason: string
  }[]
}

export interface AiScheduleLoad {
  earlyMorningCount: number
  denseDays: string[]
  loadScore: number
  loadLevel: 'low' | 'medium' | 'high'
  notes: string[]
}

export interface AiCapacityRisk {
  courseOfferingId: string
  courseName: string
  remainingCapacity: number
  fillRate: number
  riskLevel: 'low' | 'medium' | 'high'
  riskReason: string
}

export interface AiProviderDiagnostics {
  provider: 'openrouter'
  model?: string | null
  endpointHost?: string | null
  statusCode?: number
  providerCode?: string
  providerMessage?: string
  providerRawErrorSummary?: string
  finishReason?: string
  nativeFinishReason?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  reasoningTokens?: number
  retryAfter?: string | null
  durationMs?: number
  retriable?: boolean
}

export interface AiFallbackInfo {
  code: string
  reason: string
  retriable?: boolean
  source?: string
  mode?: AiAdvisorMode
  missingComponents?: string[]
  llmUsed?: boolean
  model?: string | null
  stage?: 'preference' | 'recommendation' | 'explanation' | 'rule'
  diagnostics?: AiProviderDiagnostics
}

export type AiDebugStageName = 'preference' | 'recommendation' | 'explanation' | 'rule'
export type AiDebugStageStatus = 'skipped' | 'success' | 'failed' | 'fallback'

export interface AiDebugStage extends AiProviderDiagnostics {
  stage: AiDebugStageName
  status: AiDebugStageStatus
  reason?: string
}

export interface AiDebugInfo {
  requestId: string
  endpoint: 'recommend' | 'explain'
  llmTimeoutMs: number
  generatedAt: string
  stages: AiDebugStage[]
}

export interface AiAdvicePayload {
  disclaimer: string
  creditProgressSummary: {
    currentSelectedCredits: number
    completedCredits?: number
    inProgressCredits?: number
    projectedCredits?: number
    targetCredits: number
    maxCredits: number
    remainingToTarget?: number
  }
  recommendations: AiRecommendationItem[]
  conflictNotes: {
    courseOfferingId: string
    courseName: string
    message: string
  }[]
  plans?: AiRecommendationPlan[]
  recommendationSummary?: string
  mode?: AiAdvisorMode
  suggestionMode?: AiAdvisorMode
  degradedMode: AiAdvisorMode
  llmUsed: boolean
  model: string | null
  fallbackInfo?: AiFallbackInfo
  scoreBreakdown?: AiScoreBreakdown
  progressAudit?: AiProgressAudit
  scheduleLoad?: AiScheduleLoad
  capacityRisks?: AiCapacityRisk[]
  requestId?: string
  debugInfo?: AiDebugInfo
}

export interface AiExplainResult {
  courseOfferingId: string
  courseName: string
  explanation: string
  hardRuleResult: {
    isSelectableNow: boolean
    reasons: string[]
  }
  disclaimer: string
  explanationSummary?: string
  degradedMode?: AiAdvisorMode
  llmUsed?: boolean
  model?: string | null
  fallbackInfo?: AiFallbackInfo
  debugInfo?: AiDebugInfo
}

export type AiAdvisorSavedRecordTypeValue = 'recommendation' | 'explanation'

export interface SaveAiAdvisorRecordBody {
  recordType: AiAdvisorSavedRecordTypeValue
  title?: string
  question?: string
  semesterId?: string
  courseOfferingId?: string
  requestPayload?: Record<string, unknown> | null
  resultPayload: Record<string, unknown>
}

export interface AiAdvisorSavedRecordQuery {
  page?: number
  pageSize: number
  recordType?: AiAdvisorSavedRecordTypeValue
  semesterId?: string
}

export interface AiAdvisorSavedRecordItem {
  id: string
  studentId: string
  semesterId: string | null
  courseOfferingId: string | null
  recordType: AiAdvisorSavedRecordTypeValue
  title: string
  question: string | null
  requestPayload: Record<string, unknown> | null
  resultPayload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface AiAdvisorSavedRecordListPayload {
  items: AiAdvisorSavedRecordItem[]
  pagination: PaginationMeta
}
