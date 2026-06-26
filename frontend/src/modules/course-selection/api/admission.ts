import { courseSelectionRequest } from './client';
import type {
  AdmissionEnterPayload,
  AdmissionLeasePayload,
  AdmissionLeaseRequest,
  AdmissionLeavePayload,
} from '../types/admission';

export const admissionApi = {
  enter: (payload: AdmissionEnterPayload = {}) =>
    courseSelectionRequest.post<AdmissionLeasePayload>('/course-selection/admission/enter', payload),
  heartbeat: (payload: AdmissionLeaseRequest) =>
    courseSelectionRequest.post<AdmissionLeasePayload>(
      '/course-selection/admission/heartbeat',
      payload
    ),
  leave: (payload: AdmissionLeaseRequest) =>
    courseSelectionRequest.post<AdmissionLeavePayload>(
      '/course-selection/admission/leave',
      payload
    ),
};
