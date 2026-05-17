export type CourseTypeValue = 'required' | 'elective' | 'general'
export type CourseStatusValue = 'active' | 'archived'
export type OfferingStatusValue = 'planned' | 'open' | 'closed' | 'cancelled'
export type EnrollmentStatusValue = 'enrolled' | 'dropped' | 'withdrawn'
export type SelectionPhaseValue = 'first_round' | 'second_round' | 'adjustment'

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
  onlyAvailable?: boolean
  only_available?: boolean
  includeConflictReasons?: boolean
  include_conflict_reasons?: boolean
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
  idempotencyKey?: string
  reason?: string
}

export interface DropEnrollmentBody {
  reason?: string
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
  isActive: boolean
}

export interface UpdateSelectionPeriodBody {
  semesterId?: string
  phase?: string
  startTime?: string
  endTime?: string
  maxCredits?: number
  isActive?: boolean
}

export interface ManualEnrollmentBody {
  studentId: string
  courseOfferingId: string
  reason: string
  notifyStudent?: boolean
}

export interface RosterQuery extends BaseQuery {
  offeringId?: string
  semesterId?: string
  status?: string
  keyword?: string
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
  PERIOD_CLOSED: 'CS_PERIOD_CLOSED',
  OFFERING_NOT_FOUND: 'CS_OFFERING_NOT_FOUND',
  OFFERING_CLOSED: 'CS_OFFERING_CLOSED',
  OFFERING_FULL: 'CS_OFFERING_FULL',
  DUPLICATE_ENROLLMENT: 'CS_DUPLICATE_ENROLLMENT',
  SCHEDULE_CONFLICT: 'CS_SCHEDULE_CONFLICT',
  MAX_CREDITS_EXCEEDED: 'CS_MAX_CREDITS_EXCEEDED',
  PREREQUISITE_NOT_MET: 'CS_PREREQUISITE_NOT_MET',
  ENROLLMENT_NOT_FOUND: 'CS_ENROLLMENT_NOT_FOUND',
  FORBIDDEN: 'CS_FORBIDDEN',
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
}

export interface CurriculumInfo {
  id: string
  name: string
  year: number
  majorName: string
  totalCredits: number
  requiredCredits?: number
  electiveCredits?: number
}

export interface CurriculumProgress {
  totalSelectedCredits: number
  requiredSelectedCredits: number
  electiveSelectedCredits: number
  generalSelectedCredits: number
  totalCreditRatio: number
}

export interface CourseListItem {
  id: string
  code: string
  name: string
  credits: number
  courseType: CourseTypeValue
  status: CourseStatusValue
}

export interface CourseOfferingItem {
  id: string
  courseId: string
  semesterId: string
  semesterName: string
  courseName: string
  courseCode: string
  credits: number
  courseType: CourseTypeValue
  teacherId: string
  teacherName: string
  capacity: number
  enrolledCount: number
  offeringStatus: OfferingStatusValue
  isAvailable: boolean
  hasConflictHint?: string
  prerequisiteHint?: string
}

export interface CourseOfferingDetail extends CourseOfferingItem {
  description?: string
  assessmentMethod?: string
  schedules: Array<{
    dayOfWeek: number
    startWeek: number
    endWeek: number
    startPeriod: number
    endPeriod: number
    classroomName?: string
  }>
  prerequisites: Array<{
    courseCode: string
    courseName: string
  }>
}

export interface EnrollmentItem {
  id: string
  studentId: string
  courseOfferingId: string
  status: EnrollmentStatusValue
  enrolledAt: string
  droppedAt?: string | null
  offering: {
    courseName: string
    courseCode: string
    credits: number
    teacherName: string
    semesterName: string
  }
}

export interface TimetableSlot {
  courseOfferingId: string
  courseName: string
  courseCode: string
  teacherName: string
  dayOfWeek: number
  startWeek: number
  endWeek: number
  startPeriod: number
  endPeriod: number
}

export interface TimetablePayload {
  semesterId: string
  studentId: string
  semesterName: string
  slots: TimetableSlot[]
}

export interface SelectionPeriodItem {
  id: string
  semesterId: string
  semesterName: string
  phase: SelectionPhaseValue
  startTime: string
  endTime: string
  maxCredits?: number
  isActive: boolean
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

export interface AiRecommendationItem {
  offeringId: string
  courseCode: string
  courseName: string
  teacherName: string
  score: number
  reason: string
  riskLevel: 'low' | 'medium' | 'high'
}

export interface AiAdvicePayload {
  recommendations: AiRecommendationItem[]
  creditImpactSummary: string
  conflictWarnings: string[]
  explanation: string
  isDraftAdviceOnly: boolean
}
