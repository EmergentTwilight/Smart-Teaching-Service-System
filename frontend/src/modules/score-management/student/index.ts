/**
 * 学生端模块统一导出
 *
 * @module score-management/student
 */

// ==================== 类型 ====================
export type {
  ScoreListQuery,
  ScoreItem,
  ScoreListResponse,
  StudentScoreSummary,
  StudentScoreAnalytics,
} from './types/score-types'

// ==================== API ====================
export { studentScoreAPI } from './api/student-score-api'

// ==================== Hooks ====================
export {
  useStudentScores,
  useStudentScoreSummary,
  useStudentScoreAnalytics,
  refetchStudentScores,
  refetchStudentScoreSummary,
  refetchStudentScoreAnalytics,
  scoreQueryKeys,
  scoreSummaryQueryKeys,
  scoreAnalyticsQueryKeys,
} from './hooks'

// ==================== 适配器（开发阶段使用）====================
// 注意：生产环境不应直接使用适配器的 Mock 数据函数
export {
  createMockScoreList,
  createMockScoreSummary,
  createMockScoreAnalytics,
} from './adapters/student-score-adapter'

// ==================== 页面 ====================
export { StudentScoreQueryPage } from './pages'
