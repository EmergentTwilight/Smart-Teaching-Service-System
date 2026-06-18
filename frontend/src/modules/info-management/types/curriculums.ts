/**
 * 培养方案相关类型定义
 */
import type { CourseType } from './courses'

export interface Curriculum {
  id: string
  name: string
  majorId: string
  majorName: string
  year: number
  totalCredits: number
  requiredCredits: number
  electiveCredits: number
  courseCount: number
  createdAt: string
}

export interface CurriculumCourse {
  courseId: string
  courseCode: string
  courseName: string
  credits: number
  courseType: CourseType
  semesterSuggestion?: number | null
}

export interface CurriculumDetail extends Curriculum {
  courses: CurriculumCourse[]
  updatedAt: string
}

export interface CurriculumQueryParams {
  page?: number
  pageSize?: number
  majorId?: string
  year?: number
}

export interface CreateCurriculumDTO {
  name: string
  majorId: string
  year: number
  totalCredits: number
  requiredCredits?: number
  electiveCredits?: number
}

export interface UpdateCurriculumDTO {
  name?: string
  totalCredits?: number
  requiredCredits?: number
  electiveCredits?: number
}

export interface CurriculumSummary {
  id: string
  name: string
}

export interface CurriculumListResponse {
  items: Curriculum[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AddCurriculumCourseDTO {
  courseId: string
  courseType: CourseType
  semesterSuggestion?: number
}

export interface UpdateCurriculumCourseDTO {
  courseType?: CourseType
  semesterSuggestion?: number
}

export interface BatchAddCurriculumCoursesResponse {
  successCount: number
  failCount: number
}
