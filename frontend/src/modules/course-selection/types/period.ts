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
  isActive: boolean;
  serverStatus: SelectionPeriodServerStatus;
}

export interface SelectionPeriodQuery {
  page?: number;
  pageSize?: number;
  semesterId?: string;
}

export interface SelectionPeriodPayload {
  semesterId: string;
  phase: SelectionPhase;
  startTime: string;
  endTime: string;
  maxCredits?: number;
  isActive?: boolean;
}

export interface ManualEnrollmentPayload {
  studentId: string;
  courseOfferingId: string;
  reason: string;
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
