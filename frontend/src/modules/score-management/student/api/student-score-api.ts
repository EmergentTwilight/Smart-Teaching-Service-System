import request from '@/shared/utils/request'
import type {
  ScoreListQuery,
  ScoreListResponse,
  StudentScoreAnalytics,
  StudentScoreSummary,
} from '../types/score-types'
import { StudentScoreAdapter } from '../adapters/student-score-adapter'

type BackendScoreListResponse = Parameters<typeof StudentScoreAdapter.adaptScoreList>[0]
type BackendStudentScoreSummary = Parameters<typeof StudentScoreAdapter.adaptScoreSummary>[0]
type BackendStudentScoreAnalytics = Parameters<typeof StudentScoreAdapter.adaptScoreAnalytics>[0]

class StudentScoreAPI {
  private currentStudentId: string | null = null

  async getMyScores(query: ScoreListQuery): Promise<ScoreListResponse> {
    const data = await request.get<unknown, BackendScoreListResponse>('/students/me/scores', {
      params: query,
    })

    return StudentScoreAdapter.adaptScoreList(data)
  }

  async getMyScoreSummary(): Promise<StudentScoreSummary> {
    const data = await request.get<unknown, BackendStudentScoreSummary>('/students/me/score-summary')
    const summary = StudentScoreAdapter.adaptScoreSummary(data)
    this.currentStudentId = summary.studentId
    return summary
  }

  async getMyScoreAnalytics(): Promise<StudentScoreAnalytics> {
    if (!this.currentStudentId) {
      await this.getMyScoreSummary()
    }

    if (!this.currentStudentId) {
      throw new Error('无法获取学生ID，请先登录')
    }

    const data = await request.get<unknown, BackendStudentScoreAnalytics>(
      `/students/${this.currentStudentId}/score-analytics`
    )

    return StudentScoreAdapter.adaptScoreAnalytics(data)
  }
}

export const studentScoreAPI = new StudentScoreAPI()
