/**
 * 认证 API
 * 处理登录、登出、用户信息等接口
 */
import request from '@/shared/utils/request'
import type { LoginResponse, AuthUserDto } from '@/shared/types'
import { useAuthStore } from '@/shared/stores/authStore'

/** 登录请求参数 */
export interface LoginRequest {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
}

/** 认证 API 模块 */
export const authApi = {
  /**
   * 用户登录
   * @param data 登录参数
   * @returns 登录响应
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    // 响应拦截器已经提取了 data 并转换为 camelCase
    return request.post('/auth/login', data) as unknown as LoginResponse
  },

  /**
   * 用户登出
   */
  logout: async (): Promise<void> => {
    // 获取 refresh token 并发送登出请求
    const refreshToken = useAuthStore.getState().refreshToken
    // 没有 refreshToken 时不需要调用后端（logout 主要是废 refresh token）
    if (refreshToken) {
      return request.post('/auth/logout', { refreshToken })
    }
  },

  /**
   * 获取当前用户信息
   * @returns 用户信息
   */
  me: async (): Promise<AuthUserDto> => {
    return request.get('/auth/me')
  },

  /**
   * 修改密码
   * @param data 密码修改参数
   */
  changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<void> => {
    return request.post('/auth/change-password', {
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
    })
  },

  /**
   * 用户注册
   * @param data 注册参数
   */
  register: async (data: {
    username: string
    password: string
    email: string
    realName: string
  }): Promise<void> => {
    return request.post('/auth/register', {
      username: data.username,
      password: data.password,
      email: data.email,
      realName: data.realName,
    })
  },

  /**
   * 激活账号
   * @param data 激活参数
   */
  activate: async (data: { token: string }): Promise<void> => {
    return request.post('/auth/activate', data)
  },

  /**
   * 忘记密码（发送重置邮件）
   * @param data 邮箱参数
   */
  forgotPassword: async (data: { email: string }): Promise<void> => {
    return request.post('/auth/password/forgot', data)
  },

  /**
   * 验证重置密码 Token
   * @param token 重置令牌
   */
  verifyResetToken: async (token: string): Promise<void> => {
    return request.get('/auth/password/reset/verify', { params: { token } })
  },

  /**
   * 重置密码确认
   * @param data 重置密码参数
   */
  resetPassword: async (data: { token: string; newPassword: string }): Promise<void> => {
    return request.post('/auth/password/reset/confirm', {
      token: data.token,
      newPassword: data.newPassword,
      confirmPassword: data.newPassword,
    })
  },

  /**
   * 刷新 Token
   * @param refreshToken 刷新令牌
   * @returns 新的登录响应
   */
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    // 响应拦截器已经提取了 data 并转换为 camelCase
    return request.post('/auth/refresh', {
      refreshToken,
    }) as unknown as LoginResponse
  },
}
