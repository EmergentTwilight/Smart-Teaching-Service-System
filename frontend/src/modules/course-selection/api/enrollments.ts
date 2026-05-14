import { courseSelectionRequest } from './client';
import type {
  EnrollmentItem,
  EnrollmentQuery,
  CreateEnrollmentPayload,
  DropEnrollmentPayload,
  TimetablePayload,
} from '../types/enrollment';
import type { PaginatedResponse } from '../types/common';

export const enrollmentsApi = {
  listMyEnrollments: (params?: EnrollmentQuery) =>
    courseSelectionRequest.get<PaginatedResponse<EnrollmentItem>>('/course-selection/enrollments/me', {
      params,
    }),
  createEnrollment: (payload: CreateEnrollmentPayload) =>
    courseSelectionRequest.post<EnrollmentItem>('/course-selection/enrollments', payload),
  dropEnrollment: (enrollmentId: string, payload: DropEnrollmentPayload) =>
    courseSelectionRequest.patch<EnrollmentItem>(
      `/course-selection/enrollments/${enrollmentId}/drop`,
      payload
    ),
  getMyTimetable: (params?: { semesterId?: string }) =>
    courseSelectionRequest.get<TimetablePayload>('/course-selection/timetable/me', { params }),
};
