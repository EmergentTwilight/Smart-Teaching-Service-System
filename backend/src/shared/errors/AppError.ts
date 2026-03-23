/**
 * 统一错误处理类
 * 提供自定义错误类型，支持不同的 HTTP 状态码和错误代码
 */

/**
 * 应用错误基类
 * 所有自定义错误都应继承此类
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 404 资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND')
  }
}

/**
 * 401 未授权错误
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

/**
 * 403 权限不足错误
 */
export class ForbiddenError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403, 'FORBIDDEN')
  }
}

/**
 * 400 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

/**
 * 409 冲突错误（如资源已存在）
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}
