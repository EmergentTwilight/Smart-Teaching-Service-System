/**
 * 培养方案管理 API
 */
import request from '@/shared/utils/request'
import type {
  AddCurriculumCourseDTO,
  BatchAddCurriculumCoursesResponse,
  CreateCurriculumDTO,
  CurriculumDetail,
  CurriculumListResponse,
  CurriculumQueryParams,
  CurriculumSummary,
  UpdateCurriculumCourseDTO,
  UpdateCurriculumDTO,
} from '../types/curriculums'

interface CurriculumPayload {
  name?: string
  major_id?: string
  year?: number
  total_credits?: number
  required_credits?: number
  elective_credits?: number
}

interface CurriculumCoursePayload {
  course_id?: string
  course_type?: string
  semester_suggestion?: number
}

function toCreatePayload(data: CreateCurriculumDTO): CurriculumPayload {
  return {
    name: data.name,
    major_id: data.majorId,
    year: data.year,
    total_credits: data.totalCredits,
    required_credits: data.requiredCredits,
    elective_credits: data.electiveCredits,
  }
}

function toUpdatePayload(data: UpdateCurriculumDTO): CurriculumPayload {
  return {
    name: data.name,
    total_credits: data.totalCredits,
    required_credits: data.requiredCredits,
    elective_credits: data.electiveCredits,
  }
}

function toCoursePayload(data: AddCurriculumCourseDTO): CurriculumCoursePayload {
  return {
    course_id: data.courseId,
    course_type: data.courseType,
    semester_suggestion: data.semesterSuggestion,
  }
}

function toUpdateCoursePayload(data: UpdateCurriculumCourseDTO): CurriculumCoursePayload {
  const payload = {
    course_type: data.courseType,
    semester_suggestion: data.semesterSuggestion,
  }
  console.log('[curriculumsApi] update curriculum course payload', payload)
  return payload
}

export const curriculumsApi = {
  getList: async (params?: CurriculumQueryParams): Promise<CurriculumListResponse> => {
    return request.get('/curriculums', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        major_id: params?.majorId || undefined,
        year: params?.year || undefined,
      },
    })
  },

  getById: async (id: string): Promise<CurriculumDetail> => {
    return request.get(`/curriculums/${id}`)
  },

  create: async (data: CreateCurriculumDTO): Promise<CurriculumSummary> => {
    return request.post('/curriculums', toCreatePayload(data))
  },

  update: async (id: string, data: UpdateCurriculumDTO): Promise<CurriculumSummary> => {
    return request.put(`/curriculums/${id}`, toUpdatePayload(data))
  },

  delete: async (id: string): Promise<void> => {
    await request.delete(`/curriculums/${id}`)
  },

  addCourse: async (id: string, data: AddCurriculumCourseDTO): Promise<void> => {
    await request.post(`/curriculums/${id}/courses`, toCoursePayload(data))
  },

  batchAddCourses: async (
    id: string,
    courses: AddCurriculumCourseDTO[]
  ): Promise<BatchAddCurriculumCoursesResponse> => {
    return request.post(`/curriculums/${id}/courses/batch`, {
      courses: courses.map((course) => toCoursePayload(course)),
    })
  },

  removeCourse: async (id: string, courseId: string): Promise<void> => {
    await request.delete(`/curriculums/${id}/courses/${courseId}`)
  },

  updateCourse: async (
    id: string,
    courseId: string,
    data: UpdateCurriculumCourseDTO
  ): Promise<void> => {
    console.log('[curriculumsApi] update curriculum course request', { id, courseId, data })
    await request.put(`/curriculums/${id}/courses/${courseId}`, toUpdateCoursePayload(data))
  },
}
