import { courseSelectionRequest } from './client';
import type {
  SelectionPeriodItem,
  SelectionPeriodQuery,
  CreateSelectionPeriodPayload,
  UpdateSelectionPeriodPayload,
  ManualEnrollmentPayload,
  ManualEnrollmentLookupQuery,
  ManualEnrollmentStudentOption,
  ManualEnrollmentCourseOfferingOption,
  ManualEnrollmentResult,
} from '../types/period';
import type { PaginatedResponse } from '../types/common';

export const periodsApi = {
  listPeriods: (params?: SelectionPeriodQuery) =>
    courseSelectionRequest.get<PaginatedResponse<SelectionPeriodItem>>('/course-selection/admin/periods', {
      params,
    }),
  createPeriod: (payload: CreateSelectionPeriodPayload) =>
    courseSelectionRequest.post<SelectionPeriodItem>('/course-selection/admin/periods', payload),
  updatePeriod: (periodId: string, payload: UpdateSelectionPeriodPayload) =>
    courseSelectionRequest.patch<SelectionPeriodItem>(`/course-selection/admin/periods/${periodId}`, payload),
  listManualEnrollmentStudents: (params?: ManualEnrollmentLookupQuery) =>
    courseSelectionRequest.get<PaginatedResponse<ManualEnrollmentStudentOption>>(
      '/course-selection/admin/manual-enrollment/students',
      { params }
    ),
  listManualEnrollmentCourseOfferings: (params?: ManualEnrollmentLookupQuery) =>
    courseSelectionRequest.get<PaginatedResponse<ManualEnrollmentCourseOfferingOption>>(
      '/course-selection/admin/manual-enrollment/course-offerings',
      { params }
    ),
  manualEnroll: (payload: ManualEnrollmentPayload) =>
    courseSelectionRequest.post<ManualEnrollmentResult>(
      '/course-selection/admin/enrollments',
      payload
    ),
};
