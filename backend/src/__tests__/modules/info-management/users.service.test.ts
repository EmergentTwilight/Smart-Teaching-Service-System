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
          create: prismaMock.user.create,
          update: prismaMock.user.update,
          updateMany: prismaMock.user.updateMany,
        },
        userRole: {
          createMany: prismaMock.userRole.createMany,
          delete: prismaMock.userRole.delete,
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

      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // user1 username check
        .mockResolvedValueOnce(null) // user1 email check
        .mockResolvedValueOnce(null) // user2 username check

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
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        username: 'existing',
      })

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

      // First call: username check passes (null)
      // Second call: email check finds existing -> throws ConflictError
      prismaMock.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'existing-user',
        email: 'existing@example.com',
      })

      await expect(usersService.batchCreateUsers({ users })).rejects.toBeInstanceOf(ConflictError)
    })

    it('部分失败时事务应该回滚', async () => {
      const users = [
        {
          username: 'user1',
          password: 'Password123',
          realName: '用户一',
        },
        {
          username: 'existing',
          password: 'Password123',
          realName: '已存在用户',
        },
      ]

      // Setup sequential mocks for findUnique and create
      // user1: findUnique(null) -> create success -> user2: findUnique(existing)
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // user1 username check - not found
        .mockResolvedValueOnce({ id: 'existing-user', username: 'existing' }) // user2 username check - found!

      // user1 create succeeds
      prismaMock.user.create.mockResolvedValueOnce({
        id: 'new-user-1',
        username: 'user1',
        email: null,
        phone: null,
        realName: '用户一',
        gender: null,
        status: 'ACTIVE',
      })

      // user2 conflicts -> throws ConflictError inside transaction
      await expect(usersService.batchCreateUsers({ users })).rejects.toBeInstanceOf(ConflictError)
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
        where: { id: { in: ['role-1', 'role-2'] } },
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
      prismaMock.userRole.findUnique.mockResolvedValue({
        userId: 'user-1',
        roleId: 'role-1',
      })
      prismaMock.userRole.delete.mockResolvedValue({ userId: 'user-1', roleId: 'role-1' })
      prismaMock.user.findUnique.mockResolvedValue(user)

      const result = await usersService.revokeRole('user-1', 'role-1')

      expect(prismaMock.userRole.findUnique).toHaveBeenCalledWith({
        where: { userId_roleId: { userId: 'user-1', roleId: 'role-1' } },
      })
      expect(prismaMock.userRole.delete).toHaveBeenCalledWith({
        where: { userId_roleId: { userId: 'user-1', roleId: 'role-1' } },
      })
      expect(result.id).toBe('user-1')
    })

    it('用户未分配该角色应该抛出 NotFoundError', async () => {
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
