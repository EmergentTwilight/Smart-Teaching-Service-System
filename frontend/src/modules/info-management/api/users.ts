/**
 * 用户管理 API
 * 处理用户 CRUD 接口
 */
import request from '@/shared/utils/request'
import type { User, PaginatedData } from '@/shared/types'

/** 用户查询参数 */
export interface UserQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** 搜索关键词 */
  keyword?: string
  /** 角色筛选 */
  role?: string
  /** 状态筛选 */
  status?: string
}

/** 用户管理 API 模块 */
export const usersApi = {
  /**
   * 获取用户列表
   * @param params 查询参数
   * @returns 用户列表和分页信息
   */
  getList: async (
    params?: UserQueryParams
  ): Promise<{ items: User[]; pagination: PaginatedData<User>['pagination'] }> => {
    return request.get('/users', { params })
  },

  /**
   * 获取单个用户详情
   * @param id 用户ID
   * @returns 用户信息
   */
  getById: async (id: string): Promise<User> => {
    return request.get(`/users/${id}`)
  },

  /**
   * 创建用户
   * @param data 用户数据
   * @returns 新创建的用户
   */
  create: async (data: Partial<User>): Promise<User> => {
    return request.post('/users', data)
  },

  /**
   * 更新用户
   * @param id 用户ID
   * @param data 更新数据
   * @returns 更新后的用户
   */
  update: async (id: string, data: Partial<User>): Promise<User> => {
    return request.put(`/users/${id}`, data)
  },

  /**
   * 删除用户
   * @param id 用户ID
   */
  delete: async (id: string): Promise<void> => {
    await request.delete(`/users/${id}`)
  },

  /**
   * 批量创建用户
   * @param data 用户数据列表
   * @returns 创建结果
   */
  batchCreate: async (data: Array<Partial<User>>): Promise<{ success: number; failed: number }> => {
    return request.post('/users/batch', { users: data })
  },

  /**
   * 批量更新用户状态
   * @param userIds 用户ID列表
   * @param status 新状态
   */
  batchUpdateStatus: async (userIds: string[], status: string): Promise<void> => {
    return request.patch('/users/batch/status', { userIds, status })
  },

  /**
   * 修改用户密码
   * @param id 用户ID
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
  changePassword: async (id: string, oldPassword: string, newPassword: string): Promise<void> => {
    return request.patch(`/users/${id}/password`, {
      oldPassword,
      newPassword,
    })
  },

  /**
   * 重置用户密码
   * @param id 用户ID
   * @param newPassword 新密码
   */
  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    return request.post(`/users/${id}/password/reset`, { newPassword })
  },

  /**
   * 更新用户状态
   * @param id 用户ID
   * @param status 新状态
   */
  updateStatus: async (id: string, status: string): Promise<void> => {
    return request.patch(`/users/${id}/status`, { status })
  },

  /**
   * 分配角色
   * @param id 用户ID
   * @param roleIds 角色ID列表
   */
  assignRoles: async (id: string, roleIds: string[]): Promise<void> => {
    return request.post(`/users/${id}/roles`, { roleIds })
  },

  /**
   * 撤销角色
   * @param id 用户ID
   * @param roleId 角色ID
   */
  revokeRole: async (id: string, roleId: string): Promise<void> => {
    return request.delete(`/users/${id}/roles/${roleId}`)
  },

  /**
   * 获取用户权限
   * @param id 用户ID
   * @returns 权限列表
   */
  getPermissions: async (id: string): Promise<string[]> => {
    return request.get(`/users/${id}/permissions`)
  },

  /**
   * 获取用户操作日志
   * @param params 查询参数
   * @returns 日志列表
   */
  getLogs: async (params?: {
    page?: number
    pageSize?: number
    userId?: string
    action?: string
    resourceType?: string
    startDate?: string
    endDate?: string
  }): Promise<{
    items: Array<{
      id: string
      userId: string
      username: string
      realName: string
      action: string
      resourceType: string
      resourceId: string
      ipAddress: string
      userAgent: string
      details: string
      createdAt: string
    }>
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
  }> => {
    return request.get('/users/logs', { params })
  },
}
