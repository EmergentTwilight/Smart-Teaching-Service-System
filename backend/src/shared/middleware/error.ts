import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { error } from '../utils/response.js'

export interface AppError extends Error {
  statusCode?: number
  code?: string
}

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
