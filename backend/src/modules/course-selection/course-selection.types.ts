import {
  CourseType,
  EnrollmentStatus,
  OfferingStatus,
  SelectionPhase,
} from '@prisma/client'

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
  courseType: CourseType
  semesterSuggestion?: number | null
  status?: string
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
  courseType: CourseType
  status: string
}

export interface CourseOfferingItem {
  id: string
  courseId: string
  semesterId: string
  semesterName: string
  courseName: string
  courseCode: string
  credits: number
  courseType: CourseType
  teacherId: string
  teacherName: string
  capacity: number
  enrolledCount: number
  offeringStatus: OfferingStatus
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
  status: EnrollmentStatus
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
  phase: SelectionPhase
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
  enrollmentStatus: EnrollmentStatus
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
