import { describe, expect, it, vi } from 'vitest';
import { aiAdvisorApi } from './ai-advisor';
import { courseSelectionRequest } from './client';

vi.mock('./client', () => ({
  courseSelectionRequest: {
    post: vi.fn(),
  },
}));

describe('aiAdvisorApi', () => {
  it('uses a long timeout for AI recommendation and explanation requests', () => {
    const recommendPayload = {
      maxRecommendations: 5,
      preferences: {
        riskTolerance: 'low' as const,
        preferredCourseTypes: ['required' as const],
        avoidEarlyMorning: true,
        preferLowLoad: false,
        preferRequiredCourses: true,
        preferGraduationProgress: true,
      },
    };

    aiAdvisorApi.recommend(recommendPayload);
    aiAdvisorApi.explain({ offeringId: 'offering-1', question: '为什么推荐这门课？' });

    expect(courseSelectionRequest.post).toHaveBeenNthCalledWith(
      1,
      '/course-selection/ai-advisor/recommend',
      recommendPayload,
      { timeout: 70000 }
    );
    expect(courseSelectionRequest.post).toHaveBeenNthCalledWith(
      2,
      '/course-selection/ai-advisor/explain',
      {
        question: '为什么推荐这门课？',
        courseOfferingId: 'offering-1',
      },
      { timeout: 70000 }
    );
  });
});
