/**
 * 用户管理 API
 * 处理用户 CRUD 接口
 */
import request from '@/shared/utils/request';
import type { User, PaginatedData } from '@/shared/types';

/** 用户查询参数 */
export interface UserQueryParams {
  /** 页码 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 搜索关键词 */
  keyword?: string;
  /** 角色筛选 */
  role?: string;
  /** 状态筛选 */
  status?: string;
}

/** 用户管理 API 模块 */
export const usersApi = {
  /**
   * 获取用户列表
   * @param params 查询参数
   * @returns 用户列表和分页信息
   */
  getList: async (params?: UserQueryParams): Promise<{ items: User[]; pagination: PaginatedData<User>['pagination'] }> => {
    return request.get('/users', { params });
  },

  /**
   * 获取单个用户详情
   * @param id 用户ID
   * @returns 用户信息
   */
  getById: async (id: string): Promise<User> => {
    return request.get(`/users/${id}`);
  },

  /**
   * 创建用户
   * @param data 用户数据
   * @returns 新创建的用户
   */
  create: async (data: Partial<User>): Promise<User> => {
    return request.post('/users', data);
  },

  /**
   * 更新用户
   * @param id 用户ID
   * @param data 更新数据
   * @returns 更新后的用户
   */
  update: async (id: string, data: Partial<User>): Promise<User> => {
    return request.put(`/users/${id}`, data);
  },

  /**
   * 删除用户
   * @param id 用户ID
   */
  delete: async (id: string): Promise<void> => {
    await request.delete(`/users/${id}`);
  },
};
