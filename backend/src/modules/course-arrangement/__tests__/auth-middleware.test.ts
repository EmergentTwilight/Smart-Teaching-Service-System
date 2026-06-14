/**
 * B 模块鉴权中间件单元测试
 *
 * 验证 authMiddleware / requireRoles / requireSelfOrAdmin 三个中间件的正确性，
 * 覆盖未登录、非法令牌、角色不足、正常鉴权等场景。
 */

// 在模块加载前设置测试环境变量，避免 Prisma 构造时因缺少 DATABASE_URL 抛错
vi.hoisted(() => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'
})

import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import express from 'express'
import { describe, expect, it, vi } from 'vitest'

import {
  authMiddleware,
  requireRoles,
  requireSelfOrAdmin,
} from '../../../shared/middleware/auth.js'

// ─── Helper ──────────────────────────────────────────────────────────────────
function mockReqRes(
  opts: { headers?: Record<string, string>; user?: any; params?: Record<string, string> } = {}
) {
  const req: any = {
    headers: { ...opts.headers },
    user: opts.user,
    params: { ...opts.params },
  }
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  const next = vi.fn()
  return { req, res, next }
}

const JWT_SECRET = process.env.JWT_SECRET || 'stss-super-secret-jwt-key-2026-dev-only'

// ─── 1. authMiddleware ───────────────────────────────────────────────────────
describe('authMiddleware', () => {
  it('无 Authorization header → 401', () => {
    const { req, res, next } = mockReqRes()
    authMiddleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }))
    expect(next).not.toHaveBeenCalled()
  })

  it('非 Bearer 格式 → 401', () => {
    const { req, res, next } = mockReqRes({
      headers: { authorization: 'Basic xyz' },
    })
    authMiddleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('无效 JWT → 401', () => {
    const { req, res, next } = mockReqRes({
      headers: { authorization: 'Bearer this.is.not.a.valid.jwt' },
    })
    authMiddleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('过期 JWT → 401', () => {
    const token = jwt.sign({ userId: 'u1', username: 'test', roles: ['student'] }, JWT_SECRET, {
      expiresIn: '0s',
    })
    const { req, res, next } = mockReqRes({
      headers: { authorization: `Bearer ${token}` },
    })
    authMiddleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('有效 JWT → 设置 req.user 并调用 next()', () => {
    const token = jwt.sign({ userId: 'u1', username: 'alice', roles: ['teacher'] }, JWT_SECRET, {
      expiresIn: '1h',
    })
    const { req, res, next } = mockReqRes({
      headers: { authorization: `Bearer ${token}` },
    })
    authMiddleware(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toBeDefined()
    expect(req.user!.userId).toBe('u1')
    expect(req.user!.username).toBe('alice')
    expect(req.user!.roles).toEqual(['teacher'])
  })
})

// ─── 2. requireRoles ─────────────────────────────────────────────────────────
describe('requireRoles', () => {
  it('未认证用户 → 401', () => {
    const { req, res, next } = mockReqRes()
    const mw = requireRoles('admin')
    mw(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('角色匹配 → 调用 next()', () => {
    const { req, res, next } = mockReqRes({
      user: { userId: 'u1', username: 'alice', roles: ['admin', 'teacher'] },
    })
    const mw = requireRoles('admin')
    mw(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('角色不匹配 → 403', () => {
    const { req, res, next } = mockReqRes({
      user: { userId: 'u1', username: 'alice', roles: ['student'] },
    })
    const mw = requireRoles('admin', 'super_admin')
    mw(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('多角色中匹配任意一个即可', () => {
    const { req, res, next } = mockReqRes({
      user: { userId: 'u1', username: 'bob', roles: ['teacher'] },
    })
    const mw = requireRoles('admin', 'teacher', 'super_admin')
    mw(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})

// ─── 3. requireSelfOrAdmin ───────────────────────────────────────────────────
describe('requireSelfOrAdmin', () => {
  it('未认证 → 401', () => {
    const { req, res, next } = mockReqRes()
    const mw = requireSelfOrAdmin('admin')
    mw(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('本人访问本人资源 → 调用 next()', () => {
    const { req, res, next } = mockReqRes({
      user: { userId: 'u1', username: 'alice', roles: ['student'] },
      params: { id: 'u1' },
    })
    const mw = requireSelfOrAdmin('admin')
    mw(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('管理员访问他人资源 → 调用 next()', () => {
    const { req, res, next } = mockReqRes({
      user: { userId: 'admin-1', username: 'super', roles: ['admin'] },
      params: { id: 'u1' },
    })
    const mw = requireSelfOrAdmin('admin', 'super_admin')
    mw(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('非本人且非管理员 → 403', () => {
    const { req, res, next } = mockReqRes({
      user: { userId: 'u2', username: 'eve', roles: ['student'] },
      params: { id: 'u1' },
    })
    const mw = requireSelfOrAdmin('admin')
    mw(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})

// ─── 4. 集成：路由层面鉴权验证 ──────────────────────────────────────────────
describe('B 模块路由 — 鉴权集成', () => {
  it('所有 B 模块路由文件均已导入并挂载 authMiddleware', async () => {
    const routers = await Promise.all([
      import('../classroom/classroom.routes.js'),
      import('../schedule/schedule.routes.js'),
      import('../timetable/timetable.routes.js'),
      import('../rules/rule.routes.js'),
      import('../auto-schedule/auto-schedule.routes.js'),
    ])

    for (const mod of routers) {
      const router: express.Router = mod.default
      // router.use(authMiddleware) 会在 router.stack 的第一层插入一个 Layer
      const hasAuthMw = router.stack.some(
        (layer: any) =>
          layer.handle === authMiddleware ||
          (typeof layer.handle === 'function' && layer.handle.name === 'authMiddleware')
      )
      expect(hasAuthMw).toBe(true)
    }
  })
})
