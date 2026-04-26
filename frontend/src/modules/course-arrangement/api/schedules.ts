/**
 * 排课管理 API
 * 处理排课生成、更新、删除及冲突校验
 */
import request from '@/shared/utils/request'
import type {
  CreateScheduleInput,
  PagedGetSchedulesInput,
  IdInput,
  UpdateScheduleInput,
  IdResponse,
  PagedScheduleListResponse,
  ValidateResponse,
  NullableScheduleResponse,
} from '../types/schedule'
import {
  createScheduleSchema,
  pagedGetSchedulesSchema,
  idSchema,
  pagedScheduleListResponseSchema,
  updateScheduleSchema,
  validateResponseSchema,
  nullableScheduleResponseSchema,
} from '../types/schedule'

const BASE_PATH = '/course-arrangement/schedules'

export const schedulesApi = {
  /**
   * 获取排课列表
   */
  getList: async (input: PagedGetSchedulesInput): Promise<PagedScheduleListResponse> => {
    const validatedInput = pagedGetSchedulesSchema.parse(input)
    const result = await request.get(BASE_PATH, { params: validatedInput })
    return pagedScheduleListResponseSchema.parse(result)
  },

  /**
   * 获取排课详情
   */
  getById: async (input: IdInput): Promise<NullableScheduleResponse> => {
    const validatedInput = idSchema.parse(input)
    const result = await request.get(`${BASE_PATH}/${validatedInput.id}`)
    return nullableScheduleResponseSchema.parse(result)
  },

  /**
   * 预校验排课时间与教室冲突
   */
  validate: async (input: CreateScheduleInput): Promise<ValidateResponse> => {
    const validatedInput = createScheduleSchema.parse(input)
    const result = await request.post(`${BASE_PATH}/validate`, validatedInput)
    return validateResponseSchema.parse(result)
  },

  /**
   * 新增排课
   */
  create: async (input: CreateScheduleInput): Promise<IdResponse> => {
    const validatedInput = createScheduleSchema.parse(input)
    const result = await request.post(BASE_PATH, validatedInput)
    return idSchema.parse(result)
  },

  /**
   * 更新排课
   */
  update: async (input: UpdateScheduleInput): Promise<IdResponse> => {
    const validatedInput = updateScheduleSchema.parse(input)
    const result = await request.post(BASE_PATH, validatedInput)
    return idSchema.parse(result)
  },

  /**
   * 删除排课
   */
  delete: async (input: IdInput): Promise<IdResponse> => {
    const validatedInput = idSchema.parse(input)
    const result = await request.delete(`${BASE_PATH}/${validatedInput.id}`)
    return idSchema.parse(result)
  },
}
