/**
 * 请求日志中间件
 * 为每个请求生成唯一 ID 并记录结构化日志
 */
import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

// 扩展 Request 类型
declare module 'express' {
  interface Request {
    requestId?: string
  }
}

/**
 * 请求日志中间件
 * - 生成唯一请求 ID
 * - 记录请求响应时间
 * - 输出结构化日志
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // 生成请求 ID
  req.requestId = uuidv4()

  // 记录请求开始时间
  const startTime = Date.now()

  // 响应完成后记录日志
  res.on('finish', () => {
    const duration = Date.now() - startTime
    console.log(
      JSON.stringify({
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.userId,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      })
    )
  })

  next()
}
