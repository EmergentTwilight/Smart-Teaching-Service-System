/**
 * 专业管理 API
 * 处理专业 CRUD 接口
 */
import request from '@/shared/utils/request'
import type {
  CreateMajorDTO,
  Major,
  MajorDetail,
  MajorListResponse,
  MajorQueryParams,
  UpdateMajorDTO,
} from '../types/majors'

interface MajorCreatePayload {
  name: string
  code?: string
  department_id: string
  degree_type?: string
  total_credits?: number
}

interface MajorUpdatePayload {
  name?: string
  total_credits?: number
}

function toCreatePayload(data: CreateMajorDTO): MajorCreatePayload {
  return {
    name: data.name,
    code: data.code || undefined,
    department_id: data.departmentId,
    degree_type: data.degreeType,
    total_credits: data.totalCredits,
  }
}

function toUpdatePayload(data: UpdateMajorDTO): MajorUpdatePayload {
  return {
    name: data.name,
    total_credits: data.totalCredits,
  }
}

/** 专业管理 API 模块 */
export const majorsApi = {
  /**
   * 获取专业列表
   */
  getList: async (params?: MajorQueryParams): Promise<MajorListResponse> => {
    return request.get('/majors', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        keyword: params?.keyword || undefined,
        department_id: params?.departmentId || undefined,
      },
    })
  },

  /**
   * 获取单个专业详情
   */
  getById: async (id: string): Promise<MajorDetail> => {
    return request.get(`/majors/${id}`)
  },

  /**
   * 创建专业
   */
  create: async (data: CreateMajorDTO): Promise<Major> => {
    return request.post('/majors', toCreatePayload(data))
  },

  /**
   * 更新专业
   */
  update: async (id: string, data: UpdateMajorDTO): Promise<Major> => {
    return request.put(`/majors/${id}`, toUpdatePayload(data))
  },

  /**
   * 删除专业
   */
  delete: async (id: string): Promise<void> => {
    await request.delete(`/majors/${id}`)
  },
}
