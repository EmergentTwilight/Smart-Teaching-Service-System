/**
 * 排课管理 API
 * 处理排课生成、更新、删除及冲突校验
 */
import request from '@/shared/utils/request'
import type {
  Schedule,
  ValidScheduleQueryParams,
  ValidateSchedulePayload,
  ValidationResult,
} from '../types/schedule'
import { PaginatedData } from '@/shared/types'

const BASE_PATH = '/schedules'

export const schedulesApi = {
  /**
   * 获取排课列表
   */
  getList: async (params?: ValidScheduleQueryParams): Promise<PaginatedData<Schedule>> => {
    return request.get(BASE_PATH, { params })
  },

  /**
   * 获取排课详情
   */
  getById: async (id: string): Promise<Schedule> => {
    return request.get(`${BASE_PATH}/${id}`)
  },

  /**
   * 预校验排课时间与教室冲突
   */
  validate: async (data: ValidateSchedulePayload): Promise<ValidationResult> => {
    try {
      const res = await request.post<any, ValidationResult>(`${BASE_PATH}/validate`, data)
      return res
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data.data
      }
      throw error
    }
  },

  /**
   * 新增排课
   */
  create: async (data: Partial<Schedule>): Promise<{ id: string }> => {
    return request.post(BASE_PATH, data)
  },

  /**
   * 更新排课
   */
  update: async (id: string, data: Partial<Schedule>): Promise<Schedule> => {
    return request.patch(`${BASE_PATH}/${id}`, data)
  },

  /**
   * 删除排课
   */
  delete: async (id: string): Promise<{ id: string }> => {
    return request.delete(`${BASE_PATH}/${id}`)
  },
}
