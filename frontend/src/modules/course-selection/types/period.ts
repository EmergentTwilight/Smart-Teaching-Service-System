export type SelectionPhase = 'first_round' | 'second_round' | 'adjustment';
export type SelectionPeriodServerStatus = 'not_started' | 'open' | 'ended';

export interface SelectionPeriodItem {
  id: string;
  semester: {
    id: string;
    name: string;
  };
  phase: SelectionPhase;
  startTime: string;
  endTime: string;
  maxCredits?: number;
  allowDrop: boolean;
  isActive: boolean;
  serverStatus: SelectionPeriodServerStatus;
}

export interface SelectionPeriodQuery {
  page?: number;
  pageSize?: number;
  semesterId?: string;
}

export interface CreateSelectionPeriodPayload {
  semesterId: string;
  phase: SelectionPhase;
  startTime: string;
  endTime: string;
  maxCredits?: number;
  allowDrop: boolean;
  isActive: boolean;
}

export interface UpdateSelectionPeriodPayload {
  phase?: SelectionPhase;
  startTime?: string;
  endTime?: string;
  maxCredits?: number;
  allowDrop?: boolean;
  isActive?: boolean;
}

export interface ManualEnrollmentPayload {
  studentId: string;
  courseOfferingId: string;
  reason: string;
}

export interface ManualEnrollmentLookupQuery {
  keyword?: string;
  semesterId?: string;
  page?: number;
  pageSize?: number;
}

export interface ManualEnrollmentStudentOption {
  studentId: string;
  studentNumber: string;
  username: string;
  realName: string;
  majorName?: string | null;
  grade: number;
  className?: string | null;
}

export interface ManualEnrollmentCourseOfferingOption {
  courseOfferingId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  semester: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    realName: string;
    teacherNumber?: string | null;
  };
  capacity: number;
  enrolledCount: number;
  remainingCapacity: number;
  status: 'planned' | 'open' | 'closed' | 'cancelled';
  scheduleSummary: string[];
}

export interface ManualEnrollmentResult {
  enrollment: {
    id: string;
    studentId: string;
    courseOfferingId: string;
    status: 'enrolled' | 'dropped' | 'withdrawn';
    enrolledAt: string;
  };
  courseOffering: {
    id: string;
    capacity: number;
    enrolledCount: number;
    remainingCapacity: number;
  };
  audit: {
    logged: boolean;
    action: string;
  };
}
