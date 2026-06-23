import { courseSelectionRequest } from './client';
import type {
  AiAdvicePayload,
  AiAdvisorSavedRecord,
  AiAdvisorSavedRecordListPayload,
  AiAdvisorSavedRecordQuery,
  AiExplainPayload,
  AiExplainPayloadResult,
  AiRecommendPayload,
  SaveAiAdvisorRecordPayload,
} from '../types/ai';

const AI_ADVISOR_REQUEST_TIMEOUT_MS = 70000;

export const aiAdvisorApi = {
  recommend: (payload: AiRecommendPayload) =>
    courseSelectionRequest.post<AiAdvicePayload>('/course-selection/ai-advisor/recommend', payload, {
      timeout: AI_ADVISOR_REQUEST_TIMEOUT_MS,
    }),
  explain: ({ offeringId, ...payload }: AiExplainPayload) =>
    courseSelectionRequest.post<AiExplainPayloadResult>(
      '/course-selection/ai-advisor/explain',
      {
        ...payload,
        courseOfferingId: offeringId,
      },
      {
        timeout: AI_ADVISOR_REQUEST_TIMEOUT_MS,
      }
    ),
  listSavedRecords: (query?: AiAdvisorSavedRecordQuery) =>
    courseSelectionRequest.get<AiAdvisorSavedRecordListPayload>('/course-selection/ai-advisor/saved', {
      params: query,
    }),
  saveRecord: (payload: SaveAiAdvisorRecordPayload) =>
    courseSelectionRequest.post<AiAdvisorSavedRecord>('/course-selection/ai-advisor/saved', payload),
  getSavedRecord: (id: string) =>
    courseSelectionRequest.get<AiAdvisorSavedRecord>(`/course-selection/ai-advisor/saved/${id}`),
  deleteSavedRecord: (id: string) =>
    courseSelectionRequest.delete<{ id: string; deleted: true }>(`/course-selection/ai-advisor/saved/${id}`),
};
