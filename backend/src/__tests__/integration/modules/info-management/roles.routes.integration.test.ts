/**
 * 角色权限管理路由集成测试
 * 按 docs/apis/A-information-management.md 的角色权限 API 契约验证路由行为
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rolesRoutes, { permissionsRouter } from '../../../../modules/info-management/roles.routes.js'
import { errorHandler } from '../../../../shared/middleware/error.js'
import config from '../../../../config/index.js'

function createTestApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/v1/roles', rolesRoutes)
  app.use('/api/v1/permissions', permissionsRouter)
  app.use(errorHandler)
  return app
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://stss:stss_dev_2026@localhost:5432/stss?schema=public',
    },
  },
})

async function cleanupRolesData() {
  await prisma.systemLog.deleteMany({
    where: {
      OR: [
        { resourceId: { startsWith: 'itest_role_' } },
        { user: { username: { startsWith: 'itest_role_' } } },
      ],
    },
  })
  await prisma.userRole.deleteMany({
    where: {
      OR: [
        { role: { code: { startsWith: 'itest_role_' } } },
        { user: { username: { startsWith: 'itest_role_' } } },
      ],
    },
  })
  await prisma.rolePermission.deleteMany({
    where: {
      OR: [
        { role: { code: { startsWith: 'itest_role_' } } },
        { permission: { code: { startsWith: 'itest_role_' } } },
      ],
    },
  })
  await prisma.role.deleteMany({
    where: { code: { startsWith: 'itest_role_' } },
  })
  await prisma.permission.deleteMany({
    where: { code: { startsWith: 'itest_role_' } },
  })
  await prisma.user.deleteMany({
    where: { username: { startsWith: 'itest_role_' } },
  })
}

async function ensureBaseRole(code: string, name: string) {
  return prisma.role.upsert({
    where: { code },
    update: {},
    create: {
      code,
      name,
      description: `${name} role`,
    },
  })
}

async function createUserWithRole(roleCode: 'admin' | 'super_admin' | 'student') {
  const role = await ensureBaseRole(roleCode, roleCode)
  const username = `itest_role_${roleCode}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: await bcrypt.hash('Password123', 10),
      email: `${username}@test.com`,
      realName: '角色测试用户',
      status: 'ACTIVE',
      userRoles: {
        create: {
          roleId: role.id,
        },
      },
    },
  })

  return user
}

function generateTestToken(userId: string, username: string, roles: string[]) {
  return jwt.sign(
    {
      userId,
      username,
      roles,
      type: 'access',
    },
    config.jwt.secret,
    { expiresIn: '2h' }
  )
}

async function createTestPermission() {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  return prisma.permission.create({
    data: {
      code: `itest_role_permission_${suffix}`,
      name: '测试权限',
      resource: 'itest_role_resource',
      action: 'read',
    },
  })
}

beforeAll(async () => {
  await prisma.$connect()
  await ensureBaseRole('admin', 'Administrator')
  await ensureBaseRole('super_admin', 'Super Administrator')
  await ensureBaseRole('student', 'Student')
  await cleanupRolesData()
})

beforeEach(async () => {
  await cleanupRolesData()
})

describe('GET /api/v1/roles', () => {
  const app = createTestApp()

  it('管理员应该能获取角色列表并返回 user_count 和 permissions', async () => {
    const admin = await createUserWithRole('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])

    const response = await request(app)
      .get('/api/v1/roles?builtin=true')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.code).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        code: expect.any(String),
        name: expect.any(String),
        builtin: true,
        user_count: expect.any(Number),
        permissions: expect.any(Array),
      })
    )
  })

  it('普通用户应该被拒绝访问角色列表', async () => {
    const user = await createUserWithRole('student')
    const token = generateTestToken(user.id, user.username, ['student'])

    const response = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)

    expect(response.body.message).toContain('权限不足')
  })
})

describe('POST /api/v1/roles', () => {
  const app = createTestApp()

  it('超级管理员应该能按文档使用 permission_ids 创建角色', async () => {
    const superAdmin = await createUserWithRole('super_admin')
    const token = generateTestToken(superAdmin.id, superAdmin.username, ['super_admin'])
    const permission = await createTestPermission()
    const roleCode = `itest_role_created_${Date.now()}`

    const response = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: roleCode,
        name: '测试创建角色',
        description: '用于集成测试',
        permission_ids: [permission.id],
      })
      .expect(201)

    expect(response.body.message).toBe('角色创建成功')
    expect(response.body.data).toEqual(
      expect.objectContaining({
        code: roleCode,
        name: '测试创建角色',
      })
    )

    const savedRole = await prisma.role.findUnique({
      where: { code: roleCode },
      include: { permissions: true },
    })
    expect(savedRole?.permissions).toHaveLength(1)
  })

  it('管理员不应该能创建角色', async () => {
    const admin = await createUserWithRole('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])

    const response = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: `itest_role_forbidden_${Date.now()}`,
        name: '无权限角色',
      })
      .expect(403)

    expect(response.body.message).toContain('权限不足')
  })
})

describe('GET /api/v1/permissions', () => {
  const app = createTestApp()

  it('管理员应该能按 resource/action 查询权限列表', async () => {
    const admin = await createUserWithRole('admin')
    const token = generateTestToken(admin.id, admin.username, ['admin'])
    const permission = await createTestPermission()

    const response = await request(app)
      .get('/api/v1/permissions?resource=itest_role_resource&action=read')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data).toContainEqual(
      expect.objectContaining({
        id: permission.id,
        code: permission.code,
        resource: 'itest_role_resource',
        action: 'read',
      })
    )
  })
})

describe('POST /api/v1/roles/:id/permissions', () => {
  const app = createTestApp()

  it('超级管理员应该能按文档使用 permission_ids 给角色分配权限', async () => {
    const superAdmin = await createUserWithRole('super_admin')
    const token = generateTestToken(superAdmin.id, superAdmin.username, ['super_admin'])
    const role = await prisma.role.create({
      data: {
        code: `itest_role_assign_${Date.now()}`,
        name: '测试分配权限角色',
      },
    })
    const permission = await createTestPermission()

    const response = await request(app)
      .post(`/api/v1/roles/${role.id}/permissions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ permission_ids: [permission.id] })
      .expect(200)

    expect(response.body.data).toEqual({
      role_id: role.id,
      added_count: 1,
    })
  })
})

describe('DELETE /api/v1/roles/:id', () => {
  const app = createTestApp()

  it('不应该允许删除系统内置角色', async () => {
    const superAdmin = await createUserWithRole('super_admin')
    const token = generateTestToken(superAdmin.id, superAdmin.username, ['super_admin'])
    const builtinRole = await ensureBaseRole('student', 'Student')

    const response = await request(app)
      .delete(`/api/v1/roles/${builtinRole.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409)

    expect(response.body.message).toContain('系统内置角色不可删除')
  })
})

afterAll(async () => {
  await cleanupRolesData()
  await prisma.$disconnect()
})
