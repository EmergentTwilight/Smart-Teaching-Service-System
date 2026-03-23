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
    // 提取 data 字段返回
    const result = response.data
    if (result && typeof result === 'object' && 'data' in result) {
      return result.data
    }
    return result
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
