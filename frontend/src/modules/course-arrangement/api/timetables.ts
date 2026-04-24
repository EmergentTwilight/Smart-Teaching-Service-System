/**
 * 课表查询 API
 * 提供纯读视图数据，支持多维度（课程、教室、综合）检索以及课表的导出
 */
import request from '@/shared/utils/request'
import type { Schedule, ValidScheduleQueryParams } from '../types/schedule.js'

const BASE_PATH = '/course-arrangement/timetables'

// 导出课表的请求参数类型
export interface ExportTimetableParams {
  semesterId: string
  format?: 'pdf' | 'excel'
  targetType: 'classroom' | 'teacher' | 'student' | 'global'
  targetId: string
  startWeek?: number
  endWeek?: number
}

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
   * 按学期获取所有课表（综合视图）
   * @param semesterId 学期ID
   * @returns 该学期所有排课记录
   */
  getBySemester: async (params: ValidScheduleQueryParams): Promise<{ items: Schedule[]; total: number; page: number; pageSize: number; }> => {
    return request.get(`${BASE_PATH}`, { params })
  },

  /**
   * 导出/打印课表
   * @param params 导出条件
   * @returns 二进制文件流
   */
  exportTimetable: async (params: ExportTimetableParams): Promise<Blob> => {
    return request.get(`${BASE_PATH}/export`, {
      params,
      responseType: 'blob', // 接收二进制数据
    })
  },
}
