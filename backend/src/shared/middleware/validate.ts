/**
 * 请求验证中间件
 * 使用 Zod schema 验证请求数据
 */
import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

/**
 * 创建验证中间件
 * @param schema Zod 验证 schema
 * @param source 数据来源（body/query/params）
 * @returns Express 中间件函数
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params
      const result = await schema.parseAsync(data)
      Object.assign(source === 'body' ? req.body : source === 'query' ? req.query : req.params, result)
      next()
    } catch (err) {
      next(err)
    }
  }
}
