import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

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
