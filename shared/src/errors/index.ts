/**
 * 统一错误类
 * 所有模块共用
 */

/** 基础错误类 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/** 资源不存在 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', 404, id ? `${resource}不存在: ${id}` : `${resource}不存在`)
  }
}

/** 未授权 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权，请先登录') {
    super('UNAUTHORIZED', 401, message)
  }
}

/** 无权限 */
export class ForbiddenError extends AppError {
  constructor(message: string = '无权限执行此操作') {
    super('FORBIDDEN', 403, message)
  }
}

/** 参数校验失败 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', 400, message, details)
  }
}

/** 资源冲突 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', 409, message)
  }
}

/** 请求过多 */
export class TooManyRequestsError extends AppError {
  constructor(message: string = '请求过于频繁，请稍后重试', retryAfter?: number) {
    super('TOO_MANY_REQUESTS', 429, message, retryAfter ? { retryAfter } : undefined)
  }
}

/** 内部服务器错误 */
export class InternalServerError extends AppError {
  constructor(message: string = '服务器内部错误') {
    super('INTERNAL_ERROR', 500, message)
  }
}
