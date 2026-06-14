/**
 * 认证中间件单元测试
 * 验证 authMiddleware、requireRoles、requireSelfOrAdmin 的鉴权行为
 *
 * 当前 B 模块所有路由已挂载 authMiddleware，预期：
 * - 未带 token 请求 → 401
 * - 无效 token 请求 → 401
 * - 有效 token + 缺角色 → 403
 * - 有效 token + 有角色 → 放行
 */
import { describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import config from '../../config/index.js'
import { authMiddleware, requireRoles, requireSelfOrAdmin } from '../../shared/middleware/auth.js'

function mockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    headers: {},
    ...overrides,
  } as Partial<Request>
}

function mockRes(): Partial<Response> {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

function validToken(payload?: Record<string, unknown>): string {
  return jwt.sign(
    { userId: 'user-001', username: 'admin', roles: ['admin'], ...payload },
    config.jwt.secret,
    { expiresIn: '1h' }
  )
}

// ==================== authMiddleware ====================
describe('authMiddleware', () => {
  describe('missing or invalid Authorization header', () => {
    it('无 Authorization header 时应该返回 401', () => {
      const req = mockReq()
      const res = mockRes()
      const next = vi.fn()

      authMiddleware(req as Request, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 401, message: '未提供认证令牌' })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('Authorization header 不以 Bearer 开头时应该返回 401', () => {
      const req = mockReq({ headers: { authorization: 'Token abc123' } })
      const res = mockRes()
      const next = vi.fn()

      authMiddleware(req as Request, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('空 Bearer token 时应该返回 401', () => {
      const req = mockReq({ headers: { authorization: 'Bearer ' } })
      const res = mockRes()
      const next = vi.fn()

      authMiddleware(req as Request, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('invalid token', () => {
    it('无效 JWT 时应返回 401', () => {
      const req = mockReq({ headers: { authorization: 'Bearer this.is.not.a.valid.jwt' } })
      const res = mockRes()
      const next = vi.fn()

      authMiddleware(req as Request, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无效或过期的令牌' })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('过期 token 时应返回 401', () => {
      const expiredToken = jwt.sign(
        { userId: 'user-001', username: 'admin', roles: ['admin'] },
        config.jwt.secret,
        { expiresIn: '0s' }
      )
      // 等一小段时间让 token 过期
      const req = mockReq({ headers: { authorization: `Bearer ${expiredToken}` } })
      const res = mockRes()
      const next = vi.fn()

      authMiddleware(req as Request, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('valid token', () => {
    it('有效 token 时应该调用 next() 并在 req.user 上挂载用户信息', () => {
      const token = validToken()
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } })
      const res = mockRes()
      const next = vi.fn()

      authMiddleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(req.user).toBeDefined()
      expect(req.user?.userId).toBe('user-001')
      expect(req.user?.username).toBe('admin')
      expect(req.user?.roles).toContain('admin')
    })
  })
})

// ==================== requireRoles ====================
describe('requireRoles', () => {
  it('用户无对应角色时应返回 403', () => {
    const req = mockReq({ user: { userId: 'user-001', username: 'student', roles: ['student'] } })
    const res = mockRes()
    const next = vi.fn()

    requireRoles('admin')(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: '权限不足' }))
    expect(next).not.toHaveBeenCalled()
  })

  it('用户有任一所需角色时应放行', () => {
    const req = mockReq({
      user: { userId: 'user-001', username: 'admin', roles: ['admin', 'teacher'] },
    })
    const res = mockRes()
    const next = vi.fn()

    requireRoles('admin', 'super_admin')(req as Request, res as Response, next)

    expect(next).toHaveBeenCalled()
  })

  it('未认证用户（无 req.user）时应返回 401', () => {
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    requireRoles('admin')(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})

// ==================== requireSelfOrAdmin ====================
describe('requireSelfOrAdmin', () => {
  const middleware = requireSelfOrAdmin('admin', 'super_admin')

  it('用户访问自己的资源时应放行', () => {
    const req = mockReq({
      user: { userId: 'user-001', username: 'teacher', roles: ['teacher'] },
      params: { id: 'user-001' },
    })
    const res = mockRes()
    const next = vi.fn()

    middleware(req as Request, res as Response, next)

    expect(next).toHaveBeenCalled()
  })

  it('管理员访问他人资源时应放行', () => {
    const req = mockReq({
      user: { userId: 'admin-001', username: 'admin', roles: ['admin'] },
      params: { id: 'user-999' },
    })
    const res = mockRes()
    const next = vi.fn()

    middleware(req as Request, res as Response, next)

    expect(next).toHaveBeenCalled()
  })

  it('普通用户访问他人资源时应返回 403', () => {
    const req = mockReq({
      user: { userId: 'student-001', username: 'student', roles: ['student'] },
      params: { id: 'user-999' },
    })
    const res = mockRes()
    const next = vi.fn()

    middleware(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('未认证用户应返回 401', () => {
    const req = mockReq({ params: { id: 'user-001' } })
    const res = mockRes()
    const next = vi.fn()

    middleware(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
