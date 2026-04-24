/**
 * 学生端成绩管理 API
 *
 * 说明：
 * - 封装所有学生端成绩相关的 API 调用
 * - 基于 F3 后端实现的 API 结构
 *
 * F3 后端接口：
 * - GET  /api/v1/students/me/scores         - 获取成绩列表
 * - GET  /api/v1/students/me/score-summary  - 获取 GPA 摘要
 * - GET  /api/v1/students/me/score-analytics - 获取成绩分析
 *
 * @module score-management/student/api
 */

import type {
  ScoreListQuery,
  ScoreListResponse,
  StudentScoreSummary,
  StudentScoreAnalytics,
} from '../types/score-types'

// ==================== API 类 ====================

/**
 * 学生端成绩管理 API 类
 *
 * @remarks
 * 所有组件通过此类调用后端接口
 * TODO: 当前使用模拟数据，等 F3 后端部署后替换为真实 HTTP 调用
 */
export class StudentScoreAPI {
  private readonly basePath = '/api/v1'

  /**
   * 获取学生本人成绩列表
   *
   * GET /api/v1/students/me/scores
   *
   * @param query - 查询参数 (page, pageSize, semesterId?, keyword?)
   * @returns 成绩列表
   */
  async getMyScores(query: ScoreListQuery): Promise<ScoreListResponse> {
    // TODO: F3 后端部署后替换为真实调用
    // const response = await fetch(`${this.basePath}/students/me/scores?${new URLSearchParams(query as any)}`)
    // return response.json()

    // Mock 数据占位
    await this.simulateNetworkDelay()
    return this.getMockScoreList(query)
  }

  /**
   * 获取学生本人 GPA 与学分摘要
   *
   * GET /api/v1/students/me/score-summary
   *
   * @returns GPA 摘要
   */
  async getMyScoreSummary(): Promise<StudentScoreSummary> {
    // TODO: F3 后端部署后替换为真实调用
    // const response = await fetch(`${this.basePath}/students/me/score-summary`)
    // return response.json()

    await this.simulateNetworkDelay()
    return this.getMockScoreSummary()
  }

  /**
   * 获取学生个人成绩分析
   *
   * GET /api/v1/students/me/score-analytics
   *
   * @returns 成绩分析
   */
  async getMyScoreAnalytics(): Promise<StudentScoreAnalytics> {
    // TODO: F3 后端部署后替换为真实调用
    // const response = await fetch(`${this.basePath}/students/me/score-analytics`)
    // return response.json()

    await this.simulateNetworkDelay()
    return this.getMockScoreAnalytics()
  }

  // ==================== Mock 数据 ====================

  private getMockScoreList(query: ScoreListQuery): ScoreListResponse {
    const mockItems = [
      {
        scoreId: '1',
        enrollmentId: 'e1',
        courseOfferingId: 'co1',
        courseId: 'c1',
        courseCode: 'CS101',
        courseName: '数据结构与算法',
        credits: 4,
        courseType: 'REQUIRED' as const,
        semesterId: 's1',
        semesterName: '2025-2026-1',
        usualScore: 85,
        midtermScore: 88,
        finalScore: 90,
        totalScore: 88,
        gradePoint: 3.7,
        gradeLetter: 'A-' as const,
        status: 'CONFIRMED' as const,
        hasPendingModificationRequest: false,
      },
      {
        scoreId: '2',
        enrollmentId: 'e2',
        courseOfferingId: 'co2',
        courseId: 'c2',
        courseCode: 'MATH201',
        courseName: '概率论与数理统计',
        credits: 3,
        courseType: 'REQUIRED' as const,
        semesterId: 's1',
        semesterName: '2025-2026-1',
        usualScore: 78,
        midtermScore: 75,
        finalScore: 82,
        totalScore: 79,
        gradePoint: 3.0,
        gradeLetter: 'B' as const,
        status: 'CONFIRMED' as const,
        hasPendingModificationRequest: false,
      },
    ]

    const total = 2
    return {
      items: mockItems,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
  }

  private getMockScoreSummary(): StudentScoreSummary {
    return {
      studentId: 'student-1',
      studentName: '张三',
      majorName: '计算机科学与技术',
      grade: 2023,
      gpa: 3.65,
      averageScore: 85.5,
      totalRequiredCredits: 160,
      earnedCredits: 48,
      passedCredits: 45,
      inProgressCredits: 12,
      passedCourseCount: 12,
      failedCourseCount: 1,
    }
  }

  private getMockScoreAnalytics(): StudentScoreAnalytics {
    return {
      studentId: 'student-1',
      studentName: '张三',
      semesterTrend: [
        {
          semesterId: 's1',
          semesterName: '2024-2025-1',
          gpa: 3.5,
          averageScore: 82,
          earnedCredits: 22,
        },
        {
          semesterId: 's2',
          semesterName: '2024-2025-2',
          gpa: 3.8,
          averageScore: 88,
          earnedCredits: 26,
        },
      ],
      scoreDistribution: [
        { range: 'EXCELLENT', rangeLabel: '优秀', count: 5, percentage: 38.5 },
        { range: 'GOOD', rangeLabel: '良好', count: 4, percentage: 30.8 },
        { range: 'PASS', rangeLabel: '及格', count: 3, percentage: 23.1 },
        { range: 'FAIL', rangeLabel: '不及格', count: 1, percentage: 7.6 },
      ],
      courseTypeBreakdown: [
        { courseType: 'REQUIRED', courseTypeLabel: '必修', earnedCredits: 30, averageScore: 84 },
        { courseType: 'ELECTIVE', courseTypeLabel: '选修', earnedCredits: 10, averageScore: 88 },
        { courseType: 'GENERAL', courseTypeLabel: '通识', earnedCredits: 8, averageScore: 86 },
      ],
    }
  }

  // ==================== 辅助方法 ====================

  private async simulateNetworkDelay(ms: number = 300): Promise<void> {
    const delay = ms + Math.random() * 300
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}

// ==================== 导出单例 ====================

export const studentScoreAPI = new StudentScoreAPI()
