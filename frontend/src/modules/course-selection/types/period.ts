export type SelectionPhase = 'first_round' | 'second_round' | 'adjustment';

export interface SelectionPeriodItem {
  id: string;
  semesterId: string;
  semesterName: string;
  phase: SelectionPhase;
  startTime: string;
  endTime: string;
  maxCredits?: number;
  isActive: boolean;
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
