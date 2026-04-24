/**
 * 共享层统一导出
 *
 * @module score-management/shared
 */

// ==================== 类型 ====================
export type {
  ScoreStatus,
  CourseType,
  ScoreRange,
  BackendScoreRange,
  GradeLetter,
  CourseInfo,
  SemesterInfo,
  StudentInfo,
  TeacherInfo,
  ScoreComponents,
  GradeInfo,
  ScoreEntryInfo,
  BaseScore,
  ScoreRangeInfo,
  ScoreStatusInfo,
  CourseTypeInfo,
} from './types/common-types'

export {
  isValidScoreStatus,
  isValidCourseType,
  isValidScore,
  isValidGradePoint,
} from './types/common-types'

// ==================== 常量 ====================
export {
  SCORE_RANGES,
  SCORE_RANGE_ARRAY,
  getScoreRange,
  BACKEND_RANGE_TO_SCORE_RANGE,
  convertBackendRange,
  SCORE_STATUS,
  SCORE_STATUS_ARRAY,
  isScoreEditable,
  isScoreFinal,
  COURSE_TYPE,
  COURSE_TYPE_ARRAY,
  GRADE_LETTER_RANGES,
  getGradeLetter,
  getGradePoint,
  PASSING_SCORE,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  SCORE_LIMITS,
} from './constants/score-constants'

// ==================== 工具函数 ====================
export {
  formatScore,
  formatScoreWithDecimals,
  isPassingScore,
  formatPassingStatus,
  formatGradeLetter,
  formatGradePoint,
  formatScoreStatus,
  getScoreStatusColor,
  canEditScore,
  isFinalScore,
  formatCourseType,
  getCourseTypeColor,
  getScoreRangeInfo,
  formatScoreRange,
  formatFullScore,
  formatCredits,
  formatDateTime,
  formatRelativeTime,
} from './utils/score-formatter'
