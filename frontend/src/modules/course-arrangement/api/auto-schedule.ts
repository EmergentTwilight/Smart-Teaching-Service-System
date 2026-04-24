import request from '@/shared/utils/request'
import type {
  AutoScheduleTaskPayload,
  AutoScheduleTaskStatus,
  AutoSchedulePreview,
  AutoScheduleApplyResult,
  OverviewStats,
} from '../types/auto-schedule'

const BASE_PATH = '/course-arrangement/auto-schedule/tasks'

export const autoScheduleApi = {
  /**
   * 创建自动排课任务
   */
  createTask: async (data: AutoScheduleTaskPayload): Promise<{ taskId: string }> => {
    return request.post(BASE_PATH, data)
  },

  /**
   * 查询自动排课任务状态
   */
  getTaskStatus: async (taskId: string): Promise<AutoScheduleTaskStatus> => {
    return request.get(`${BASE_PATH}/${taskId}`)
  },

  /**
   * 查询自动排课预览草稿
   */
  getTaskPreview: async (taskId: string): Promise<AutoSchedulePreview> => {
    return request.get(`${BASE_PATH}/${taskId}/preview`)
  },

  /**
   * 确认并应用排课结果
   */
  applyTask: async (taskId: string): Promise<AutoScheduleApplyResult> => {
    return request.post(`${BASE_PATH}/${taskId}/apply`)
  },

  /**
   * 获取排课概览统计
   */
  getOverview: async (): Promise<OverviewStats> => {
    return request.get('/course-arrangement/rules/overview')
  },
}
