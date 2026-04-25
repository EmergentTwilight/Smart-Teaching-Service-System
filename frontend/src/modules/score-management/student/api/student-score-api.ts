/**
 * 学生端成绩管理 API
 *
 * 说明：
 * - 封装所有学生端成绩相关的 API 调用
 * - 基于 F3 后端实现的 API 结构
 *
 * F3 后端接口：
 * - POST /api/v1/auth/login                    - 登录获取 token
 * - POST /api/v1/auth/refresh-token            - 刷新 token
 * - GET  /api/v1/students/me/scores            - 获取成绩列表
 * - GET  /api/v1/students/me/score-summary     - 获取 GPA 摘要（含 studentId）
 * - GET  /api/v1/students/:studentId/score-analytics - 获取成绩分析
 *
 * @module score-management/student/api
 */

import type {
  ScoreListQuery,
  ScoreListResponse,
  StudentScoreSummary,
  StudentScoreAnalytics,
} from '../types/score-types'
import { StudentScoreAdapter } from '../adapters/student-score-adapter'
import { createMockScoreList, createMockScoreSummary, createMockScoreAnalytics } from '../adapters/student-score-adapter'

// ==================== Mock 开关 ====================
// 设置为 true 时使用 mock 数据，不请求后端
// 使用 F3 的数据进行测试时需要打开
const USE_MOCK = false

// ==================== 存储键 ====================
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  STUDENT_ID: 'studentId',
} as const

// ==================== API 类 ====================

/**
 * 学生端成绩管理 API 类
 *
 * @remarks
 * 所有组件通过此类调用后端接口
 * 使用真实 HTTP 请求，需要 JWT 认证
 */
export class StudentScoreAPI {
  private readonly baseUrl: string

  constructor() {
    // VITE_API_URL 来自前端环境变量，如 http://localhost:3000
    this.baseUrl = import.meta.env.VITE_API_URL || ''
  }

  // ==================== Token 管理 ====================

  /**
   * 获取存储的 Access Token（从 Zustand authStore）
   */
  private getToken(): string | null {
    // 尝试从 localStorage 的 auth-storage 读取（Zustand persist）
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return parsed.state?.token || null
      } catch {
        return null
      }
    }
    return null
  }

  /**
   * 获取存储的 Refresh Token（从 Zustand authStore）
   */
  private getRefreshToken(): string | null {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return parsed.state?.refreshToken || null
      } catch {
        return null
      }
    }
    return null
  }

  /**
   * 存储 Token（供 F1 登录成功后调用）
   */
  setToken(accessToken: string, refreshToken?: string): void {
    // 同时写入 localStorage 和 authStore 以保持兼容
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken)
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
    }
    // 也更新 Zustand authStore
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        parsed.state.token = accessToken
        if (refreshToken) {
          parsed.state.refreshToken = refreshToken
        }
        localStorage.setItem('auth-storage', JSON.stringify(parsed))
      } catch {
        // ignore
      }
    }
  }

  /**
   * 清除 Token（登出时调用）
   */
  clearToken(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.STUDENT_ID)
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    return !!this.getToken()
  }

  // ==================== Token 刷新 ====================

  /**
   * 刷新 Access Token
   *
   * @returns 是否刷新成功
   */
  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      return false
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        this.clearToken()
        return false
      }

      const data = await response.json()
      if (data.accessToken) {
        this.setToken(data.accessToken, data.refreshToken)
        return true
      }

      return false
    } catch {
      this.clearToken()
      return false
    }
  }

  // ==================== StudentId 管理 ====================

  /**
   * 获取存储的 studentId
   */
  private getStudentId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.STUDENT_ID)
  }

  /**
   * 存储 studentId
   */
  private setStudentId(studentId: string): void {
    localStorage.setItem(STORAGE_KEYS.STUDENT_ID, studentId)
  }

  // ==================== HTTP 请求 ====================

  /**
   * 构建 Authorization header
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  /**
   * 统一请求处理
   *
   * @remarks
   * 自动处理 401 过期，跳转登录页
   */
  private async request<T>(path: string, options?: RequestInit, retry = true): Promise<T> {
    const url = `${this.baseUrl}${path}`

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    })

    // 401: Token 过期，尝试刷新
    if (response.status === 401) {
      if (retry) {
        const refreshed = await this.refreshToken()
        if (refreshed) {
          // 刷新成功，重试原请求
          return this.request(path, options, false)
        }
      }
      // 刷新失败或已重试过，清除 token 并跳转登录
      this.clearToken()
      // 临时：不要自动跳转，方便调试
      // window.location.href = '/login'
      console.error('Token refresh failed - redirecting to login would happen here')
      throw new Error('登录已过期，请重新登录')
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: '请求失败' }))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // ==================== API 方法 ====================

  /**
   * 获取学生本人成绩列表
   *
   * GET /api/v1/students/me/scores
   */
  async getMyScores(query: ScoreListQuery): Promise<ScoreListResponse> {
    // Mock 模式
    if (USE_MOCK) {
      return createMockScoreList(query)
    }

    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
    })
    if (query.semesterId) params.append('semesterId', query.semesterId)
    if (query.keyword) params.append('keyword', query.keyword)

    const data = await this.request<ScoreListResponse>(`/students/me/scores?${params}`)

    return StudentScoreAdapter.adaptScoreList(data)
  }

  /**
   * 获取学生本人 GPA 与学分摘要
   *
   * GET /api/v1/students/me/score-summary
   *
   * @remarks
   * 此接口会返回 studentId，前端应缓存用于后续 API 调用
   */
  async getMyScoreSummary(): Promise<StudentScoreSummary> {
    // Mock 模式
    if (USE_MOCK) {
      return createMockScoreSummary()
    }

    const data = await this.request<StudentScoreSummary>('/students/me/score-summary')

    // 缓存 studentId
    if (data.studentId) {
      this.setStudentId(data.studentId)
    }

    return StudentScoreAdapter.adaptScoreSummary(data)
  }

  /**
   * 获取学生个人成绩分析
   *
   * GET /api/v1/students/:studentId/score-analytics
   *
   * @remarks
   * 需要先调用 getMyScoreSummary() 获取 studentId 并缓存
   */
  async getMyScoreAnalytics(): Promise<StudentScoreAnalytics> {
    // Mock 模式
    if (USE_MOCK) {
      return createMockScoreAnalytics()
    }

    let studentId = this.getStudentId()

    // 如果没有缓存 studentId，先从 score-summary 获取
    if (!studentId) {
      await this.getMyScoreSummary()
      studentId = this.getStudentId()
    }

    if (!studentId) {
      throw new Error('无法获取学生ID，请先登录')
    }

    const data = await this.request<StudentScoreAnalytics>(
      `/students/${studentId}/score-analytics`
    )

    return StudentScoreAdapter.adaptScoreAnalytics(data)
  }
}

// ==================== 导出单例 ====================

export const studentScoreAPI = new StudentScoreAPI()
