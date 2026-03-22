/**
 * 全局错误处理中间件
 * 统一捕获和处理应用错误
 */
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { error } from '../utils/response.js'

/**
 * 应用错误接口
 * 扩展标准 Error，添加 HTTP 状态码和错误代码
 */
export interface AppError extends Error {
  /** HTTP 状态码 */
  statusCode?: number
  /** 错误代码 */
  code?: string
}

/**
 * 全局错误处理中间件
 * 捕获所有错误并返回统一格式的响应
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', err)

  if (err instanceof ZodError) {
    return error(res, '验证失败', 400, err.errors)
  }

  const statusCode = err.statusCode || 500
  const message = err.message || '服务器内部错误'

  return error(res, message, statusCode)
}
