import type { PaginationMeta } from './common';

export type EnrollmentStatus = 'enrolled' | 'dropped' | 'withdrawn';

export interface EnrollmentItem {
  enrollmentId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  droppedAt?: string | null;
  courseOffering: {
    id: string;
    courseName: string;
    courseCode: string;
    credits: number;
    courseType: 'required' | 'elective' | 'general';
    teacherName: string;
    semesterName: string;
  };
}

export interface EnrollmentSummary {
  enrolledCount: number;
  enrolledCredits: number;
}

export interface EnrollmentListPayload {
  items: EnrollmentItem[];
  summary: EnrollmentSummary;
  pagination: PaginationMeta;
}

export interface EnrollmentMutationCourseOffering {
  id: string;
  courseCode: string;
  courseName: string;
  capacity: number;
  enrolledCount: number;
  remainingCapacity: number;
}

export interface EnrollmentCreditSummary {
  currentSelectedCredits: number;
  maxCredits: number;
}

export interface EnrollmentMutationPayload {
  enrollment: {
    id: string;
    status: EnrollmentStatus;
    enrolledAt: string;
    droppedAt?: string | null;
  };
  courseOffering: EnrollmentMutationCourseOffering;
  creditSummary?: EnrollmentCreditSummary;
}

export interface EnrollmentQuery {
  page?: number;
  pageSize?: number;
  semesterId?: string;
  status?: EnrollmentStatus;
  keyword?: string;
}

export interface CreateEnrollmentPayload {
  courseOfferingId: string;
  clientRequestId?: string;
  reason?: string;
}

export interface DropEnrollmentPayload {
  reason?: string;
  clientRequestId?: string;
}

export interface TimetableSlot {
  enrollmentId: string;
  courseOfferingId: string;
  courseName: string;
  courseCode: string;
  teacherName: string;
  credits: number;
  dayOfWeek: number;
  startWeek: number;
  endWeek: number;
  startPeriod: number;
  endPeriod: number;
  classroom?: string | null;
}

export interface MissingScheduleItem {
  courseOfferingId: string;
  courseName: string;
  message: string;
}

export interface TimetablePayload {
  semester: {
    id: string;
    name: string;
  };
  printable: boolean;
  items: TimetableSlot[];
  missingScheduleItems: MissingScheduleItem[];
}

export interface RosterStudentItem {
  studentNumber: string;
  studentName: string;
  majorName?: string;
  className?: string;
  enrollmentStatus: EnrollmentStatus;
  enrolledAt: string;
}

export interface RosterPayload {
  offering: RosterOfferingInfo;
  students: RosterStudentItem[];
}

export interface RosterOfferingInfo {
  offeringId: string;
  courseName: string;
  teacherName: string;
}

export interface PaginatedRosterPayload extends RosterPayload {
  pagination: PaginationMeta;
}

export interface RosterQuery {
  offeringId?: string;
  semesterId?: string;
  status?: EnrollmentStatus;
  page?: number;
  pageSize?: number;
}

export interface RosterExportQuery {
  status?: EnrollmentStatus;
  format?: 'xlsx';
}
