/**
 * 教室管理 API
 * 处理教室资源 CRUD 接口
 */
import request from '@/shared/utils/request'
import type {
  ClassroomInput,
  PagedClassroomQueryInput,
  ClassroomIdInput,
  UpdateClassroomInput,
  AvaliableQueryInput,
  NullableClassroomResponse,
  ClassroomListResponse,
  ClassroomIdResponse,
  PagedClassroomListResponse,
} from '../types/classroom.js'
import {
  pagedClassroomQuerySchema,
  classroomIdSchema,
  nullableClassroomResponseSchema,
  classroomInPrismaSchema,
  pagedClassroomListResponseSchema,
  updateClassroomSchema,
  availableQuerySchema,
  classroomIdResponseSchema,
  classroomListResponseSchema,
} from '../types/classroom.js'

const BASE_PATH = '/course-arrangement/classrooms'

export const classroomsApi = {
  /**
   * 获取教室列表 (支持分页和多条件筛选)
   */
  getList: async (input: PagedClassroomQueryInput): Promise<PagedClassroomListResponse> => {
    const validatedInput = pagedClassroomQuerySchema.parse(input)
    const result = await request.get(BASE_PATH, { params: validatedInput })
    return pagedClassroomListResponseSchema.parse(result)
  },

  /**
   * 获取单个教室详情
   */
  getById: async (input: ClassroomIdInput): Promise<NullableClassroomResponse> => {
    const validatedInput = classroomIdSchema.parse(input)
    const result = await request.get(`${BASE_PATH}/${validatedInput.id}`)
    return nullableClassroomResponseSchema.parse(result)
  },

  /**
   * 创建新教室
   */
  create: async (input: ClassroomInput): Promise<ClassroomIdResponse> => {
    const validatedInput = classroomInPrismaSchema.parse(input)
    const result = await request.post(BASE_PATH, validatedInput)
    return classroomIdResponseSchema.parse(result)
  },

  /**
   * 更新教室信息
   */
  update: async (input: UpdateClassroomInput): Promise<ClassroomIdResponse> => {
    const validatedInput = updateClassroomSchema.parse(input)
    const result = await request.patch(`${BASE_PATH}/${validatedInput.id}`, validatedInput.data)
    return classroomIdResponseSchema.parse(result)
  },

  /**
   * 获取可用教室 (排课专用)
   */
  getAvailable: async (input: AvaliableQueryInput): Promise<ClassroomListResponse> => {
    const validatedInput = availableQuerySchema.parse(input)
    const result = await request.get(`${BASE_PATH}/available`, { params: validatedInput })
    return classroomListResponseSchema.parse(result)
  },
}
