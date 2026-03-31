/**
 * 统一错误处理工具
 * 提供类型安全的错误消息提取
 */
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '@/shared/types'

/**
 * 从未知错误中提取错误消息
 * 统一处理 Axios 错误、Error 对象和其他类型的错误
 *
 * @param error - 捕获的错误对象
 * @param fallbackMessage - 默认错误消息
 * @returns 格式化的错误消息字符串
 */
export function extractErrorMessage(error: unknown, fallbackMessage: string = '操作失败'): string {
  // 1. 如果是标准的 Error 对象（axios 拦截器已经转换过）
  if (error instanceof Error) {
    return error.message || fallbackMessage
  }

  // 2. 如果是 AxiosError（直接抛出未经拦截器处理的情况）
  if (isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      fallbackMessage
    )
  }

  // 3. 如果是带有 message 属性的对象
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string') {
      return message || fallbackMessage
    }
  }

  // 4. 字符串错误
  if (typeof error === 'string') {
    return error || fallbackMessage
  }

  return fallbackMessage
}

/**
 * 类型守卫：检查是否为 AxiosError
 */
function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as { isAxiosError?: boolean }).isAxiosError === true
  )
}

/**
 * 获取 HTTP 状态码
 * @returns 状态码，如果不是 Axios 错误则返回 null
 */
export function getErrorStatus(error: unknown): number | null {
  if (isAxiosError(error)) {
    return error.response?.status ?? null
  }
  return null
}

/**
 * 检查是否为特定 HTTP 状态码的错误
 */
export function isErrorStatus(error: unknown, status: number): boolean {
  return getErrorStatus(error) === status
}

/**
 * 检查是否为网络错误（无响应）
 */
export function isNetworkError(error: unknown): boolean {
  return isAxiosError(error) && !error.response
}

/**
 * 检查是否为超时错误
 */
export function isTimeoutError(error: unknown): boolean {
  return isAxiosError(error) && error.code === 'ECONNABORTED'
}
