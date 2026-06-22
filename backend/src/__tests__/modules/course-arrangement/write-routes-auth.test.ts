import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import config from '../../../config/index.js'
import classroomRoutes from '../../../modules/course-arrangement/classroom/classroom.routes.js'
import scheduleRoutes from '../../../modules/course-arrangement/schedule/schedule.routes.js'
import ruleRoutes from '../../../modules/course-arrangement/rules/rule.routes.js'
import autoScheduleRoutes from '../../../modules/course-arrangement/auto-schedule/auto-schedule.routes.js'
import type { NextFunction, Request, Response, Router } from 'express'

const controllerMocks = vi.hoisted(() => ({
  classroom: {
    getClassrooms: vi.fn((_req, res) => res.status(200).json({ ok: true })),
    createClassroom: vi.fn((_req, res) => res.status(204).end()),
    getAvailableClassrooms: vi.fn((_req, res) => res.status(200).json({ ok: true })),
    getClassroomById: vi.fn((_req, res) => res.status(200).json({ ok: true })),
    updateClassroom: vi.fn((_req, res) => res.status(204).end()),
  },
  schedule: {
    createSchedule: vi.fn((_req, res) => res.status(204).end()),
    validateSchedule: vi.fn((_req, res) => res.status(204).end()),
    getSchedules: vi.fn((_req, res) => res.status(200).json({ ok: true })),
    getScheduleById: vi.fn((_req, res) => res.status(200).json({ ok: true })),
    updateSchedule: vi.fn((_req, res) => res.status(204).end()),
    deleteSchedule: vi.fn((_req, res) => res.status(204).end()),
  },
  rule: {
    setSchedulingRule: vi.fn((_req, res) => res.status(204).end()),
    getRulesList: vi.fn((_req, res) => res.status(200).json({ ok: true })),
    getRuleById: vi.fn((_req, res) => res.status(200).json({ ok: true })),
    deleteRule: vi.fn((_req, res) => res.status(204).end()),
    batchDeleteRules: vi.fn((_req, res) => res.status(204).end()),
    getSchedulingOverview: vi.fn((_req, res) => res.status(200).json({ ok: true })),
  },
  autoSchedule: {
    createAutoTask: vi.fn((_req, res) => res.status(204).end()),
    getTaskStatus: vi.fn((_req, res) => res.status(200).json({ ok: true })),
    getTaskPreview: vi.fn((_req, res) => res.status(200).json({ ok: true })),
    applyTask: vi.fn((_req, res) => res.status(204).end()),
  },
}))

vi.mock('../../../modules/course-arrangement/classroom/classroom.controller.js', () => ({
  ...controllerMocks.classroom,
}))

vi.mock('../../../modules/course-arrangement/schedule/schedule.controller.js', () => ({
  ...controllerMocks.schedule,
}))

vi.mock('../../../modules/course-arrangement/rules/rule.controller.js', () => ({
  ...controllerMocks.rule,
}))

vi.mock('../../../modules/course-arrangement/auto-schedule/auto-schedule.controller.js', () => ({
  ...controllerMocks.autoSchedule,
}))

function tokenWithRoles(roles: string[]) {
  return jwt.sign(
    {
      userId: 'user-1',
      username: roles[0] ?? 'user',
      roles,
    },
    config.jwt.secret,
    { expiresIn: '1h' }
  )
}

type Method = 'get' | 'post' | 'patch' | 'delete'
type Handler = (req: Request, res: Response, next: NextFunction) => unknown
type RouterLayer = {
  handle?: Handler
  route?: {
    path: string
    methods: Partial<Record<Method, boolean>>
    stack: Array<{ handle: Handler }>
  }
}
type TestRouter = { stack: RouterLayer[] }

function mockReq(roles: string[]): Request {
  return {
    headers: { authorization: `Bearer ${tokenWithRoles(roles)}` },
  } as Request
}

function mockRes(): Response & { body?: unknown; ended?: boolean; statusCode: number } {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    ended: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      this.ended = true
      return this
    },
    end() {
      this.ended = true
      return this
    },
  }
  return res as Response & { body?: unknown; ended?: boolean; statusCode: number }
}

async function runRoute(router: Router, method: Method, routePath: string, roles: string[]) {
  const req = mockReq(roles)
  const res = mockRes()
  const layers = (router as unknown as TestRouter).stack
  const routeLayer = layers.find(
    (layer) => layer.route?.path === routePath && layer.route.methods[method]
  )

  if (!routeLayer?.route) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${routePath}`)
  }

  const handlers = [
    ...layers
      .filter((layer) => !layer.route)
      .map((layer) => layer.handle)
      .filter(Boolean),
    ...routeLayer.route.stack.map((layer) => layer.handle),
  ] as Handler[]

  for (const handler of handlers) {
    let nextCalled = false
    await handler(req, res, () => {
      nextCalled = true
    })
    if (!nextCalled || res.ended) break
  }

  return res
}

describe('B 组排课写接口角色鉴权', () => {
  const protectedWrites = [
    ['post', classroomRoutes, '/', controllerMocks.classroom.createClassroom],
    ['patch', classroomRoutes, '/:id', controllerMocks.classroom.updateClassroom],
    ['post', scheduleRoutes, '/', controllerMocks.schedule.createSchedule],
    ['post', scheduleRoutes, '/validate', controllerMocks.schedule.validateSchedule],
    ['patch', scheduleRoutes, '/:id', controllerMocks.schedule.updateSchedule],
    ['delete', scheduleRoutes, '/:id', controllerMocks.schedule.deleteSchedule],
    ['post', ruleRoutes, '/', controllerMocks.rule.setSchedulingRule],
    ['delete', ruleRoutes, '/:id', controllerMocks.rule.deleteRule],
    ['post', ruleRoutes, '/batch-delete', controllerMocks.rule.batchDeleteRules],
    ['post', autoScheduleRoutes, '/tasks', controllerMocks.autoSchedule.createAutoTask],
    ['post', autoScheduleRoutes, '/tasks/:taskId/apply', controllerMocks.autoSchedule.applyTask],
  ] as const

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(protectedWrites)('%s %s 应拒绝 student 写操作', async (method, router, path, handler) => {
    const response = await runRoute(router, method, path, ['student'])

    expect(response.statusCode).toBe(403)
    expect(response.body).toEqual(expect.objectContaining({ code: 403, message: '权限不足' }))
    expect(handler).not.toHaveBeenCalled()
  })

  it.each(protectedWrites)('%s %s 应拒绝 teacher 写操作', async (method, router, path, handler) => {
    const response = await runRoute(router, method, path, ['teacher'])

    expect(response.statusCode).toBe(403)
    expect(response.body).toEqual(expect.objectContaining({ code: 403, message: '权限不足' }))
    expect(handler).not.toHaveBeenCalled()
  })

  it.each(protectedWrites)(
    '%s %s 应允许 admin 写操作进入控制器',
    async (method, router, path, handler) => {
      const response = await runRoute(router, method, path, ['admin'])

      expect(response.statusCode).toBe(204)
      expect(handler).toHaveBeenCalledOnce()
    }
  )

  it('读接口仍允许普通登录用户访问', async () => {
    const response = await runRoute(classroomRoutes, 'get', '/', ['student'])

    expect(response.statusCode).toBe(200)
    expect(controllerMocks.classroom.getClassrooms).toHaveBeenCalledOnce()
  })
})
