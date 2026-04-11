/**
 * 课表查询 API
 * 提供纯读视图数据，支持多维度（课程、教室、综合）检索
 */
import request from '@/shared/utils/request'
import type { Schedule } from '../types/schedule.js'

const BASE_PATH = '/timetables'

export const timetablesApi = {
  /**
   * 查询某课程的课表
   * @param courseOfferingId 课程开设ID
   * @returns 已按星期和节次升序排列的排课数组
   */
  getByCourseOffering: async (courseOfferingId: string): Promise<Schedule[]> => {
    return request.get(`${BASE_PATH}/course-offerings/${courseOfferingId}`)
  },

  /**
   * 查询某教室的课表
   * @param classroomId 教室ID
   * @returns 已按星期和节次升序排列的排课数组
   */
  getByClassroom: async (classroomId: string): Promise<Schedule[]> => {
    return request.get(`${BASE_PATH}/classrooms/${classroomId}`)
  },

  /**
   * 综合课表查询
   * @param params 组合过滤参数
   */
  query: async (params: {
    dayOfWeek?: number
    classroomId?: string
    courseOfferingId?: string
  }): Promise<Schedule[]> => {
    return request.get(`${BASE_PATH}`, { params })
  },
}
