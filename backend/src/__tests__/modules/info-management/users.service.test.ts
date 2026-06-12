import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError, NotFoundError, ValidationError } from '@stss/shared'
import type { Gender, UserStatus } from '@prisma/client'

// Mock comparePassword from password utils
const passwordMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
}))

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
  },
  role: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  userRole: {
    create: vi.fn(),
    createMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  permission: {
    findMany: vi.fn(),
  },
  refreshToken: {
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  systemLog: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

vi.mock('../../../shared/utils/password.js', () => ({
  hashPassword: passwordMock.hashPassword,
  comparePassword: passwordMock.comparePassword,
}))

import { usersService } from '../../../modules/info-management/users.service.js'

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    username: 'alice',
    passwordHash: 'stored-hash',
    email: 'alice@example.com',
    phone: '13800000000',
    realName: 'Alice',
    avatarUrl: 'https://example.com/avatar.png',
    gender: 'FEMALE' as Gender,
    status: 'ACTIVE' as UserStatus,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function buildUserWithRoles(overrides: Record<string, unknown> = {}) {
  return {
    ...buildUser(overrides),
    userRoles: [
      {
        role: {
          id: 'role-1',
          code: 'student',
          name: '学生',
          permissions: [
            { permission: { code: 'course:read' } },
            { permission: { code: 'profile:update' } },
          ],
        },
      },
    ],
    student: null,
    teacher: null,
    admin: null,
  }
}

function buildRole(overrides: Record<string, unknown> = {}) {
  return {
    id: 'role-1',
    code: 'student',
    name: '学生',
    description: '学生角色',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()

  passwordMock.hashPassword.mockImplementation(async (password: string) => `hashed:${password}`)
  passwordMock.comparePassword.mockResolvedValue(true)

  // Default $transaction implementation
  prismaMock.$transaction.mockImplementation(async (input: unknown) => {
    if (typeof input === 'function') {
      // For callback-style transactions, provide a tx mock
      const tx = {
        user: {
          findUnique: prismaMock.user.findUnique,
          findMany: prismaMock.user.findMany,
          create: prismaMock.user.create,
          update: prismaMock.user.update,
          updateMany: prismaMock.user.updateMany,
        },
        userRole: {
          createMany: prismaMock.userRole.createMany,
          delete: prismaMock.userRole.delete,
          deleteMany: prismaMock.userRole.deleteMany,
        },
        refreshToken: {
          updateMany: prismaMock.refreshToken.updateMany,
        },
      }
      return input(tx)
    }
    // For array-style transactions
    return Promise.all(input as Promise<unknown>[])
  })
})

describe('UsersService', () => {
  // ==================== getUsers ====================
  describe('getUsers', () => {
    it('应该成功获取用户列表（分页）', async () => {
      const users = [
        {
          ...buildUser({ id: 'user-1' }),
          userRoles: [{ role: { code: 'student', name: '学生' } }],
        },
        {
          ...buildUser({ id: 'user-2', username: 'bob', realName: 'Bob' }),
          userRoles: [{ role: { code: 'teacher', name: '教师' } }],
        },
      ]

      prismaMock.user.findMany.mockResolvedValue(users)
      prismaMock.user.count.mockResolvedValue(2)

      const result = await usersService.getUsers({
        page: 1,
        pageSize: 10,
      })

      expect(result.items).toHaveLength(2)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.pageSize).toBe(10)
      expect(result.pagination.total).toBe(2)
      expect(result.pagination.totalPages).toBe(1)
      expect(result.items[0].roles).toContain('student')
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('应该支持按关键词搜索', async () => {
      const users = [buildUser({ id: 'user-1', username: 'alice' })]

      prismaMock.user.findMany.mockResolvedValue(
        users.map((u) => ({ ...u, userRoles: [{ role: { code: 'student', name: '学生' } }] }))
      )
      prismaMock.user.count.mockResolvedValue(1)

      const result = await usersService.getUsers({
        page: 1,
        pageSize: 10,
        keyword: 'alice',
      })

      expect(result.items).toHaveLength(1)
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { username: { contains: 'alice' } },
              { realName: { contains: 'alice' } },
              { email: { contains: 'alice' } },
            ],
          },
        })
      )
    })

    it('应该支持按状态筛选', async () => {
      const users = [buildUser({ id: 'user-1', status: 'ACTIVE' })]

      prismaMock.user.findMany.mockResolvedValue(
        users.map((u) => ({ ...u, userRoles: [{ role: { code: 'student', name: '学生' } }] }))
      )
      prismaMock.user.count.mockResolvedValue(1)

      const result = await usersService.getUsers({
        page: 1,
        pageSize: 10,
        status: 'ACTIVE',
      })

      expect(result.items).toHaveLength(1)
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
        })
      )
    })

    it('应该支持按角色筛选', async () => {
      const users = [buildUser({ id: 'user-1' })]

      prismaMock.user.findMany.mockResolvedValue(
        users.map((u) => ({ ...u, userRoles: [{ role: { code: 'teacher', name: '教师' } }] }))
      )
      prismaMock.user.count.mockResolvedValue(1)

      const result = await usersService.getUsers({
        page: 1,
        pageSize: 10,
        role: 'teacher',
      })

      expect(result.items).toHaveLength(1)
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userRoles: {
              some: {
                role: {
                  code: 'teacher',
                },
              },
            },
          },
        })
      )
    })
  })

  // ==================== getUserById ====================
  describe('getUserById', () => {
    it('应该成功获取用户详情', async () => {
      const user = buildUserWithRoles()

      prismaMock.user.findUnique.mockResolvedValue(user)

      const result = await usersService.getUserById('user-1')

      expect(result.id).toBe('user-1')
      expect(result.username).toBe('alice')
      expect(result.email).toBe('alice@example.com')
      expect(result.roles).toContain('student')
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
          student: true,
          teacher: true,
          admin: true,
        },
      })
    })

    it('用户不存在应该抛出 NotFoundError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(usersService.getUserById('missing-user')).rejects.toBeInstanceOf(NotFoundError)
      await expect(usersService.getUserById('missing-user')).rejects.toThrow('用户不存在')
    })
  })

  // ==================== createUser ====================
  describe('createUser', () => {
    it('应该成功创建用户', async () => {
      // createUser 内部调用顺序:
      // 1. findUnique (username check)
      // 2. findUnique (email check)
      // 3. user.create
      // 4. userRole.createMany (如果有 roleIds)
      // 5. getUserById -> findUnique (获取创建的用户)
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // username check - 不存在
        .mockResolvedValueOnce(null) // email check - 不存在
        .mockResolvedValueOnce(buildUserWithRoles({ id: 'new-user' })) // getUserById

      prismaMock.user.create.mockResolvedValue(buildUser({ id: 'new-user' }))
      prismaMock.userRole.createMany.mockResolvedValue({ count: 1 })

      const result = await usersService.createUser({
        username: 'newuser',
        password: 'Password123',
        realName: 'New User',
        email: 'newuser@example.com',
        roleIds: ['role-1'],
      })

      expect(result.id).toBe('new-user')
      expect(passwordMock.hashPassword).toHaveBeenCalledWith('Password123')
    })

    it('用户名冲突时应该抛出 ConflictError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser()) // username exists

      await expect(
        usersService.createUser({
          username: 'alice',
          password: 'Password123',
          realName: 'Alice',
        })
      ).rejects.toBeInstanceOf(ConflictError)
    })

    it('邮箱冲突时应该抛出 ConflictError', async () => {
      // createUser 内部调用顺序:
      // 1. findUnique (username check) - 不存在
      // 2. findUnique (email check) - 存在，抛出 ConflictError
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // username check - 不存在
        .mockResolvedValueOnce(buildUser({ email: 'existing@example.com' })) // email check - 冲突

      await expect(
        usersService.createUser({
          username: 'newuser',
          password: 'Password123',
          realName: 'New User',
          email: 'existing@example.com',
        })
      ).rejects.toBeInstanceOf(ConflictError)
    })
  })

  // ==================== updateUser ====================
  describe('updateUser', () => {
    it('应该成功更新用户基本信息', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(buildUser()) // user exists check
        .mockResolvedValueOnce(buildUserWithRoles()) // getUserById
      prismaMock.user.update.mockResolvedValue(buildUser({ realName: 'Updated Name' }))
      prismaMock.userRole.deleteMany.mockResolvedValue({ count: 1 })

      const result = await usersService.updateUser('user-1', {
        realName: 'Updated Name',
      })

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { realName: 'Updated Name', email: undefined, gender: undefined },
      })
      expect(result.id).toBe('user-1')
    })

    it('用户不存在应该抛出 NotFoundError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(
        usersService.updateUser('missing-user', { realName: 'Updated Name' })
      ).rejects.toBeInstanceOf(NotFoundError)
      await expect(
        usersService.updateUser('missing-user', { realName: 'Updated Name' })
      ).rejects.toThrow('用户不存在')
    })

    it('邮箱冲突时应该抛出 ConflictError', async () => {
      // updateUser 内部调用顺序:
      // 1. findUnique (user exists check)
      // 2. findUnique (email conflict check)
      prismaMock.user.findUnique
        .mockResolvedValueOnce(buildUser({ email: 'old@example.com' })) // user exists
        .mockResolvedValueOnce(buildUser({ email: 'existing@example.com' })) // email conflict

      await expect(
        usersService.updateUser('user-1', { email: 'existing@example.com' })
      ).rejects.toBeInstanceOf(ConflictError)
    })
  })

  // ==================== deleteUser ====================
  describe('deleteUser', () => {
    it('应该成功删除用户', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser())
      prismaMock.user.delete.mockResolvedValue(buildUser())

      await usersService.deleteUser('user-1')

      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      })
    })

    it('用户不存在应该抛出 NotFoundError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(usersService.deleteUser('missing-user')).rejects.toBeInstanceOf(NotFoundError)
      await expect(usersService.deleteUser('missing-user')).rejects.toThrow('用户不存在')
    })
  })

  // ==================== getLogs ====================
  describe('getLogs', () => {
    const buildLog = (overrides: Record<string, unknown> = {}) => ({
      id: BigInt(1),
      userId: 'user-1',
      action: 'user.login',
      resourceType: 'user',
      resourceId: 'user-1',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      details: null,
      createdAt: new Date('2026-01-01'),
      user: {
        id: 'user-1',
        username: 'alice',
        realName: 'Alice',
      },
      ...overrides,
    })

    it('应该成功获取日志列表', async () => {
      const logs = [buildLog(), buildLog({ id: BigInt(2), action: 'user.logout' })]

      prismaMock.systemLog.findMany.mockResolvedValue(logs)
      prismaMock.systemLog.count.mockResolvedValue(2)

      const result = await usersService.getLogs({
        page: 1,
        pageSize: 10,
      })

      expect(result.items).toHaveLength(2)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.total).toBe(2)
      expect(result.items[0].username).toBe('alice')
      expect(prismaMock.systemLog.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('应该支持按用户筛选', async () => {
      const logs = [buildLog()]

      prismaMock.systemLog.findMany.mockResolvedValue(logs)
      prismaMock.systemLog.count.mockResolvedValue(1)

      const result = await usersService.getLogs({
        page: 1,
        pageSize: 10,
        userId: 'user-1',
      })

      expect(result.items).toHaveLength(1)
      expect(prismaMock.systemLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        })
      )
    })

    it('应该支持按操作类型筛选', async () => {
      const logs = [buildLog({ action: 'user.login' })]

      prismaMock.systemLog.findMany.mockResolvedValue(logs)
      prismaMock.systemLog.count.mockResolvedValue(1)

      const result = await usersService.getLogs({
        page: 1,
        pageSize: 10,
        action: 'login',
      })

      expect(result.items).toHaveLength(1)
      expect(prismaMock.systemLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action: { contains: 'login' } },
        })
      )
    })
  })

  // ==================== batchCreateUsers ====================
  describe('batchCreateUsers', () => {
    it('应该成功批量创建用户', async () => {
      const users = [
        {
          username: 'user1',
          password: 'Password123',
          realName: '用户一',
          email: 'user1@example.com',
          roleIds: ['role-1'],
        },
        {
          username: 'user2',
          password: 'Password456',
          realName: '用户二',
        },
      ]

      // Mock 批量查询：用户名不存在
      prismaMock.user.findMany
        .mockResolvedValueOnce([]) // username check
        .mockResolvedValueOnce([]) // email check (after filter)

      prismaMock.user.create
        .mockResolvedValueOnce({
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          phone: null,
          realName: '用户一',
          gender: null,
          status: 'ACTIVE',
        })
        .mockResolvedValueOnce({
          id: 'user-2',
          username: 'user2',
          email: null,
          phone: null,
          realName: '用户二',
          gender: null,
          status: 'ACTIVE',
        })

      prismaMock.userRole.createMany.mockResolvedValue({ count: 1 })

      const result = await usersService.batchCreateUsers({ users })

      expect(result.success).toBe(true)
      expect(result.created_count).toBe(2)
      expect(result.users).toHaveLength(2)
      expect(result.users[0].username).toBe('user1')
      expect(result.users[1].username).toBe('user2')
      expect(passwordMock.hashPassword).toHaveBeenCalledTimes(2)
    })

    it('用户名冲突时应该抛出 ConflictError', async () => {
      const users = [
        {
          username: 'existing',
          password: 'Password123',
          realName: '已存在用户',
        },
      ]

      // Mock finds existing user -> throws ConflictError
      prismaMock.user.findMany.mockResolvedValue([{ username: 'existing' }])

      await expect(usersService.batchCreateUsers({ users })).rejects.toBeInstanceOf(ConflictError)
    })

    it('邮箱冲突时应该抛出 ConflictError', async () => {
      const users = [
        {
          username: 'newuser',
          password: 'Password123',
          realName: '新用户',
          email: 'existing@example.com',
        },
      ]

      // username check passes (empty array), email check finds existing
      prismaMock.user.findMany
        .mockResolvedValueOnce([]) // username check - no conflicts
        .mockResolvedValueOnce([{ email: 'existing@example.com' }]) // email check - conflict

      await expect(usersService.batchCreateUsers({ users })).rejects.toBeInstanceOf(ConflictError)
    })

    it('超过100个用户时应该抛出 ValidationError', async () => {
      const users = Array(101)
        .fill(null)
        .map((_, i) => ({
          username: `user${i}`,
          password: 'Password123',
          realName: `用户${i}`,
        }))

      await expect(usersService.batchCreateUsers({ users })).rejects.toBeInstanceOf(ValidationError)
    })
  })

  // ==================== batchUpdateStatus ====================
  describe('batchUpdateStatus', () => {
    it('应该成功批量更新用户状态', async () => {
      const userIds = ['user-1', 'user-2']
      const status: UserStatus = 'INACTIVE'

      prismaMock.user.findMany.mockResolvedValue([
        buildUser({ id: 'user-1' }),
        buildUser({ id: 'user-2' }),
      ])
      prismaMock.user.updateMany.mockResolvedValue({ count: 2 })

      const result = await usersService.batchUpdateStatus({ userIds, status })

      expect(result.updated_count).toBe(2)
      expect(result.failed_count).toBe(0)
      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: userIds } },
        data: { status },
      })
    })

    it('空数组时应该返回更新0条记录', async () => {
      prismaMock.user.findMany.mockResolvedValue([])

      const result = await usersService.batchUpdateStatus({ userIds: [], status: 'INACTIVE' })
      expect(result.updated_count).toBe(0)
      expect(result.failed_count).toBe(0)
    })

    it('不存在的用户应该抛出 NotFoundError', async () => {
      const userIds = ['user-1', 'missing-user']
      const status: UserStatus = 'BANNED'

      prismaMock.user.findMany.mockResolvedValue([buildUser({ id: 'user-1' })])

      await expect(usersService.batchUpdateStatus({ userIds, status })).rejects.toBeInstanceOf(
        NotFoundError
      )
      await expect(usersService.batchUpdateStatus({ userIds, status })).rejects.toThrow(
        '用户不存在: missing-user'
      )
    })

    it('超过100个用户时应该抛出 ValidationError', async () => {
      const userIds = Array(101)
        .fill(null)
        .map((_, i) => `user-${i}`)
      const status: UserStatus = 'BANNED'

      await expect(usersService.batchUpdateStatus({ userIds, status })).rejects.toBeInstanceOf(
        ValidationError
      )
    })
  })

  // ==================== changePassword ====================
  describe('changePassword', () => {
    it('应该成功修改密码', async () => {
      const user = buildUser()
      prismaMock.user.findUnique.mockResolvedValue(user)
      prismaMock.user.update.mockResolvedValue({ ...user, passwordHash: 'hashed:newPassword' })
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 })

      await usersService.changePassword('user-1', {
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
      })

      expect(passwordMock.comparePassword).toHaveBeenCalledWith('OldPassword123', 'stored-hash')
      expect(passwordMock.hashPassword).toHaveBeenCalledWith('NewPassword123')
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'hashed:NewPassword123' },
      })
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isUsed: true },
      })
    })

    it('用户不存在应该抛出 NotFoundError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(
        usersService.changePassword('missing-user', {
          oldPassword: 'OldPassword123',
          newPassword: 'NewPassword123',
        })
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('旧密码错误应该抛出 ValidationError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser())
      passwordMock.comparePassword.mockResolvedValue(false)

      await expect(
        usersService.changePassword('user-1', {
          oldPassword: 'WrongPassword123',
          newPassword: 'NewPassword123',
        })
      ).rejects.toBeInstanceOf(ValidationError)
      await expect(
        usersService.changePassword('user-1', {
          oldPassword: 'WrongPassword123',
          newPassword: 'NewPassword123',
        })
      ).rejects.toThrow('旧密码错误')
    })
  })

  // ==================== resetPassword ====================
  describe('resetPassword', () => {
    it('应该成功重置密码', async () => {
      const user = buildUser()
      prismaMock.user.findUnique.mockResolvedValue(user)
      prismaMock.user.update.mockResolvedValue({ ...user, passwordHash: 'hashed:newPassword' })
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 })

      await usersService.resetPassword('user-1', {
        newPassword: 'NewPassword123',
      })

      expect(passwordMock.hashPassword).toHaveBeenCalledWith('NewPassword123')
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'hashed:NewPassword123' },
      })
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isUsed: true },
      })
    })

    it('用户不存在应该抛出 NotFoundError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(
        usersService.resetPassword('missing-user', {
          newPassword: 'NewPassword123',
        })
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  // ==================== updateStatus ====================
  describe('updateStatus', () => {
    it('应该成功修改用户状态', async () => {
      const user = buildUserWithRoles()
      prismaMock.user.findUnique
        .mockResolvedValueOnce(buildUser()) // updateStatus check
        .mockResolvedValueOnce(user) // getUserById
      prismaMock.user.update.mockResolvedValue(buildUser({ status: 'INACTIVE' }))

      const result = await usersService.updateStatus('user-1', { status: 'INACTIVE' })

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: 'INACTIVE' },
      })
      expect(result.id).toBe('user-1')
    })

    it('用户不存在应该抛出 NotFoundError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(
        usersService.updateStatus('missing-user', { status: 'INACTIVE' })
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  // ==================== assignRoles ====================
  describe('assignRoles', () => {
    it('应该成功分配角色', async () => {
      const user = buildUserWithRoles()
      prismaMock.user.findUnique
        .mockResolvedValueOnce(buildUser()) // assignRoles check
        .mockResolvedValueOnce(user) // getUserById
      prismaMock.role.findMany.mockResolvedValue([
        buildRole({ id: 'role-1' }),
        buildRole({ id: 'role-2', code: 'teacher' }),
      ])
      prismaMock.userRole.createMany.mockResolvedValue({ count: 2 })

      const result = await usersService.assignRoles('user-1', {
        roleIds: ['role-1', 'role-2'],
      })

      expect(prismaMock.role.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ id: { in: ['role-1', 'role-2'] } }, { code: { in: ['role-1', 'role-2'] } }],
        },
      })
      expect(prismaMock.userRole.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-1', roleId: 'role-1' },
          { userId: 'user-1', roleId: 'role-2' },
        ],
      })
      expect(result.id).toBe('user-1')
    })

    it('用户不存在应该抛出 NotFoundError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(
        usersService.assignRoles('missing-user', { roleIds: ['role-1'] })
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('角色不存在应该抛出 NotFoundError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser())
      prismaMock.role.findMany.mockResolvedValue([buildRole({ id: 'role-1' })])

      await expect(
        usersService.assignRoles('user-1', { roleIds: ['role-1', 'missing-role'] })
      ).rejects.toBeInstanceOf(NotFoundError)
      await expect(
        usersService.assignRoles('user-1', { roleIds: ['role-1', 'missing-role'] })
      ).rejects.toThrow('角色不存在: missing-role')
    })
  })

  // ==================== revokeRole ====================
  describe('revokeRole', () => {
    it('应该成功撤销角色', async () => {
      const user = buildUserWithRoles()
      prismaMock.role.findFirst.mockResolvedValue({ id: 'role-1', code: 'admin', name: '管理员' })
      prismaMock.userRole.findUnique.mockResolvedValue({
        userId: 'user-1',
        roleId: 'role-1',
      })
      prismaMock.userRole.delete.mockResolvedValue({ userId: 'user-1', roleId: 'role-1' })
      prismaMock.user.findUnique.mockResolvedValue(user)

      const result = await usersService.revokeRole('user-1', 'role-1')

      expect(prismaMock.role.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ id: 'role-1' }, { code: 'role-1' }] },
      })
      expect(prismaMock.userRole.findUnique).toHaveBeenCalledWith({
        where: { userId_roleId: { userId: 'user-1', roleId: 'role-1' } },
      })
      expect(prismaMock.userRole.delete).toHaveBeenCalledWith({
        where: { userId_roleId: { userId: 'user-1', roleId: 'role-1' } },
      })
      expect(result.id).toBe('user-1')
    })

    it('用户未分配该角色应该抛出 NotFoundError', async () => {
      prismaMock.role.findFirst.mockResolvedValue({ id: 'role-1', code: 'admin', name: '管理员' })
      prismaMock.userRole.findUnique.mockResolvedValue(null)

      await expect(usersService.revokeRole('user-1', 'role-1')).rejects.toBeInstanceOf(
        NotFoundError
      )
      await expect(usersService.revokeRole('user-1', 'role-1')).rejects.toThrow('用户未分配此角色')
    })
  })

  // ==================== getUserPermissions ====================
  describe('getUserPermissions', () => {
    it('应该成功获取用户权限列表', async () => {
      const user = {
        ...buildUser(),
        userRoles: [
          {
            role: {
              id: 'role-1',
              code: 'student',
              permissions: [
                { permission: { code: 'course:read' } },
                { permission: { code: 'profile:update' } },
              ],
            },
          },
          {
            role: {
              id: 'role-2',
              code: 'teacher',
              permissions: [
                { permission: { code: 'course:write' } },
                { permission: { code: 'course:read' } }, // 重复权限
              ],
            },
          },
        ],
      }

      prismaMock.user.findUnique.mockResolvedValue(user)

      const result = await usersService.getUserPermissions('user-1')

      expect(result.user_id).toBe('user-1')
      expect(result.username).toBe('alice')
      expect(result.permissions).toContain('course:read')
      expect(result.permissions).toContain('profile:update')
      expect(result.permissions).toContain('course:write')
      // 去重后应该是3个，不是4个
      expect(result.permissions).toHaveLength(3)
    })

    it('用户不存在应该抛出 NotFoundError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(usersService.getUserPermissions('missing-user')).rejects.toBeInstanceOf(
        NotFoundError
      )
    })

    it('无权限时应该返回空数组', async () => {
      const user = {
        ...buildUser(),
        userRoles: [], // 无角色
      }

      prismaMock.user.findUnique.mockResolvedValue(user)

      const result = await usersService.getUserPermissions('user-1')

      expect(result.user_id).toBe('user-1')
      expect(result.permissions).toEqual([])
    })
  })
})
