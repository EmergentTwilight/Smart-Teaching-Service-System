import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { error } from '../utils/response.js'
import { AppError } from '@stss/shared'

/**
 * 全局错误处理中间件
 * 捕获所有错误并返回统一格式的响应
 */
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err)

  // 处理 Zod 验证错误
  if (err instanceof ZodError) {
    return error(res, '验证失败', 400, err.errors, req.requestId)
  }

  // 处理自定义 AppError
  if (err instanceof AppError) {
    return error(
      res,
      err.message,
      err.statusCode,
      err.code ? { code: err.code } : undefined,
      req.requestId
    )
  }

  // 处理带有 statusCode/status 属性的错误（如 ForbiddenError, ValidationError）
  const statusCode =
    (err as { statusCode?: number }).statusCode || (err as { status?: number }).status || 500
  const message = err.message || '服务器内部错误'

  return error(res, message, statusCode, undefined, req.requestId)
}
