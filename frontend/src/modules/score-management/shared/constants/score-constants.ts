/**
 * 成绩管理相关常量
 *
 * 说明：
 * - 定义分数段、状态、类型等常量
 * - 统一管理，避免硬编码
 * - 方便国际化和主题切换
 *
 * @module score-management/shared/constants
 */

import type {
  ScoreRange,
  ScoreStatus,
  CourseType,
  ScoreRangeInfo,
  ScoreStatusInfo,
  CourseTypeInfo,
  BackendScoreRange,
} from '../types/common-types'

// ==================== 分数段常量 ====================

/**
 * 分数段定义
 *
 * @remarks
 * 用于成绩统计和图表展示
 */
export const SCORE_RANGES: Record<ScoreRange, ScoreRangeInfo> = {
  EXCELLENT: {
    range: 'EXCELLENT',
    label: '优秀',
    min: 90,
    max: 100,
    color: '#52c41a', // green
  },
  GOOD: {
    range: 'GOOD',
    label: '良好',
    min: 80,
    max: 89,
    color: '#1890ff', // blue
  },
  PASS: {
    range: 'PASS',
    label: '及格',
    min: 60,
    max: 79,
    color: '#faad14', // orange
  },
  FAIL: {
    range: 'FAIL',
    label: '不及格',
    min: 0,
    max: 59,
    color: '#ff4d4f', // red
  },
}

/**
 * 分数段数组（按分数从高到低排序）
 */
export const SCORE_RANGE_ARRAY: ScoreRangeInfo[] = [
  SCORE_RANGES.EXCELLENT,
  SCORE_RANGES.GOOD,
  SCORE_RANGES.PASS,
  SCORE_RANGES.FAIL,
]

/**
 * 获取指定分数的区间
 */
export function getScoreRange(score: number): ScoreRangeInfo {
  if (score >= 90) return SCORE_RANGES.EXCELLENT
  if (score >= 80) return SCORE_RANGES.GOOD
  if (score >= 60) return SCORE_RANGES.PASS
  return SCORE_RANGES.FAIL
}

// ==================== 后端分数段映射 ====================

/**
 * 后端分数段字符串到前端枚举的映射
 */
export const BACKEND_RANGE_TO_SCORE_RANGE: Record<BackendScoreRange, ScoreRange> = {
  '90-100': 'EXCELLENT',
  '80-89': 'GOOD',
  '70-79': 'PASS',
  '60-69': 'PASS',
  '0-59': 'FAIL',
}

/**
 * 后端分数段映射为前端区间信息
 */
export function convertBackendRange(backendRange: BackendScoreRange): ScoreRangeInfo {
  const scoreRange = BACKEND_RANGE_TO_SCORE_RANGE[backendRange]
  return SCORE_RANGES[scoreRange]
}

// ==================== 成绩状态常量 ====================

/**
 * 成绩状态定义
 *
 * @remarks
 * 用于状态展示和判断
 */
export const SCORE_STATUS: Record<ScoreStatus, ScoreStatusInfo> = {
  DRAFT: {
    value: 'DRAFT',
    label: '草稿',
    color: 'default',
    isFinal: false,
  },
  SUBMITTED: {
    value: 'SUBMITTED',
    label: '已提交',
    color: 'processing',
    isFinal: true,
  },
  CONFIRMED: {
    value: 'CONFIRMED',
    label: '已确认',
    color: 'success',
    isFinal: true,
  },
}

/**
 * 成绩状态数组
 */
export const SCORE_STATUS_ARRAY: ScoreStatusInfo[] = [
  SCORE_STATUS.DRAFT,
  SCORE_STATUS.SUBMITTED,
  SCORE_STATUS.CONFIRMED,
]

/**
 * 判断成绩是否可以编辑
 *
 * @remarks
 * 只有草稿状态可以编辑
 */
export function isScoreEditable(status: ScoreStatus): boolean {
  return status === 'DRAFT'
}

/**
 * 判断成绩是否为最终状态
 *
 * @remarks
 * 已提交或已确认的状态都是最终状态
 */
export function isScoreFinal(status: ScoreStatus): boolean {
  return SCORE_STATUS[status].isFinal
}

// ==================== 课程类型常量 ====================

/**
 * 课程类型定义
 */
export const COURSE_TYPE: Record<CourseType, CourseTypeInfo> = {
  REQUIRED: {
    value: 'REQUIRED',
    label: '必修',
    color: '#ff7875', // red
  },
  ELECTIVE: {
    value: 'ELECTIVE',
    label: '选修',
    color: '#69c0ff', // blue
  },
  GENERAL: {
    value: 'GENERAL',
    label: '通识',
    color: '#95de64', // green
  },
}

/**
 * 课程类型数组
 */
export const COURSE_TYPE_ARRAY: CourseTypeInfo[] = [
  COURSE_TYPE.REQUIRED,
  COURSE_TYPE.ELECTIVE,
  COURSE_TYPE.GENERAL,
]

// ==================== 等级字母常量 ====================

/**
 * 等级字母与分数范围对应表
 *
 * @remarks
 * ⚠️ 注意：具体对应关系需根据学校教学标准确定
 * 当前为常见标准，待确认
 */
export const GRADE_LETTER_RANGES: Array<{
  letter: string
  min: number
  max: number
  point: number
}> = [
  { letter: 'A+', min: 95, max: 100, point: 4.0 },
  { letter: 'A', min: 90, max: 94, point: 4.0 },
  { letter: 'A-', min: 85, max: 89, point: 3.7 },
  { letter: 'B+', min: 80, max: 84, point: 3.3 },
  { letter: 'B', min: 75, max: 79, point: 3.0 },
  { letter: 'B-', min: 70, max: 74, point: 2.7 },
  { letter: 'C+', min: 65, max: 69, point: 2.3 },
  { letter: 'C', min: 60, max: 64, point: 2.0 },
  { letter: 'D', min: 0, max: 59, point: 1.0 },   // 及格边缘
  { letter: 'F', min: 0, max: 59, point: 0.0 },   // 不及格
]

/**
 * 根据分数获取等级字母
 *
 * @remarks
 * ⚠️ 需确认：D 和 F 的分数区分逻辑
 */
export function getGradeLetter(score: number): string {
  for (const range of GRADE_LETTER_RANGES) {
    if (score >= range.min && score <= range.max) {
      return range.letter
    }
  }
  return 'F'
}

/**
 * 根据分数获取绩点
 *
 * @remarks
 * ⚠️ 需确认：绩点计算标准
 */
export function getGradePoint(score: number): number {
  for (const range of GRADE_LETTER_RANGES) {
    if (score >= range.min && score <= range.max) {
      return range.point
    }
  }
  return 0.0
}

// ==================== 其他常量 ====================

/**
 * 及格分数线
 *
 * @remarks
 * ⚠️ 需确认：学校及格标准是否为 60 分
 */
export const PASSING_SCORE = 60

/**
 * 默认分页大小
 */
export const DEFAULT_PAGE_SIZE = 20

/**
 * 分页大小选项
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

/**
 * 成绩录入的最小/最大分数
 */
export const SCORE_LIMITS = {
  MIN: 0,
  MAX: 100,
} as const
