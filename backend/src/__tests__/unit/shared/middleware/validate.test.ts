/**
 * 请求验证中间件单元测试
 * 测试 Zod schema 验证中间件的行为
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import type { Mock } from 'vitest'
import { ZodError } from 'zod'
import { validate } from '../../../../shared/middleware/validate.js'
import { z } from 'zod'

describe('validate middleware', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: Mock

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    }
    res = {}
    next = vi.fn()
    vi.clearAllMocks()
  })

  // 创建测试用的 schema
  const testSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(8),
    email: z.string().email().optional(),
  })

  const querySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().default(10),
  })

  const paramsSchema = z.object({
    id: z.string().uuid(),
  })

  describe('body validation', () => {
    it('应该通过有效的 body 数据', async () => {
      req.body = {
        username: 'alice',
        password: 'Password123',
      }

      const middleware = validate(testSchema, 'body')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
      expect(req.body).toEqual({
        username: 'alice',
        password: 'Password123',
      })
    })

    it('应该通过带有可选字段的有效数据', async () => {
      req.body = {
        username: 'bob',
        password: 'Password456',
        email: 'bob@example.com',
      }

      const middleware = validate(testSchema, 'body')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
      expect(req.body).toEqual({
        username: 'bob',
        password: 'Password456',
        email: 'bob@example.com',
      })
    })

    it('应该拒绝无效的 body 数据并传递错误给 next', async () => {
      req.body = {
        username: 'ab', // 太短
        password: 'short', // 太短
      }

      const middleware = validate(testSchema, 'body')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(expect.any(ZodError))

      const zodError = next.mock.calls[0][0] as ZodError
      expect(zodError).toBeInstanceOf(ZodError)
      expect(zodError.issues).toHaveLength(2)
    })

    it('应该使用 schema 的默认值', async () => {
      const schemaWithDefaults = z.object({
        name: z.string().default('Anonymous'),
        count: z.number().default(0),
      })

      req.body = {}

      const middleware = validate(schemaWithDefaults, 'body')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
      expect(req.body).toEqual({
        name: 'Anonymous',
        count: 0,
      })
    })

    it('应该使用 schema 的转换功能（coerce）', async () => {
      req.query = {
        page: '2',
        pageSize: '20',
      }

      const middleware = validate(querySchema, 'query')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
      expect(req.query).toEqual({
        page: 2,
        pageSize: 20,
      })
    })

    it('应该应用 query schema 的默认值', async () => {
      req.query = {}

      const middleware = validate(querySchema, 'query')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
      expect(req.query).toEqual({
        page: 1,
        pageSize: 10,
      })
    })
  })

  describe('query validation', () => {
    it('应该通过有效的 query 数据', async () => {
      req.query = {
        page: '3',
        pageSize: '25',
      }

      const middleware = validate(querySchema, 'query')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
      expect(req.query).toEqual({
        page: 3,
        pageSize: 25,
      })
    })

    it('应该拒绝无效的 query 数据', async () => {
      req.query = {
        page: 'invalid', // 不是数字
        pageSize: '-5', // 负数
      }

      const middleware = validate(querySchema, 'query')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(expect.any(ZodError))

      const zodError = next.mock.calls[0][0] as ZodError
      expect(zodError).toBeInstanceOf(ZodError)
    })

    it('应该对无效数字传递错误', async () => {
      req.query = {
        page: 'abc',
      }

      const middleware = validate(querySchema, 'query')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(expect.any(ZodError))
    })
  })

  describe('params validation', () => {
    it('应该通过有效的 params 数据', async () => {
      req.params = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      }

      const middleware = validate(paramsSchema, 'params')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
      expect(req.params).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
      })
    })

    it('应该拒绝无效的 UUID', async () => {
      req.params = {
        id: 'not-a-uuid',
      }

      const middleware = validate(paramsSchema, 'params')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(expect.any(ZodError))

      const zodError = next.mock.calls[0][0] as ZodError
      expect(zodError).toBeInstanceOf(ZodError)
      expect(zodError.issues[0].path).toEqual(['id'])
    })

    it('应该拒绝缺失的必需参数', async () => {
      req.params = {}

      const middleware = validate(paramsSchema, 'params')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(expect.any(ZodError))
    })
  })

  describe('schema transformations', () => {
    it('应该应用 schema 的转换规则', async () => {
      const transformSchema = z.object({
        email: z
          .string()
          .email()
          .transform((val) => val.toLowerCase()),
        age: z.string().transform((val) => parseInt(val, 10)),
      })

      req.body = {
        email: 'TEST@EXAMPLE.COM',
        age: '25',
      }

      const middleware = validate(transformSchema, 'body')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
      expect(req.body).toEqual({
        email: 'test@example.com',
        age: 25,
      })
    })

    it('应该应用 refine 自定义验证', async () => {
      const passwordConfirmSchema = z
        .object({
          password: z.string().min(8),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: '密码不匹配',
          path: ['confirmPassword'],
        })

      req.body = {
        password: 'Password123',
        confirmPassword: 'DifferentPassword',
      }

      const middleware = validate(passwordConfirmSchema, 'body')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(expect.any(ZodError))

      const zodError = next.mock.calls[0][0] as ZodError
      expect(zodError.issues[0].message).toBe('密码不匹配')
    })
  })

  describe('error handling', () => {
    it('应该传递所有验证错误', async () => {
      const strictSchema = z.object({
        username: z.string().min(3).max(20),
        age: z.number().int().positive(),
        email: z.string().email(),
      })

      req.body = {
        username: 'ab', // 太短
        age: -5, // 负数
        email: 'not-an-email', // 格式错误
      }

      const middleware = validate(strictSchema, 'body')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(expect.any(ZodError))

      const zodError = next.mock.calls[0][0] as ZodError
      expect(zodError.issues.length).toBeGreaterThanOrEqual(3)
    })

    it('应该正确处理异步验证', async () => {
      const asyncSchema = z.object({
        username: z.string().refine(
          async (val) => {
            // 模拟异步检查
            return val !== 'forbidden'
          },
          { message: '用户名已被占用' }
        ),
      })

      req.body = {
        username: 'forbidden',
      }

      const middleware = validate(asyncSchema, 'body')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(expect.any(ZodError))

      const zodError = next.mock.calls[0][0] as ZodError
      expect(zodError.issues[0].message).toBe('用户名已被占用')
    })
  })

  describe('edge cases', () => {
    it('应该处理空对象', async () => {
      const optionalSchema = z.object({
        name: z.string().optional(),
        count: z.number().optional(),
      })

      req.body = {}

      const middleware = validate(optionalSchema, 'body')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
    })

    it('应该处理额外字段（strict mode 关闭时）', async () => {
      const schema = z.object({
        name: z.string(),
      })

      req.body = {
        name: 'test',
        extraField: 'should be ignored',
      }

      const middleware = validate(schema, 'body')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
      // 非严格模式下额外字段会被保留
      expect(req.body).toHaveProperty('extraField')
    })

    it('应该使用 strict mode 拒绝额外字段', async () => {
      const strictSchema = z
        .object({
          name: z.string(),
        })
        .strict()

      req.body = {
        name: 'test',
        extraField: 'not allowed',
      }

      const middleware = validate(strictSchema, 'body')
      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(expect.any(ZodError))

      const zodError = next.mock.calls[0][0] as ZodError
      expect(zodError.issues.some((issue) => issue.code === 'unrecognized_keys')).toBe(true)
    })
  })
})
