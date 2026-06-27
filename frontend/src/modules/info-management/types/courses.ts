/**
 * 课程相关类型定义
 */

export type CourseType = 'REQUIRED' | 'ELECTIVE' | 'GENERAL'
export type CourseStatus = 'ACTIVE' | 'ARCHIVED'

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  REQUIRED: '必修',
  ELECTIVE: '选修',
  GENERAL: '通识',
}

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  ACTIVE: '启用',
  ARCHIVED: '归档',
}

export interface Course {
  id: string
  code: string
  name: string
  credits: number
  hours?: number | null
  courseType: CourseType
  category?: string | null
  departmentId?: string | null
  departmentName?: string | null
  teacherId?: string | null
  teacherName?: string | null
  status: CourseStatus
  createdAt: string
}

export interface CoursePrerequisite {
  id: string
  code: string
  name: string
}

export interface CourseDetail extends Course {
  description?: string | null
  assessmentMethod?: string | null
  prerequisites: CoursePrerequisite[]
  updatedAt: string
}

export interface CourseQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  departmentId?: string
  courseType?: CourseType
  status?: CourseStatus
}

export interface CreateCourseDTO {
  code: string
  name: string
  credits: number
  hours?: number
  courseType: CourseType
  category?: string
  departmentId?: string
  teacherId?: string
  description?: string
  assessmentMethod?: string
  prerequisiteIds?: string[]
}

export interface UpdateCourseDTO {
  name?: string
  credits?: number
  description?: string
  prerequisiteIds?: string[]
}

export interface CourseSummary {
  id: string
  code: string
  name: string
}

export interface CourseListResponse {
  items: Course[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface BatchCreateCourseResult {
  index: number
  id?: string
  error?: string
  status: 'created' | 'failed'
}

export interface BatchCreateCoursesResponse {
  total: number
  successCount: number
  failCount: number
  results: BatchCreateCourseResult[]
}
