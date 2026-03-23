/**
 * 认证 API
 * 处理登录、登出、用户信息等接口
 */
import request from '@/shared/utils/request';
import type { LoginResponse, User } from '@/shared/types';

/** 登录请求参数 */
export interface LoginRequest {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
}

/** 认证 API 模块 */
export const authApi = {
  /**
   * 用户登录
   * @param data 登录参数
   * @returns 登录响应
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return request.post('/auth/login', data);
  },

  /**
   * 用户登出
   */
  logout: async (): Promise<void> => {
    return request.post('/auth/logout');
  },

  /**
   * 获取当前用户信息
   * @returns 用户信息
   */
  me: async (): Promise<User> => {
    return request.get('/auth/me');
  },

  /**
   * 修改密码
   * @param data 密码修改参数
   */
  changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<void> => {
    return request.post('/auth/change-password', data);
  },
};
