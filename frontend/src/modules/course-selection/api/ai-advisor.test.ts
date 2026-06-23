import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiAdvisorApi } from './ai-advisor';
import { courseSelectionRequest } from './client';

vi.mock('./client', () => ({
  courseSelectionRequest: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('aiAdvisorApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('uses saved AI advice endpoints', () => {
    aiAdvisorApi.listSavedRecords({ page: 1, pageSize: 20, recordType: 'recommendation' });
    aiAdvisorApi.saveRecord({
      recordType: 'recommendation',
      title: '稳妥推荐',
      resultPayload: { recommendations: [] },
    });
    aiAdvisorApi.getSavedRecord('saved-1');
    aiAdvisorApi.deleteSavedRecord('saved-1');

    expect(courseSelectionRequest.get).toHaveBeenNthCalledWith(
      1,
      '/course-selection/ai-advisor/saved',
      {
        params: { page: 1, pageSize: 20, recordType: 'recommendation' },
      }
    );
    expect(courseSelectionRequest.post).toHaveBeenNthCalledWith(
      1,
      '/course-selection/ai-advisor/saved',
      {
        recordType: 'recommendation',
        title: '稳妥推荐',
        resultPayload: { recommendations: [] },
      }
    );
    expect(courseSelectionRequest.get).toHaveBeenNthCalledWith(
      2,
      '/course-selection/ai-advisor/saved/saved-1'
    );
    expect(courseSelectionRequest.delete).toHaveBeenCalledWith('/course-selection/ai-advisor/saved/saved-1');
  });
});
