/**
 * 认证 API
 * 处理登录、登出、用户信息等接口
 */
import request from '@/shared/utils/request'
import type { LoginResponse, User } from '@/shared/types'

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
    const response = await request.post<{
      access_token: string
      refresh_token: string
      expires_in: number
      user: User
    }>('/auth/login', data)
    // 转换 snake_case 为 camelCase
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresIn: response.expires_in,
      user: response.user,
    }
  },

  /**
   * 用户登出
   */
  logout: async (): Promise<void> => {
    // 获取 refresh token 并发送登出请求
    const authStorage = localStorage.getItem('auth-storage')
    const refreshToken = authStorage ? JSON.parse(authStorage)?.state?.refreshToken : null
    return request.post('/auth/logout', refreshToken ? { refresh_token: refreshToken } : {})
  },

  /**
   * 获取当前用户信息
   * @returns 用户信息
   */
  me: async (): Promise<User> => {
    return request.get('/auth/me')
  },

  /**
   * 修改密码
   * @param data 密码修改参数
   */
  changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<void> => {
    return request.post('/auth/change-password', {
      old_password: data.oldPassword,
      new_password: data.newPassword,
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
      real_name: data.realName,
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
      new_password: data.newPassword,
      confirm_password: data.newPassword,
    })
  },

  /**
   * 刷新 Token
   * @param refreshToken 刷新令牌
   * @returns 新的登录响应
   */
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await request.post<{
      access_token: string
      refresh_token: string
      expires_in: number
      user: User
    }>('/auth/refresh', { refresh_token: refreshToken })
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresIn: response.expires_in,
      user: response.user,
    }
  },
}
