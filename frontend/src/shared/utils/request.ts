/**
 * Axios 请求封装
 * 配置请求/响应拦截器和认证处理
 */
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/shared/stores/authStore'

/**
 * 自定义响应类型，既包含 AxiosResponse 的属性，也直接包含数据属性
 */
export type RequestResponse<T = unknown> = AxiosResponse<T> & T

/** 创建 axios 实例 */
const request = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

/**
 * Single-flight 刷新机制
 * 确保多个并发 401 请求只触发一次 token 刷新
 */
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

/**
 * 订阅 token 刷新完成事件
 */
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

/**
 * 通知所有订阅者 token 刷新完成
 */
function onRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token))
  refreshSubscribers = []
}

/**
 * 刷新失败时，清除所有订阅并重定向到登录页
 */
function onRefreshFailed() {
  refreshSubscribers = []
  useAuthStore.getState().logout()
  window.location.href = '/login'
}

/**
 * 从 auth store 获取 refreshToken
 */
function getRefreshToken(): string | null {
  return useAuthStore.getState().refreshToken
}

/**
 * 更新 auth store 中的 token
 */
function updateStoredToken(accessToken: string, refreshToken: string): void {
  const user = useAuthStore.getState().user
  if (user) {
    useAuthStore.getState().setAuth(accessToken, refreshToken, user)
  }
}

/**
 * 刷新访问令牌
 */
async function refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return null
  }

  try {
    // 使用独立的 axios 实例，避免触发拦截器循环
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/auth/refresh`,
      { refreshToken },
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      }
    )

    const data = response.data?.data || response.data
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }
  } catch {
    return null
  }
}

/**
 * 将 snake_case 键转换为 camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * 将 camelCase 键转换为 snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase()
}

/**
 * 递归转换对象的键为 camelCase
 */
function convertKeysToCamelCase<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertKeysToCamelCase(item)) as unknown as T
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toCamelCase(key)] =
        value && typeof value === 'object' ? convertKeysToCamelCase(value) : value
    }
    return result as T
  }
  return obj
}

/**
 * 递归转换对象的键为 snake_case
 */
function convertKeysToSnakeCase<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertKeysToSnakeCase(item)) as unknown as T
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toSnakeCase(key)] =
        value && typeof value === 'object' ? convertKeysToSnakeCase(value) : value
    }
    return result as T
  }
  return obj
}

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 从 zustand store 中获取 token
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 将请求体的 camelCase 转换为 snake_case
    // 注意：跳过 FormData 对象，因为它不是普通对象
    if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      console.log('=== [请求拦截器] 转换前数据:', JSON.stringify(config.data, null, 2))
      console.log('=== [请求拦截器] 数据类型:', Object.prototype.toString.call(config.data))
      console.log('=== [请求拦截器] 是否为 FormData:', config.data instanceof FormData)
      config.data = convertKeysToSnakeCase(config.data)
      console.log('=== [请求拦截器] 转换后数据:', JSON.stringify(config.data, null, 2))
      // 处理枚举值：degree_type 需要转换为大写
      if (typeof config.data === 'object' && 'degree_type' in config.data) {
        config.data.degree_type = String(config.data.degree_type).toUpperCase()
        console.log('=== [请求拦截器] degree_type 大写转换后:', config.data.degree_type)
      }
    } else if (config.data) {
      console.log(
        '=== [请求拦截器] 数据不是普通对象，跳过转换:',
        Object.prototype.toString.call(config.data)
      )
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    // 后端返回格式: { code, message, data }
    // 提取 data 字段返回，并转换 snake_case 为 camelCase
    const result = response.data
    let data = result
    if (result && typeof result === 'object' && 'data' in result) {
      data = result.data
    }
    return convertKeysToCamelCase(data) as unknown as AxiosResponse
  },
  async (error: AxiosError<{ message?: string; error?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // 401 错误且未尝试过刷新
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 如果是刷新 token 请求本身失败，直接登出
      if (originalRequest.url?.includes('/auth/refresh')) {
        onRefreshFailed()
        return Promise.reject(error)
      }

      // Single-flight: 如果正在刷新，等待刷新完成
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(request(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const tokens = await refreshAccessToken()

        if (tokens) {
          // 更新 localStorage 中的 token
          updateStoredToken(tokens.accessToken, tokens.refreshToken)

          // 通知所有等待的请求
          onRefreshed(tokens.accessToken)

          // 使用新 token 重试原请求
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
          return request(originalRequest)
        } else {
          // 刷新失败，登出
          onRefreshFailed()
          return Promise.reject(error)
        }
      } catch (refreshError) {
        // 刷新过程出错，登出
        onRefreshFailed()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // 非 401 错误或已尝试刷新
    if (error.response?.status === 401) {
      // 已尝试刷新但仍然 401，清除并重定向
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }

    // 提取后端返回的错误消息
    const errorMessage =
      error.response?.data?.message || error.response?.data?.error || error.message
    return Promise.reject(new Error(errorMessage))
  }
)

export default request
