import { courseSelectionRequest } from './client';
import type { AiAdvicePayload, AiExplainPayload, AiExplainPayloadResult, AiRecommendPayload } from '../types/ai';

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
};
