/**
 * API 响应工具函数
 * 统一处理 HTTP 响应格式
 */
import { Response } from 'express'

/**
 * API 响应结构
 */
export interface ApiResponse<T = unknown> {
  /** 状态码 */
  code: number
  /** 响应消息 */
  message: string
  /** 响应数据 */
  data?: T
  /** 请求 ID（用于追踪） */
  request_id?: string
}

/**
 * 将对象键名递归转换为 snake_case
 * 统一 API 输出字段风格
 */
const toSnakeCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()

const convertKeysToSnakeCase = <T>(input: T): T => {
  if (Array.isArray(input)) {
    return input.map((item) => convertKeysToSnakeCase(item)) as T
  }

  if (input instanceof Date) {
    return input.toISOString() as T
  }

  if (input && typeof input === 'object') {
    const entries = Object.entries(input as Record<string, unknown>).map(([key, value]) => [
      toSnakeCase(key),
      convertKeysToSnakeCase(value),
    ])
    return Object.fromEntries(entries) as T
  }

  return input
}

/**
 * 成功响应
 * @param res Express Response 对象
 * @param data 响应数据
 * @param message 成功消息
 * @param code HTTP 状态码
 * @param requestId 请求 ID
 */
export const success = <T>(
  res: Response,
  data: T,
  message = 'Success',
  code = 200,
  requestId?: string
) => {
  const response: ApiResponse<T> = {
    code,
    message,
    data: convertKeysToSnakeCase(data),
  }
  if (requestId) {
    response.request_id = requestId
  }
  res.status(code).json(response)
}

/**
 * 错误响应
 * @param res Express Response 对象
 * @param message 错误消息
 * @param code HTTP 状态码
 * @param errors 错误详情
 * @param requestId 请求 ID
 */
export const error = (
  res: Response,
  message: string,
  code = 400,
  errors?: unknown,
  requestId?: string
) => {
  const response: ApiResponse = {
    code,
    message,
  }
  if (errors !== undefined) {
    response.data = convertKeysToSnakeCase(errors as Record<string, unknown>)
  }
  if (requestId) {
    response.request_id = requestId
  }
  res.status(code).json(response)
}

/**
 * 分页响应
 * @param res Express Response 对象
 * @param items 数据项列表
 * @param pagination 分页信息
 * @param requestId 请求 ID
 */
export const paginated = <T>(
  res: Response,
  items: T[],
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  },
  requestId?: string
) => {
  const response: ApiResponse<{ items: T[]; pagination: typeof pagination }> = {
    code: 200,
    message: 'Success',
    data: {
      items,
      pagination,
    },
  }
  if (requestId) {
    response.request_id = requestId
  }
  res.json(convertKeysToSnakeCase(response))
}
