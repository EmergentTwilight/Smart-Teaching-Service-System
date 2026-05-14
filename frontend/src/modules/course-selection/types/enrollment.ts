export type EnrollmentStatus = 'ENROLLED' | 'DROPPED' | 'WITHDRAWN';

export interface EnrollmentItem {
  id: string;
  studentId: string;
  courseOfferingId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  droppedAt?: string | null;
  offering: {
    courseName: string;
    courseCode: string;
    credits: number;
    teacherName: string;
    semesterName: string;
  };
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
  reason?: string;
}

export interface DropEnrollmentPayload {
  reason?: string;
}

export interface TimetableSlot {
  courseOfferingId: string;
  courseName: string;
  courseCode: string;
  teacherName: string;
  dayOfWeek: number;
  startWeek: number;
  endWeek: number;
  startPeriod: number;
  endPeriod: number;
}

export interface TimetablePayload {
  semesterId: string;
  studentId: string;
  semesterName: string;
  slots: TimetableSlot[];
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

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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
