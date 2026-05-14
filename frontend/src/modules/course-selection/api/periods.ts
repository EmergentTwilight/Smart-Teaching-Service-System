import { courseSelectionRequest } from './client';
import type {
  SelectionPeriodItem,
  SelectionPeriodQuery,
  SelectionPeriodPayload,
  ManualEnrollmentPayload,
  PaginatedResponse,
} from '../types/period';

export const periodsApi = {
  listPeriods: (params?: SelectionPeriodQuery) =>
    courseSelectionRequest.get<PaginatedResponse<SelectionPeriodItem>>('/course-selection/admin/periods', {
      params,
    }),
  createPeriod: (payload: SelectionPeriodPayload) =>
    courseSelectionRequest.post<SelectionPeriodItem>('/course-selection/admin/periods', payload),
  updatePeriod: (periodId: string, payload: SelectionPeriodPayload) =>
    courseSelectionRequest.patch<SelectionPeriodItem>(`/course-selection/admin/periods/${periodId}`, payload),
  manualEnroll: (payload: ManualEnrollmentPayload) =>
    courseSelectionRequest.post<{ success: boolean }>(
      '/course-selection/admin/enrollments',
      payload
    ),
};
