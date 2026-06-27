/**
 * 课程管理 API
 */
import request from '@/shared/utils/request'
import type {
  BatchCreateCoursesResponse,
  CourseDetail,
  CourseListResponse,
  CourseQueryParams,
  CourseSummary,
  CreateCourseDTO,
  UpdateCourseDTO,
} from '../types/courses'

interface CoursePayload {
  code?: string
  name?: string
  credits?: number
  hours?: number
  course_type?: string
  category?: string
  department_id?: string
  teacher_id?: string
  description?: string
  assessment_method?: string
  prerequisite_ids?: string[]
}

function toCreatePayload(data: CreateCourseDTO): CoursePayload {
  return {
    code: data.code,
    name: data.name,
    credits: data.credits,
    hours: data.hours,
    course_type: data.courseType,
    category: data.category || undefined,
    department_id: data.departmentId || undefined,
    teacher_id: data.teacherId || undefined,
    description: data.description || undefined,
    assessment_method: data.assessmentMethod || undefined,
    prerequisite_ids: data.prerequisiteIds,
  }
}

function toUpdatePayload(data: UpdateCourseDTO): CoursePayload {
  return {
    name: data.name,
    credits: data.credits,
    description: data.description,
    prerequisite_ids: data.prerequisiteIds,
  }
}

export const coursesApi = {
  getList: async (params?: CourseQueryParams): Promise<CourseListResponse> => {
    return request.get('/courses', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        keyword: params?.keyword || undefined,
        department_id: params?.departmentId || undefined,
        course_type: params?.courseType || undefined,
        status: params?.status || undefined,
      },
    })
  },

  getById: async (id: string): Promise<CourseDetail> => {
    return request.get(`/courses/${id}`)
  },

  create: async (data: CreateCourseDTO): Promise<CourseSummary> => {
    return request.post('/courses', toCreatePayload(data))
  },

  update: async (id: string, data: UpdateCourseDTO): Promise<CourseSummary> => {
    return request.put(`/courses/${id}`, toUpdatePayload(data))
  },

  delete: async (id: string): Promise<void> => {
    await request.delete(`/courses/${id}`)
  },

  batchCreate: async (courses: CreateCourseDTO[]): Promise<BatchCreateCoursesResponse> => {
    return request.post('/courses/batch', {
      courses: courses.map((course) => toCreatePayload(course)),
    })
  },
}
