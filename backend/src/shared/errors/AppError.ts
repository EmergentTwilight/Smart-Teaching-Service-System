/**
 * 统一错误处理类
 * 从 @stss/shared 重新导出，保持向后兼容
 */
export {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
} from '@stss/shared'
