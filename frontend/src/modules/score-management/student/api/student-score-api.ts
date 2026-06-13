import request from '@/shared/utils/request'
import type {
  ScoreListQuery,
  ScoreListResponse,
  StudentScoreAnalytics,
  StudentScoreSummary,
} from '../types/score-types'
import {
  createMockScoreAnalytics,
  createMockScoreList,
  createMockScoreSummary,
  StudentScoreAdapter,
} from '../adapters/student-score-adapter'

type BackendScoreListResponse = Parameters<typeof StudentScoreAdapter.adaptScoreList>[0]
type BackendStudentScoreSummary = Parameters<typeof StudentScoreAdapter.adaptScoreSummary>[0]
type BackendStudentScoreAnalytics = Parameters<typeof StudentScoreAdapter.adaptScoreAnalytics>[0]

function shouldUseMockScores(): boolean {
  const search = new URLSearchParams(window.location.search)
  const queryValue = search.get('scoreMock') ?? search.get('mockScore')
  const envValue = import.meta.env.VITE_SCORE_MOCK
  const value = queryValue ?? envValue

  return value === '1' || value === 'true'
}

class StudentScoreAPI {
  async getMyScores(query: ScoreListQuery): Promise<ScoreListResponse> {
    if (shouldUseMockScores()) {
      return createMockScoreList(query)
    }

    const data = await request.get<unknown, BackendScoreListResponse>('/students/me/scores', {
      params: query,
    })

    return StudentScoreAdapter.adaptScoreList(data)
  }

  async getMyScoreSummary(): Promise<StudentScoreSummary> {
    if (shouldUseMockScores()) {
      return createMockScoreSummary()
    }

    const data = await request.get<unknown, BackendStudentScoreSummary>('/students/me/score-summary')
    return StudentScoreAdapter.adaptScoreSummary(data)
  }

  async getMyScoreAnalytics(): Promise<StudentScoreAnalytics> {
    if (shouldUseMockScores()) {
      return createMockScoreAnalytics()
    }

    const data = await request.get<unknown, BackendStudentScoreAnalytics>(
      '/students/me/score-analytics'
    )

    return StudentScoreAdapter.adaptScoreAnalytics(data)
  }
}

export const studentScoreAPI = new StudentScoreAPI()
