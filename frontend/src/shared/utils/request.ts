/**
 * Axios 请求封装
 * 配置请求/响应拦截器和认证处理
 */
import axios, { AxiosError, AxiosResponse } from 'axios'

/** 创建 axios 实例 */
const request = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 从 zustand persist 存储中获取 token
    const authStorage = localStorage.getItem('auth-storage')
    const token = authStorage ? JSON.parse(authStorage)?.state?.token : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 将请求数据中的 camelCase 转换为 snake_case
    if (config.data && typeof config.data === 'object') {
      config.data = convertKeysToSnakeCase(config.data)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * 将 camelCase 键转换为 snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * 将 snake_case 键转换为 camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
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

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    // 后端返回格式: { code, message, data }
    // 提取 data 字段返回，并转换 snake_case 为 camelCase
    const result = response.data
    if (result && typeof result === 'object' && 'data' in result) {
      return convertKeysToCamelCase(result.data)
    }
    return convertKeysToCamelCase(result)
  },
  (error: AxiosError<{ message?: string; error?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
    // 提取后端返回的错误消息
    const errorMessage =
      error.response?.data?.message || error.response?.data?.error || error.message
    return Promise.reject(new Error(errorMessage))
  }
)

export default request
