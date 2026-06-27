/**
 * 认证中间件单元测试
 * 测试 JWT 认证、角色检查、权限验证等中间件
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
// Error classes imported for type usage in tests
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@stss/shared'
import jwt from 'jsonwebtoken'
import config from '@/config/index.js'
import { authMiddleware, requireRoles, requireSelfOrAdmin } from '@/shared/middleware/auth.js'

// Mock Prisma Client
vi.mock('@/shared/prisma/client.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}))

// Mock Redis
vi.mock('@/config/redis.js', () => ({
  redisClient: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import prisma from '@/shared/prisma/client.js'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { redisClient } from '@/config/redis.js'

// 类型定义
interface AuthRequest extends Request {
  user?: {
    userId: string
    username: string
    roles: string[]
  }
}

describe('authMiddleware', () => {
  let req: Partial<AuthRequest>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    req = {
      headers: {},
      params: {},
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
    next = vi.fn()
    vi.clearAllMocks()
  })

  describe('JWT 验证', () => {
    it('应该解析有效的 Bearer Token 并设置 req.user', async () => {
      const payload = { userId: 'user-1', username: 'alice', roles: ['student'], type: 'access' }
      const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' })

      req.headers = { authorization: `Bearer ${token}` }

      await authMiddleware(req as Request, res as Response, next)

      // JWT 解码后会包含所有原始字段，但我们只断言关键字段
      expect(req.user?.userId).toBe('user-1')
      expect(req.user?.username).toBe('alice')
      expect(req.user?.roles).toEqual(['student'])
      expect(next).toHaveBeenCalledWith()
    })

    it('应该拒绝没有 Authorization header 的请求', async () => {
      await authMiddleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 401,
          message: '未提供认证令牌',
        })
      )
    })

    it('应该拒绝无效的 Bearer Token', async () => {
      req.headers = { authorization: 'Bearer invalid-token' }

      await authMiddleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('应该拒绝过期的 Token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user-1', username: 'alice', roles: ['student'] },
        config.jwt.secret,
        { expiresIn: '-1h' }
      )

      req.headers = { authorization: `Bearer ${expiredToken}` }

      await authMiddleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('应该拒绝签名错误的 Token', async () => {
      const token = jwt.sign(
        { userId: 'user-1', username: 'alice', roles: ['student'] },
        'wrong-secret'
      )

      req.headers = { authorization: `Bearer ${token}` }

      await authMiddleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('应该拒绝非 Bearer 格式的 Authorization header', async () => {
      req.headers = { authorization: 'Basic dXNlcjpwYXNz' }

      await authMiddleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('应该拒绝 malformed 的 Bearer Token', async () => {
      req.headers = { authorization: 'Bearer' }

      await authMiddleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
    })
  })
})

describe('requireRoles', () => {
  let req: Partial<AuthRequest>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    req = {
      user: { userId: 'user-1', username: 'alice', roles: ['student'] },
      headers: {},
      params: {},
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
    next = vi.fn()
  })

  describe('单角色检查', () => {
    const middleware = requireRoles('admin')

    it('应该允许拥有所需角色的用户', () => {
      req.user = { userId: 'user-1', username: 'admin', roles: ['admin', 'student'] }

      middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
    })

    it('应该拒绝没有所需角色的用户', () => {
      middleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('应该拒绝没有 user 的请求', () => {
      req.user = undefined

      middleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
    })
  })

  describe('多角色 OR 逻辑', () => {
    const middleware = requireRoles('admin', 'super_admin')

    it('应该允许拥有任一角色的用户', () => {
      req.user = { userId: 'user-1', username: 'admin', roles: ['admin'] }

      middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
    })

    it('应该允许拥有 super_admin 角色的用户', () => {
      req.user = { userId: 'user-2', username: 'super', roles: ['super_admin', 'student'] }

      middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
    })

    it('应该拒绝没有任何所需角色的用户', () => {
      req.user = { userId: 'user-3', username: 'student', roles: ['student', 'teacher'] }

      middleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    })
  })

  describe('空角色列表', () => {
    const middleware = requireRoles()

    it('应该允许所有已认证用户', () => {
      middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith()
    })
  })
})

describe('requireSelfOrAdmin', () => {
  let req: Partial<AuthRequest>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    req = {
      user: { userId: 'user-1', username: 'alice', roles: ['student'] },
      params: {},
      headers: {},
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
    next = vi.fn()
  })

  it('应该允许用户访问自己的资源', () => {
    req.params = { id: 'user-1' }
    req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }

    const middleware = requireSelfOrAdmin('admin')
    middleware(req as Request, res as Response, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('应该允许管理员访问任意用户资源', () => {
    req.params = { id: 'user-2' }
    req.user = { userId: 'admin-1', username: 'admin', roles: ['admin'] }

    const middleware = requireSelfOrAdmin('admin')
    middleware(req as Request, res as Response, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('应该允许超级管理员访问任意用户资源', () => {
    req.params = { id: 'user-2' }
    req.user = { userId: 'super-1', username: 'super', roles: ['super_admin'] }

    const middleware = requireSelfOrAdmin('admin')
    middleware(req as Request, res as Response, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('应该拒绝普通用户访问他人资源', () => {
    req.params = { id: 'user-2' }
    req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }

    const middleware = requireSelfOrAdmin('admin')
    middleware(req as Request, res as Response, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('应该拒绝没有 user 的请求', () => {
    req.params = { id: 'user-1' }
    req.user = undefined

    const middleware = requireSelfOrAdmin('admin')
    middleware(req as Request, res as Response, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('应该支持多个管理员角色', () => {
    req.params = { id: 'user-2' }
    req.user = { userId: 'mod-1', username: 'mod', roles: ['moderator'] }

    const middleware = requireSelfOrAdmin('admin', 'super_admin', 'moderator')
    middleware(req as Request, res as Response, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('应该处理缺少 id 参数的情况', () => {
    req.params = {}
    req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }

    const middleware = requireSelfOrAdmin('admin')
    middleware(req as Request, res as Response, next)

    // 当没有 id 参数时，默认拒绝（需要明确的资源标识）
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})

describe('错误处理', () => {
  it('应该在中间件链中正确传递错误', async () => {
    const req: Partial<Request> = {
      headers: { authorization: 'Bearer invalid' },
    }
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
    const next = vi.fn()

    // authMiddleware 会处理错误并返回，不会抛出异常或调用 next
    await authMiddleware(req as Request, res as unknown as Response, next)

    // 不应该调用 next（错误已被中间件处理并返回响应）
    expect(next).not.toHaveBeenCalled()
    // 应该返回 401 错误响应
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalled()
  })

  it('应该正确处理无效的 token 格式', async () => {
    const req: Partial<Request> = {
      headers: { authorization: 'Bearer' }, // 只有 Bearer，没有 token
    }
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
    const next = vi.fn()

    await authMiddleware(req as Request, res as unknown as Response, next)

    // 不应该调用 next
    expect(next).not.toHaveBeenCalled()
    // 应该返回 401 错误响应
    expect(res.status).toHaveBeenCalledWith(401)
  })
})
