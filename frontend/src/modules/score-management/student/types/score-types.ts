/**
 * 学生端成绩类型定义
 *
 * 说明：
 * - 基于 F3 后端 API 返回结构定义
 * - 与后端 /students/me/scores, /students/me/score-summary, /students/me/score-analytics 对应
 *
 * @module score-management/student/types
 */

import type { ScoreStatus, CourseType, GradeLetter } from '../../shared/types/common-types'
import type { BackendScoreRange } from '../../shared/types/common-types'

// ==================== 查询参数 ====================

/**
 * 成绩列表查询参数
 *
 * @remarks
 * 对应 F3 后端 myScoresQuerySchema
 */
export interface ScoreListQuery {
  /** 学期ID筛选 */
  semesterId?: string
  /** 课程关键词（课程代码或课程名称） */
  keyword?: string
  /** 页码（从1开始） */
  page: number
  /** 每页数量 */
  pageSize: number
}

// ==================== 响应类型 ====================

/**
 * 单条成绩记录（学生端视图模型）
 *
 * @remarks
 * 直接对应 F3 后端 getMyScores 返回的 items 数组元素
 */
export interface ScoreItem {
  /** 成绩ID */
  scoreId: string
  /** 选课记录ID */
  enrollmentId: string
  /** 开课记录ID */
  courseOfferingId: string
  /** 课程ID */
  courseId: string
  /** 课程代码 */
  courseCode: string
  /** 课程名称 */
  courseName: string
  /** 学分 */
  credits: number
  /** 课程类型 */
  courseType: CourseType
  /** 学期ID */
  semesterId: string
  /** 学期名称 */
  semesterName: string
  /** 平时成绩 */
  usualScore: number | null
  /** 期中成绩 */
  midtermScore: number | null
  /** 期末成绩 */
  finalScore: number | null
  /** 总评成绩 */
  totalScore: number | null
  /** 绩点 */
  gradePoint: number | null
  /** 等级字母 */
  gradeLetter: GradeLetter | null
  /** 成绩状态 */
  status: ScoreStatus
  /** 是否有待处理的改分申请 */
  hasPendingModificationRequest: boolean
  /** 是否为同一课程多次成绩中的有效成绩 */
  isEffective: boolean
  /** 成绩录入时间 */
  enteredAt?: string | null
  /** 成绩最后修改时间 */
  modifiedAt?: string | null
}

/**
 * 成绩列表响应
 */
export interface ScoreListResponse {
  /** 成绩列表 */
  items: ScoreItem[]
  /** 分页信息 */
  pagination: {
    /** 当前页码 */
    page: number
    /** 每页数量 */
    pageSize: number
    /** 总记录数 */
    total: number
    /** 总页数 */
    totalPages: number
  }
}

// ==================== GPA 摘要 ====================

/**
 * 学生 GPA 与学分摘要
 *
 * @remarks
 * 对应 F3 后端 getStudentScoreSummary 返回
 */
export interface StudentScoreSummary {
  /** 学生ID */
  studentId: string
  /** 学生姓名 */
  studentName: string
  /** 专业名称 */
  majorName: string | null
  /** 年级 */
  grade: number | null

  // GPA 相关
  /** GPA */
  gpa: number | null
  /** 平均分 */
  averageScore: number | null

  // 学分相关
  /** 应修学分（培养方案要求） */
  totalRequiredCredits: number | null
  /** 已修学分（含未通过） */
  earnedCredits: number
  /** 通过学分 */
  passedCredits: number
  /** 在修学分（未出成绩） */
  inProgressCredits: number
  /** 培养方案剩余应修学分 */
  remainingRequiredCredits: number | null

  // 课程统计
  /** 已通过课程数 */
  passedCourseCount: number
  /** 未通过课程数 */
  failedCourseCount: number
  /** 有效成绩规则说明 */
  effectiveScoreRule: string
  /** 培养方案进度 */
  curriculumProgress: CurriculumProgress
}

export interface CurriculumProgress {
  curriculumId: string | null
  curriculumName: string | null
  totalRequiredCredits: number | null
  requiredCredits: number | null
  electiveCredits: number | null
  passedCredits: number
  requiredPassedCredits: number
  electivePassedCredits: number
  remainingRequiredCredits: number | null
  curriculumCourseCount: number
  completedCurriculumCourseCount: number
  completionRate: number | null
}

// ==================== 成绩分析 ====================

/**
 * 学期趋势数据点
 */
export interface SemesterTrendPoint {
  /** 学期ID */
  semesterId: string
  /** 学期名称 */
  semesterName: string
  /** 学期GPA */
  gpa: number | null
  /** 学期平均分 */
  averageScore: number | null
  /** 学期获得学分 */
  earnedCredits: number
}

/**
 * 成绩分布数据点
 *
 * @remarks
 * F3 后端返回的是 { range: "0-59", count: number } 格式
 * 前端保留后端分段，避免 60-69 和 70-79 合并后产生重复 key。
 */
export interface ScoreDistributionPoint {
  /** 分数段 */
  range: BackendScoreRange
  /** 分数段标签 */
  rangeLabel: string
  /** 该分数段课程数 */
  count: number
  /** 百分比 */
  percentage: number
}

/**
 * 课程类型分布数据点
 */
export interface CourseTypeBreakdownPoint {
  /** 课程类型 */
  courseType: CourseType
  /** 课程类型标签 */
  courseTypeLabel: string
  /** 已修学分 */
  earnedCredits: number
  /** 平均分 */
  averageScore: number | null
}

/**
 * 学生个人成绩分析
 *
 * @remarks
 * 对应 F3 后端 getStudentScoreAnalytics 返回
 */
export interface StudentScoreAnalytics {
  /** 学生ID */
  studentId: string
  /** 学生姓名 */
  studentName: string

  // 学期趋势
  /** 按学期的成绩趋势 */
  semesterTrend: SemesterTrendPoint[]

  // 成绩分布
  /** 成绩分数段分布 */
  scoreDistribution: ScoreDistributionPoint[]

  // 课程类型分布
  /** 按课程类型的学分分布 */
  courseTypeBreakdown: CourseTypeBreakdownPoint[]
}
