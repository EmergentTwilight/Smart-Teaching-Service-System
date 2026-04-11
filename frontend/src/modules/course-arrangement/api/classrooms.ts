/**
 * 教室管理 API
 * 处理教室资源 CRUD 接口
 */
import request from '@/shared/utils/request';
import type { 
  Classroom, 
  ClassroomQueryParams, 
  PaginatedClassrooms 
} from '../types/classroom.js';

const BASE_PATH = '/classrooms';

export const classroomsApi = {
  /**
   * 获取教室列表 (支持分页和多条件筛选) 
   */
  getList: async (params?: ClassroomQueryParams): Promise<PaginatedClassrooms> => {
    return request.get(BASE_PATH, { params });
  },

  /**
   * 获取单个教室详情 
   */
  getById: async (id: string): Promise<Classroom> => {
    return request.get(`${BASE_PATH}/${id}`);
  },

  /**
   * 创建新教室 
   */
  create: async (data: Omit<Classroom, 'id'>): Promise<{ id: string } & Classroom> => {
    return request.post(BASE_PATH, data);
  },

  /**
   * 更新教室信息 
   */
  update: async (id: string, data: Partial<Classroom>): Promise<Classroom> => {
    return request.patch(`${BASE_PATH}/${id}`, data);
  },

  /**
   * 获取可用教室 (排课专用) 
   */
  getAvailable: async (params: {
    dayOfWeek: number;
    startWeek: number;
    endWeek: number;
    startPeriod: number;
    endPeriod: number;
    capacity?: number;
    roomType?: string;
  }): Promise<Classroom[]> => {
    return request.get(`${BASE_PATH}/available`, { params });
  }
};