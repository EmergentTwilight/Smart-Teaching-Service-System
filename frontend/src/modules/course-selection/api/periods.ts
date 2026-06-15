import { courseSelectionRequest } from './client';
import type {
  SelectionPeriodItem,
  SelectionPeriodQuery,
  CreateSelectionPeriodPayload,
  UpdateSelectionPeriodPayload,
  ManualEnrollmentPayload,
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
  manualEnroll: (payload: ManualEnrollmentPayload) =>
    courseSelectionRequest.post<ManualEnrollmentResult>(
      '/course-selection/admin/enrollments',
      payload
    ),
};
