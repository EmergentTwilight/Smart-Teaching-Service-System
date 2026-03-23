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
  requestId?: string
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
    data,
  }
  if (requestId) {
    response.requestId = requestId
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
    response.data = errors as Record<string, unknown>
  }
  if (requestId) {
    response.requestId = requestId
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
    response.requestId = requestId
  }
  res.json(response)
}
