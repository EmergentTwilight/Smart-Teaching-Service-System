import { courseSelectionRequest } from './client';
import type {
  EnrollmentListPayload,
  EnrollmentMutationPayload,
  EnrollmentQuery,
  CreateEnrollmentPayload,
  DropEnrollmentPayload,
  TimetablePayload,
} from '../types/enrollment';

export const enrollmentsApi = {
  listMyEnrollments: (params?: EnrollmentQuery) =>
    courseSelectionRequest.get<EnrollmentListPayload>('/course-selection/enrollments/me', {
      params,
    }),
  createEnrollment: (payload: CreateEnrollmentPayload) =>
    courseSelectionRequest.post<EnrollmentMutationPayload>('/course-selection/enrollments', payload),
  dropEnrollment: (enrollmentId: string, payload: DropEnrollmentPayload) =>
    courseSelectionRequest.patch<EnrollmentMutationPayload>(
      `/course-selection/enrollments/${enrollmentId}/drop`,
      payload
    ),
  getMyTimetable: (params?: { semesterId?: string }) =>
    courseSelectionRequest.get<TimetablePayload>('/course-selection/timetable/me', { params }),
};
