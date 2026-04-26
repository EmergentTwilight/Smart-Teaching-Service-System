/**
 * 课表查询 API
 * 提供纯读视图数据，支持多维度（课程、教室、综合）检索以及课表的导出
 */
import request from '@/shared/utils/request'
import type {
  ExportTimetableInput,
  GetByClassroomInput,
  PagedTimetableListResponse,
  GetByCourseOfferingInput,
  TimetableListResponse,
  PagedGetTimetablesInputWithoutAuth,
} from '../types/timetable.js'
import {
  getByCourseOfferingSchema,
  getByClassroomSchema,
  exportTimetableSchema,
  pagedTimetableListResponseSchema,
  timetableListResponseSchema,
  pagedGetTimetablesWithoutAuthSchema,
} from '../types/timetable.js'

const BASE_PATH = '/course-arrangement/timetables'

export const timetablesApi = {
  /**
   * 查询某课程的课表
   * @param courseOfferingId 课程开设ID
   * @returns 已按星期和节次升序排列的排课数组
   */
  getByCourseOffering: async (input: GetByCourseOfferingInput): Promise<TimetableListResponse> => {
    const validatedInput = getByCourseOfferingSchema.parse(input)
    const result = await request.get(
      `${BASE_PATH}/course-offerings/${validatedInput.courseOfferingId}`
    )
    return timetableListResponseSchema.parse(result)
  },

  /**
   * 查询某教室的课表
   * @param classroomId 教室ID
   * @returns 已按星期和节次升序排列的排课数组
   */
  getByClassroom: async (input: GetByClassroomInput): Promise<TimetableListResponse> => {
    const validatedInput = getByClassroomSchema.parse(input)
    const result = await request.get(`${BASE_PATH}/classrooms/${validatedInput.classroomId}`, {
      params: validatedInput.query,
    })
    return timetableListResponseSchema.parse(result)
  },

  /**
   * 按学期获取所有课表（综合视图）
   * @param semesterId 学期ID
   * @returns 该学期所有排课记录
   */
  getBySemester: async (
    input: PagedGetTimetablesInputWithoutAuth
  ): Promise<PagedTimetableListResponse> => {
    const validatedInput = pagedGetTimetablesWithoutAuthSchema.parse(input)
    const result = await request.get(`${BASE_PATH}`, { params: validatedInput })
    return pagedTimetableListResponseSchema.parse(result)
  },

  /**
   * 导出/打印课表
   * @param params 导出条件
   * @returns 二进制文件流
   */
  exportTimetable: async (input: ExportTimetableInput): Promise<Blob> => {
    const validatedInput = exportTimetableSchema.parse(input)
    return request.get(`${BASE_PATH}/export`, {
      params: validatedInput,
      responseType: 'blob', // 接收二进制数据
    })
  },
}
