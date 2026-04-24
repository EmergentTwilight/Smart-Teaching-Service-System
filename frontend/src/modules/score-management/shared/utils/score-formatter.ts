/**
 * 成绩格式化工具
 *
 * 说明：
 * - 提供统一的分数、状态、类型格式化方法
 * - 用于组件展示，不做业务逻辑计算
 * - 所有格式化基于已有数据，不进行重新计算
 *
 * @module score-management/shared/utils
 */

import type {
  ScoreStatus,
  CourseType,
} from '../types/common-types'
import {
  SCORE_STATUS,
  COURSE_TYPE,
  SCORE_RANGES,
  getGradeLetter,
  PASSING_SCORE,
} from '../constants/score-constants'

// ==================== 分数格式化 ====================

/**
 * 格式化分数显示
 *
 * @param score - 分数值（可为 null）
 * @param placeholder - 分数为 null 时的占位符
 * @returns 格式化后的字符串
 *
 * @example
 * formatScore(85) // "85"
 * formatScore(null) // "--"
 * formatScore(null, "未录入") // "未录入"
 */
export function formatScore(
  score: number | null,
  placeholder: string = '--'
): string {
  if (score === null) return placeholder
  return score.toString()
}

/**
 * 格式化分数（带小数位）
 *
 * @param score - 分数值
 * @param decimals - 保留小数位数，默认 2 位
 * @returns 格式化后的字符串
 *
 * @example
 * formatScoreWithDecimals(87.5) // "87.50"
 * formatScoreWithDecimals(87.5, 1) // "87.5"
 */
export function formatScoreWithDecimals(
  score: number | null,
  decimals: number = 2
): string {
  if (score === null) return '--'
  return score.toFixed(decimals)
}

/**
 * 判断分数是否及格
 *
 * @param score - 分数值
 * @returns 是否及格
 */
export function isPassingScore(score: number | null): boolean {
  return score !== null && score >= PASSING_SCORE
}

/**
 * 格式化及格/不及格状态
 *
 * @param score - 分数值
 * @returns "及格" | "不及格" | "--"
 */
export function formatPassingStatus(score: number | null): string {
  if (score === null) return '--'
  return score >= PASSING_SCORE ? '及格' : '不及格'
}

// ==================== 等级格式化 ====================

/**
 * 格式化等级字母
 *
 * @param score - 分数值
 * @returns 等级字母或占位符
 *
 * @example
 * formatGradeLetter(85) // "A-"
 * formatGradeLetter(null) // "--"
 */
export function formatGradeLetter(score: number | null): string {
  if (score === null) return '--'
  return getGradeLetter(score)
}

/**
 * 格式化绩点
 *
 * @param point - 绩点值
 * @returns 格式化后的绩点
 *
 * @example
 * formatGradePoint(3.7) // "3.70"
 * formatGradePoint(null) // "--"
 */
export function formatGradePoint(point: number | null): string {
  if (point === null) return '--'
  return point.toFixed(2)
}

// ==================== 状态格式化 ====================

/**
 * 获取成绩状态的显示文本
 *
 * @param status - 成绩状态
 * @returns 状态标签
 *
 * @example
 * formatScoreStatus('DRAFT') // "草稿"
 */
export function formatScoreStatus(status: ScoreStatus): string {
  return SCORE_STATUS[status].label
}

/**
 * 获取成绩状态的 Tag 颜色
 *
 * @param status - 成绩状态
 * @returns Ant Design Tag 的 color 属性值
 *
 * @example
 * getScoreStatusColor('SUBMITTED') // "processing"
 */
export function getScoreStatusColor(
  status: ScoreStatus
): 'default' | 'processing' | 'success' | 'warning' | 'error' {
  return SCORE_STATUS[status].color
}

/**
 * 判断成绩是否可以编辑
 *
 * @param status - 成绩状态
 * @returns 是否可编辑
 */
export function canEditScore(status: ScoreStatus): boolean {
  return status === 'DRAFT'
}

/**
 * 判断成绩是否为最终状态
 *
 * @param status - 成绩状态
 * @returns 是否为最终状态
 */
export function isFinalScore(status: ScoreStatus): boolean {
  return SCORE_STATUS[status].isFinal
}

// ==================== 课程类型格式化 ====================

/**
 * 获取课程类型的显示文本
 *
 * @param type - 课程类型
 * @returns 类型标签
 *
 * @example
 * formatCourseType('REQUIRED') // "必修"
 */
export function formatCourseType(type: CourseType): string {
  return COURSE_TYPE[type].label
}

/**
 * 获取课程类型的颜色
 *
 * @param type - 课程类型
 * @returns 颜色值（用于图表）
 */
export function getCourseTypeColor(type: CourseType): string {
  return COURSE_TYPE[type].color
}

// ==================== 分数段格式化 ====================

/**
 * 根据分数获取分数段信息
 *
 * @param score - 分数值
 * @returns 分数段信息
 *
 * @example
 * getScoreRangeInfo(85) // { range: 'GOOD', label: '良好', min: 80, max: 89, color: '#1890ff' }
 */
export function getScoreRangeInfo(score: number) {
  if (score >= 90) return SCORE_RANGES.EXCELLENT
  if (score >= 80) return SCORE_RANGES.GOOD
  if (score >= 60) return SCORE_RANGES.PASS
  return SCORE_RANGES.FAIL
}

/**
 * 获取分数段的标签
 *
 * @param score - 分数值
 * @returns 分数段标签
 *
 * @example
 * formatScoreRange(85) // "良好"
 */
export function formatScoreRange(score: number): string {
  return getScoreRangeInfo(score).label
}

// ==================== 综合格式化 ====================

/**
 * 格式化成绩为完整字符串
 *
 * @param score - 分数值
 * @param gradeLetter - 等级字母（可选）
 * @returns 格式化后的字符串
 *
 * @example
 * formatFullScore(85, "A-") // "85 (A-)"
 * formatFullScore(85) // "85"
 */
export function formatFullScore(
  score: number | null,
  gradeLetter?: string | null
): string {
  if (score === null) return '--'
  if (gradeLetter) return `${score} (${gradeLetter})`
  return score.toString()
}

/**
 * 格式化学分
 *
 * @param credits - 学分数值
 * @returns 格式化后的字符串
 *
 * @example
 * formatCredits(4) // "4.0"
 * formatCredits(3.5) // "3.5"
 */
export function formatCredits(credits: number | null): string {
  if (credits === null) return '--'
  // 学分通常保留1位小数
  return credits % 1 === 0 ? credits.toFixed(1) : credits.toString()
}

// ==================== 时间格式化 ====================

/**
 * 格式化日期时间
 *
 * @param dateStr - ISO 日期时间字符串
 * @param format - 格式类型
 * @returns 格式化后的字符串
 *
 * @example
 * formatDateTime("2026-04-20T10:30:00Z", "date") // "2026-04-20"
 * formatDateTime("2026-04-20T10:30:00Z", "datetime") // "2026-04-20 10:30"
 */
export function formatDateTime(
  dateStr: string | null,
  format: 'date' | 'datetime' | 'time' = 'datetime'
): string {
  if (!dateStr) return '--'

  const date = new Date(dateStr)

  switch (format) {
    case 'date':
      return date.toLocaleDateString('zh-CN')
    case 'datetime':
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    case 'time':
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })
  }
}

/**
 * 格式化相对时间（如"3天前"）
 *
 * @param dateStr - ISO 日期时间字符串
 * @returns 相对时间字符串
 *
 * @example
 * formatRelativeTime("2026-04-17T10:30:00Z") // "3天前"（假设当前是2026-04-20）
 */
export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '--'

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`
  return `${Math.floor(diffDays / 365)}年前`
}
