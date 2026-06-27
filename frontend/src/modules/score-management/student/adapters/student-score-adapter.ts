/**
 * 学生端成绩数据适配器
 *
 * 说明：
 * - 职责：将后端 API 返回的数据转换为前端内部类型
 * - 基于 F3 后端实现的 API 结构
 * - TODO: F3 后端部署后实现真实的适配逻辑
 *
 * @module score-management/student/adapters
 */

import type {
  ScoreItem,
  ScoreListResponse,
  StudentScoreSummary,
  StudentScoreAnalytics,
  ScoreListQuery,
  CourseTypeBreakdownPoint,
} from '../types/score-types'
import type { BackendScoreRange } from '../../shared/types/common-types'
import { COURSE_TYPE } from '../../shared/constants/score-constants'

// ==================== 后端 API 类型定义 ====================

/**
 * F3 后端返回的成绩列表项
 */
interface BackendScoreItem {
  scoreId: string
  enrollmentId: string
  courseOfferingId: string
  courseId: string
  courseCode: string
  courseName: string
  credits: number
  courseType: string
  semesterId: string
  semesterName: string
  usualScore: number | null
  midtermScore: number | null
  finalScore: number | null
  totalScore: number | null
  gradePoint: number | null
  gradeLetter: string | null
  status: string
  hasPendingModificationRequest: boolean
  isEffective?: boolean
  enteredAt?: string | null
  modifiedAt?: string | null
}

/**
 * F3 后端返回的成绩列表响应
 */
interface BackendScoreListResponse {
  items: BackendScoreItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * F3 后端返回的 GPA 摘要
 */
interface BackendStudentScoreSummary {
  studentId: string
  studentName: string
  majorName: string | null
  grade: number | null
  totalRequiredCredits: number | null
  earnedCredits: number
  passedCredits: number
  inProgressCredits: number
  gpa: number | null
  averageScore: number | null
  passedCourseCount: number
  failedCourseCount: number
  remainingRequiredCredits: number | null
  effectiveScoreRule: string
  curriculumProgress: StudentScoreSummary['curriculumProgress']
}

/**
 * F3 后端返回的学期趋势项
 */
interface BackendSemesterTrend {
  semesterId: string
  semesterName: string
  gpa: number | null
  averageScore: number | null
  earnedCredits: number
}

/**
 * F3 后端返回的分数分布项
 */
interface BackendScoreDistribution {
  range: BackendScoreRange
  count: number
}

/**
 * F3 后端返回的课程类型分布项
 */
interface BackendCourseTypeBreakdown {
  courseType: string
  earnedCredits: number
  averageScore: number | null
}

/**
 * F3 后端返回的成绩分析
 */
interface BackendStudentScoreAnalytics {
  studentId: string
  studentName: string
  semesterTrend: BackendSemesterTrend[]
  scoreDistribution: BackendScoreDistribution[]
  courseTypeBreakdown: BackendCourseTypeBreakdown[]
}

// ==================== 适配器类 ====================

/**
 * 学生端成绩适配器
 *
 * @remarks
 * 将 F3 后端 API 返回的数据转换为前端内部类型
 * TODO: F3 后端部署后实现真实的适配逻辑
 */
export class StudentScoreAdapter {
  /**
   * 将后端成绩列表转换为前端类型
   */
  static adaptScoreList(backendResponse: BackendScoreListResponse): ScoreListResponse {
    return {
      items: backendResponse.items.map(this.adaptScoreItem),
      pagination: backendResponse.pagination,
    }
  }

  /**
   * 将后端成绩项转换为前端类型
   */
  private static adaptScoreItem(item: BackendScoreItem): ScoreItem {
    return {
      scoreId: item.scoreId,
      enrollmentId: item.enrollmentId,
      courseOfferingId: item.courseOfferingId,
      courseId: item.courseId,
      courseCode: item.courseCode,
      courseName: item.courseName,
      credits: item.credits,
      courseType: item.courseType as ScoreItem['courseType'],
      semesterId: item.semesterId,
      semesterName: item.semesterName,
      usualScore: item.usualScore,
      midtermScore: item.midtermScore,
      finalScore: item.finalScore,
      totalScore: item.totalScore,
      gradePoint: item.gradePoint,
      gradeLetter: item.gradeLetter as ScoreItem['gradeLetter'],
      status: item.status as ScoreItem['status'],
      hasPendingModificationRequest: item.hasPendingModificationRequest,
      isEffective: item.isEffective ?? true,
      enteredAt: item.enteredAt ?? null,
      modifiedAt: item.modifiedAt ?? null,
    }
  }

  /**
   * 将后端 GPA 摘要转换为前端类型
   */
  static adaptScoreSummary(backend: BackendStudentScoreSummary): StudentScoreSummary {
    return {
      studentId: backend.studentId,
      studentName: backend.studentName,
      majorName: backend.majorName,
      grade: backend.grade,
      totalRequiredCredits: backend.totalRequiredCredits,
      earnedCredits: backend.earnedCredits,
      passedCredits: backend.passedCredits,
      inProgressCredits: backend.inProgressCredits,
      gpa: backend.gpa,
      averageScore: backend.averageScore,
      passedCourseCount: backend.passedCourseCount,
      failedCourseCount: backend.failedCourseCount,
      remainingRequiredCredits: backend.remainingRequiredCredits,
      effectiveScoreRule: backend.effectiveScoreRule,
      curriculumProgress: backend.curriculumProgress,
    }
  }

  /**
   * 将后端成绩分析转换为前端类型
   */
  static adaptScoreAnalytics(backend: BackendStudentScoreAnalytics): StudentScoreAnalytics {
    const totalCount = backend.scoreDistribution.reduce((sum, d) => sum + d.count, 0)

    return {
      studentId: backend.studentId,
      studentName: backend.studentName,
      semesterTrend: backend.semesterTrend.map(this.adaptSemesterTrend),
      scoreDistribution: backend.scoreDistribution.map((d) =>
        this.adaptScoreDistribution(d, totalCount)
      ),
      courseTypeBreakdown: backend.courseTypeBreakdown.map(this.adaptCourseTypeBreakdown),
    }
  }

  private static adaptSemesterTrend(item: BackendSemesterTrend) {
    return {
      semesterId: item.semesterId,
      semesterName: item.semesterName,
      gpa: item.gpa,
      averageScore: item.averageScore,
      earnedCredits: item.earnedCredits,
    }
  }

  private static adaptScoreDistribution(item: BackendScoreDistribution, total: number) {
    return {
      range: item.range,
      rangeLabel: item.range,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }
  }

  private static adaptCourseTypeBreakdown(item: BackendCourseTypeBreakdown) {
    const courseType = item.courseType as CourseTypeBreakdownPoint['courseType']
    return {
      courseType,
      courseTypeLabel: COURSE_TYPE[courseType]?.label ?? courseType,
      earnedCredits: item.earnedCredits,
      averageScore: item.averageScore,
    }
  }
}

// ==================== Mock 数据工厂 ====================

/**
 * 后端分数段到前端分数标签的映射
 */
/**
 * 创建 Mock 成绩列表
 */
export function createMockScoreList(
  query?: ScoreListQuery,
  override?: Partial<ScoreListResponse>
): ScoreListResponse {
  const page = query?.page ?? 1
  const pageSize = query?.pageSize ?? 20

  const mockScores: ScoreItem[] = [
    {
      scoreId: 'score-1',
      enrollmentId: 'enrollment-1',
      courseOfferingId: 'co-1',
      courseId: 'course-1',
      courseCode: 'CS101',
      courseName: '数据结构与算法',
      credits: 4,
      courseType: 'REQUIRED',
      semesterId: 'semester-2025-1',
      semesterName: '2025-2026-1',
      usualScore: 85,
      midtermScore: 88,
      finalScore: 90,
      totalScore: 88,
      gradePoint: 3.7,
      gradeLetter: 'B',
      status: 'CONFIRMED',
      hasPendingModificationRequest: false,
      isEffective: true,
    },
    {
      scoreId: 'score-2',
      enrollmentId: 'enrollment-2',
      courseOfferingId: 'co-2',
      courseId: 'course-2',
      courseCode: 'MATH201',
      courseName: '概率论与数理统计',
      credits: 3,
      courseType: 'REQUIRED',
      semesterId: 'semester-2025-1',
      semesterName: '2025-2026-1',
      usualScore: 78,
      midtermScore: 75,
      finalScore: 82,
      totalScore: 79,
      gradePoint: 3.0,
      gradeLetter: 'C',
      status: 'CONFIRMED',
      hasPendingModificationRequest: false,
      isEffective: true,
    },
    {
      scoreId: 'score-3',
      enrollmentId: 'enrollment-3',
      courseOfferingId: 'co-3',
      courseId: 'course-3',
      courseCode: 'ENG101',
      courseName: '大学英语（一）',
      credits: 2,
      courseType: 'GENERAL',
      semesterId: 'semester-2025-1',
      semesterName: '2025-2026-1',
      usualScore: 90,
      midtermScore: 85,
      finalScore: 88,
      totalScore: 87,
      gradePoint: 3.7,
      gradeLetter: 'B',
      status: 'CONFIRMED',
      hasPendingModificationRequest: false,
      isEffective: true,
    },
    {
      scoreId: 'score-4',
      enrollmentId: 'enrollment-4',
      courseOfferingId: 'co-4',
      courseId: 'course-4',
      courseCode: 'CS102',
      courseName: '数据结构与算法',
      credits: 4,
      courseType: 'REQUIRED',
      semesterId: 'semester-2025-2',
      semesterName: '2025-2026-2',
      usualScore: 75,
      midtermScore: 80,
      finalScore: 78,
      totalScore: 78,
      gradePoint: 3.0,
      gradeLetter: 'C',
      status: 'SUBMITTED',
      hasPendingModificationRequest: false,
      isEffective: true,
    },
    {
      scoreId: 'score-4-old',
      enrollmentId: 'enrollment-4-old',
      courseOfferingId: 'co-4-old',
      courseId: 'course-4',
      courseCode: 'CS102',
      courseName: '数据结构与算法',
      credits: 4,
      courseType: 'REQUIRED',
      semesterId: 'semester-2025-1',
      semesterName: '2025-2026-1',
      usualScore: 70,
      midtermScore: 72,
      finalScore: 74,
      totalScore: 72,
      gradePoint: 2.3,
      gradeLetter: 'C',
      status: 'CONFIRMED',
      hasPendingModificationRequest: false,
      isEffective: false,
    },
    {
      scoreId: 'score-5',
      enrollmentId: 'enrollment-5',
      courseOfferingId: 'co-5',
      courseId: 'course-5',
      courseCode: 'PHYS101',
      courseName: '大学物理',
      credits: 4,
      courseType: 'REQUIRED',
      semesterId: 'semester-2025-2',
      semesterName: '2025-2026-2',
      usualScore: 65,
      midtermScore: 70,
      finalScore: 68,
      totalScore: 68,
      gradePoint: 2.0,
      gradeLetter: 'D',
      status: 'SUBMITTED',
      hasPendingModificationRequest: false,
      isEffective: true,
    },
  ]

  // 根据查询参数过滤
  let filtered = mockScores

  if (query?.semesterId) {
    filtered = filtered.filter((s) => s.semesterId === query.semesterId)
  }

  if (query?.keyword) {
    const kw = query.keyword.toLowerCase()
    filtered = filtered.filter(
      (s) => s.courseCode.toLowerCase().includes(kw) || s.courseName.toLowerCase().includes(kw)
    )
  }

  // 分页
  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)

  return {
    items,
    pagination: {
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / pageSize),
    },
    ...override,
  }
}

/**
 * 创建 Mock GPA 摘要
 */
export function createMockScoreSummary(
  override?: Partial<StudentScoreSummary>
): StudentScoreSummary {
  return {
    studentId: 'student-1',
    studentName: '张三',
    majorName: '计算机科学与技术',
    grade: 2023,
    gpa: 3.24,
    averageScore: 80.6,
    totalRequiredCredits: 120,
    earnedCredits: 17,
    passedCredits: 17,
    inProgressCredits: 8,
    remainingRequiredCredits: 103,
    passedCourseCount: 5,
    failedCourseCount: 0,
    effectiveScoreRule: '同一课程多次成绩按最高总评计入统计；总评相同时取最近修改或录入记录',
    curriculumProgress: {
      curriculumId: 'curriculum-1',
      curriculumName: '计算机科学与技术 2023 培养方案',
      totalRequiredCredits: 120,
      requiredCredits: 90,
      electiveCredits: 30,
      passedCredits: 17,
      requiredPassedCredits: 15,
      electivePassedCredits: 2,
      remainingRequiredCredits: 103,
      curriculumCourseCount: 8,
      completedCurriculumCourseCount: 5,
      completionRate: 14.17,
    },
    ...override,
  }
}

/**
 * 创建 Mock 成绩分析
 */
export function createMockScoreAnalytics(
  override?: Partial<StudentScoreAnalytics>
): StudentScoreAnalytics {
  return {
    studentId: 'student-1',
    studentName: '张三',
    semesterTrend: [
      {
        semesterId: 'semester-2025-1',
        semesterName: '2025-2026-1',
        gpa: 3.47,
        averageScore: 85.7,
        earnedCredits: 9,
      },
      {
        semesterId: 'semester-2025-2',
        semesterName: '2025-2026-2',
        gpa: 2.85,
        averageScore: 73.0,
        earnedCredits: 8,
      },
    ],
    scoreDistribution: [
      { range: '90-100', rangeLabel: '90-100', count: 1, percentage: 20 },
      { range: '80-89', rangeLabel: '80-89', count: 2, percentage: 40 },
      { range: '70-79', rangeLabel: '70-79', count: 1, percentage: 20 },
      { range: '60-69', rangeLabel: '60-69', count: 1, percentage: 20 },
      { range: '0-59', rangeLabel: '0-59', count: 0, percentage: 0 },
    ],
    courseTypeBreakdown: [
      { courseType: 'REQUIRED', courseTypeLabel: '必修', earnedCredits: 15, averageScore: 78.25 },
      { courseType: 'ELECTIVE', courseTypeLabel: '选修', earnedCredits: 0, averageScore: null },
      { courseType: 'GENERAL', courseTypeLabel: '通识', earnedCredits: 2, averageScore: 87.0 },
    ],
    ...override,
  }
}
