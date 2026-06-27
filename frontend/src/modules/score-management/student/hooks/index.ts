/**
 * 学生端 Hooks 统一导出
 *
 * @module score-management/student/hooks
 */

export { useStudentScores, refetchStudentScores, scoreQueryKeys } from './use-student-scores'

export {
  useStudentScoreSummary,
  refetchStudentScoreSummary,
  scoreSummaryQueryKeys,
} from './use-student-score-summary'

export {
  useStudentScoreAnalytics,
  refetchStudentScoreAnalytics,
  scoreAnalyticsQueryKeys,
} from './use-student-score-analytics'
