import { courseSelectionRequest } from './client';
import type { AiAdvicePayload, AiExplainPayload, AiExplainPayloadResult, AiRecommendPayload } from '../types/ai';

export const aiAdvisorApi = {
  recommend: (payload: AiRecommendPayload) =>
    courseSelectionRequest.post<AiAdvicePayload>('/course-selection/ai-advisor/recommend', payload),
  explain: (payload: AiExplainPayload) =>
    courseSelectionRequest.post<AiExplainPayloadResult>(
      '/course-selection/ai-advisor/explain',
      payload
    ),
};
