/**
 * 共享基础类型定义
 *
 * 说明：
 * - 只包含 F4（教师端）和 F5（学生端）都会使用的基础类型
 * - 各自独有的类型放在各自的 types/ 目录下
 * - 所有类型都使用 TypeScript 严格类型定义
 *
 * @module score-management/shared/types
 */

// ==================== 枚举类型 ====================

/**
 * 成绩状态
 *
 * @remarks
 * - DRAFT: 草稿状态，教师可以编辑
 * - SUBMITTED: 已提交，教师不能直接修改，需走审批流程
 * - CONFIRMED: 已确认，审批通过后的最终状态
 */
export type ScoreStatus = 'DRAFT' | 'SUBMITTED' | 'CONFIRMED'

/**
 * 课程类型
 *
 * @remarks
 * - REQUIRED: 必修课
 * - ELECTIVE: 选修课
 * - GENERAL: 通识课
 */
export type CourseType = 'REQUIRED' | 'ELECTIVE' | 'GENERAL'

/**
 * 分数段
 *
 * @remarks
 * 用于成绩统计和图表展示
 * 注意：F3 后端返回的 range 是字符串格式如 "0-59"，不是枚举
 * 前端展示时转换为此枚举类型
 */
export type ScoreRange =
  | 'EXCELLENT'  // 90-100  优秀
  | 'GOOD'       // 80-89   良好
  | 'PASS'       // 60-79   及格
  | 'FAIL'       // 0-59    不及格

/**
 * 后端返回的分数段字符串格式
 */
export type BackendScoreRange = '0-59' | '60-69' | '70-79' | '80-89' | '90-100'

/**
 * 等级字母
 *
 * @remarks
 * 与分数对应的等级表示
 */
export type GradeLetter =
  | 'A+'   // 95-100
  | 'A'    // 90-94
  | 'A-'   // 85-89
  | 'B+'   // 80-84
  | 'B'    // 75-79
  | 'B-'   // 70-74
  | 'C+'   // 65-69
  | 'C'    // 60-64
  | 'D'    // <60    (及格边缘)
  | 'F'    // <60    (不及格)

// ==================== 基础接口 ====================

/**
 * 课程基础信息
 *
 * @remarks
 * F4 和 F5 都需要展示课程信息，所以定义为基础共享类型
 */
export interface CourseInfo {
  /** 课程ID */
  id: string
  /** 课程代码 */
  code: string
  /** 课程名称 */
  name: string
  /** 课程类型 */
  type: CourseType
  /** 学分 */
  credits: number
}

/**
 * 学期信息
 *
 * @remarks
 * 用于标识成绩所属学期
 */
export interface SemesterInfo {
  /** 学期ID */
  id: string
  /** 学期名称，如 "2025-2026-1" */
  name: string
}

/**
 * 学生基础信息
 *
 * @remarks
 * 用于展示学生相关信息
 */
export interface StudentInfo {
  /** 学生ID */
  id: string
  /** 学号 */
  studentNumber: string
  /** 学生姓名 */
  name: string
  /** 班级（可选） */
  className?: string
}

/**
 * 教师基础信息
 *
 * @remarks
 * 用于展示教师相关信息
 */
export interface TeacherInfo {
  /** 教师ID */
  id: string
  /** 工号 */
  teacherNumber: string
  /** 教师姓名 */
  name: string
  /** 职称（可选） */
  title?: string
}

/**
 * 成绩分数构成
 *
 * @remarks
 * 成绩的各个组成部分
 */
export interface ScoreComponents {
  /** 平时成绩 (0-100) */
  usualScore: number | null
  /** 期中成绩 (0-100) */
  midtermScore: number | null
  /** 期末成绩 (0-100) */
  finalScore: number | null
  /** 总评成绩 (0-100) */
  totalScore: number | null
}

/**
 * 成绩等级信息
 *
 * @remarks
 * 成绩对应的等级和绩点
 */
export interface GradeInfo {
  /** 等级字母 (A, B, C, D, F) */
  letter: GradeLetter | null
  /** 绩点 (0.0 - 4.0) */
  point: number | null
}

/**
 * 成绩录入信息
 *
 * @remarks
 * 记录成绩录入的时间和操作人
 */
export interface ScoreEntryInfo {
  /** 录入人ID */
  enteredBy: string | null
  /** 录入时间 */
  enteredAt: string | null
  /** 最后修改人ID */
  modifiedBy: string | null
  /** 最后修改时间 */
  modifiedAt: string | null
}

/**
 * 成绩基础接口
 *
 * @remarks
 * F4 和 F5 都需要操作成绩，这是成绩的最小公共字段集合
 * 各自可以根据需要扩展更多字段
 *
 * 注意：F3 后端返回的字段中不包含学生信息（studentId/Number/Name）
 * 学生端需要从用户上下文中获取，这些字段仅用于 F4 教师端
 */
export interface BaseScore {
  /** 成绩ID */
  id: string
  /** 选课记录ID */
  enrollmentId: string
  /** 开课记录ID */
  courseOfferingId: string

  // 课程信息
  courseId: string
  courseCode: string
  courseName: string
  courseType: CourseType
  credits: number

  // 学期信息
  semesterId: string
  semesterName: string

  // 成绩分数
  usualScore: number | null
  midtermScore: number | null
  finalScore: number | null
  totalScore: number | null

  // 成绩等级
  gradePoint: number | null
  gradeLetter: GradeLetter | null

  // 状态
  status: ScoreStatus

  // 录入信息
  enteredBy: string | null
  enteredAt: string | null
  modifiedAt: string | null
  modifiedBy: string | null
}

// ==================== 辅助类型 ====================

/**
 * 分数区间
 *
 * @remarks
 * 用于分数范围判断和展示
 */
export interface ScoreRangeInfo {
  /** 区间标识 */
  range: ScoreRange
  /** 区间标签 */
  label: string
  /** 最小值（包含） */
  min: number
  /** 最大值（包含） */
  max: number
  /** 颜色标识（用于图表） */
  color: string
}

/**
 * 成绩状态信息
 *
 * @remarks
 * 成绩状态对应的展示信息
 */
export interface ScoreStatusInfo {
  /** 状态值 */
  value: ScoreStatus
  /** 显示标签 */
  label: string
  /** Ant Design Tag 的 color 属性 */
  color: 'default' | 'processing' | 'success' | 'warning' | 'error'
  /** 是否为最终状态（不可再修改） */
  isFinal: boolean
}

/**
 * 课程类型信息
 *
 * @remarks
 * 课程类型对应的展示信息
 */
export interface CourseTypeInfo {
  /** 类型值 */
  value: CourseType
  /** 显示标签 */
  label: string
  /** 颜色标识（用于图表） */
  color: string
}

// ==================== 类型守卫 ====================

/**
 * 检查是否为有效的成绩状态
 */
export function isValidScoreStatus(value: string): value is ScoreStatus {
  return ['DRAFT', 'SUBMITTED', 'CONFIRMED'].includes(value)
}

/**
 * 检查是否为有效的课程类型
 */
export function isValidCourseType(value: string): value is CourseType {
  return ['REQUIRED', 'ELECTIVE', 'GENERAL'].includes(value)
}

/**
 * 检查是否为有效的分数
 */
export function isValidScore(score: number | null): boolean {
  return score !== null && score >= 0 && score <= 100
}

/**
 * 检查是否为有效的绩点
 */
export function isValidGradePoint(point: number | null): boolean {
  return point !== null && point >= 0 && point <= 4.0
}
