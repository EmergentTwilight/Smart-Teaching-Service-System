/**
 * 用户管理控制器单元测试
 * 测试用户 CRUD 相关的 HTTP 请求处理
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from '@stss/shared'

// 使用 vi.hoisted() 来确保 mock 函数在 mock 提升之前被初始化
const { mockSuccess, mockPaginated } = vi.hoisted(() => ({
  mockSuccess: vi.fn(),
  mockPaginated: vi.fn(),
}))

// Mock response utils
vi.mock('../../../../shared/utils/response.js', () => ({
  success: mockSuccess,
  paginated: mockPaginated,
}))

// Mock usersService
vi.mock('../../../../modules/info-management/users.service.js', () => ({
  usersService: {
    getUsers: vi.fn(),
    getUserStats: vi.fn(),
    getUserById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    getLogs: vi.fn(),
    batchCreateUsers: vi.fn(),
    batchUpdateStatus: vi.fn(),
    changePassword: vi.fn(),
    resetPassword: vi.fn(),
    updateStatus: vi.fn(),
    assignRoles: vi.fn(),
    revokeRole: vi.fn(),
    getUserPermissions: vi.fn(),
    getRoles: vi.fn(),
  },
}))

// 必须在 mock 之后再导入真实的模块
import { usersController } from '../../../../modules/info-management/users.controller.js'
import { usersService } from '../../../../modules/info-management/users.service.js'

interface AuthRequest extends Partial<Request> {
  user?: {
    userId: string
    username: string
    roles: string[]
  }
}

describe('UsersController', () => {
  let req: AuthRequest
  let res: Partial<Response>

  beforeEach(() => {
    vi.clearAllMocks()

    req = {
      body: {},
      params: {},
      query: {},
      user: { userId: 'user-1', username: 'alice', roles: ['student'] },
    }

    res = {}

    // Default response mocks
    mockSuccess.mockImplementation(() => {})
    mockPaginated.mockImplementation(() => {})
  })

  describe('list', () => {
    it('应该成功获取用户列表', async () => {
      const mockResult = {
        items: [
          { id: 'user-1', username: 'alice', roles: ['student'] },
          { id: 'user-2', username: 'bob', roles: ['teacher'] },
        ],
        pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
      }

      req.query = { page: '1', pageSize: '10' }
      vi.mocked(usersService.getUsers).mockResolvedValue(mockResult)

      await usersController.list(req as Request, res as Response)

      expect(usersService.getUsers).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
      })
      expect(mockPaginated).toHaveBeenCalledWith(res, mockResult.items, mockResult.pagination)
    })
  })

  describe('getStats', () => {
    it('应该成功获取用户统计', async () => {
      const mockStats = { totalCount: 100 }
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockStats)

      await usersController.getStats(req as Request, res as Response)

      expect(usersService.getUserStats).toHaveBeenCalled()
      expect(mockSuccess).toHaveBeenCalledWith(res, mockStats)
    })
  })

  describe('getById', () => {
    it('应该成功获取用户详情', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        roles: ['student'],
      }

      req.params = { id: 'user-1' }
      vi.mocked(usersService.getUserById).mockResolvedValue(mockUser)

      await usersController.getById(req as Request, res as Response)

      expect(usersService.getUserById).toHaveBeenCalledWith('user-1')
      expect(mockSuccess).toHaveBeenCalledWith(res, mockUser)
    })

    it('应该传递用户不存在的错误', async () => {
      req.params = { id: 'missing-user' }
      vi.mocked(usersService.getUserById).mockRejectedValue(new NotFoundError('用户不存在'))

      await expect(usersController.getById(req as Request, res as Response)).rejects.toBeInstanceOf(
        NotFoundError
      )
    })
  })

  describe('create', () => {
    it('应该成功创建用户', async () => {
      const mockUser = {
        id: 'new-user',
        username: 'newuser',
        email: 'newuser@example.com',
        roles: ['student'],
      }

      req.body = {
        username: 'newuser',
        password: 'Password123',
        realName: '新用户',
        email: 'newuser@example.com',
      }
      vi.mocked(usersService.createUser).mockResolvedValue(mockUser)

      await usersController.create(req as Request, res as Response)

      expect(usersService.createUser).toHaveBeenCalledWith(req.body)
      expect(mockSuccess).toHaveBeenCalledWith(res, mockUser, '创建成功', 201)
    })

    it('应该拒绝重复的用户名', async () => {
      req.body = {
        username: 'existing',
        password: 'Password123',
        realName: '已存在',
      }
      vi.mocked(usersService.createUser).mockRejectedValue(new ConflictError('用户名已存在'))

      await expect(usersController.create(req as Request, res as Response)).rejects.toBeInstanceOf(
        ConflictError
      )
    })
  })

  describe('update', () => {
    it('应该成功更新用户信息', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'alice',
        realName: 'Updated Name',
      }

      req.params = { id: 'user-1' }
      req.body = { realName: 'Updated Name' }
      vi.mocked(usersService.updateUser).mockResolvedValue(mockUser)

      await usersController.update(req as Request, res as Response)

      expect(usersService.updateUser).toHaveBeenCalledWith('user-1', req.body)
      expect(mockSuccess).toHaveBeenCalledWith(res, mockUser, '更新成功')
    })

    it('应该传递用户不存在的错误', async () => {
      req.params = { id: 'missing-user' }
      req.body = { realName: 'Updated' }
      vi.mocked(usersService.updateUser).mockRejectedValue(new NotFoundError('用户不存在'))

      await expect(usersController.update(req as Request, res as Response)).rejects.toBeInstanceOf(
        NotFoundError
      )
    })
  })

  describe('delete', () => {
    it('应该成功删除用户', async () => {
      req.params = { id: 'user-2' }
      req.user = { userId: 'user-1', username: 'alice', roles: ['super_admin'] }
      vi.mocked(usersService.deleteUser).mockResolvedValue(undefined)

      await usersController.delete(req as Request, res as Response)

      expect(usersService.deleteUser).toHaveBeenCalledWith('user-2')
      expect(mockSuccess).toHaveBeenCalledWith(res, null, '删除成功')
    })

    it('应该防止删除自己的账号', async () => {
      req.params = { id: 'user-1' }
      req.user = { userId: 'user-1', username: 'alice', roles: ['super_admin'] }

      await expect(usersController.delete(req as Request, res as Response)).rejects.toBeInstanceOf(
        ValidationError
      )

      try {
        await usersController.delete(req as Request, res as Response)
      } catch (e) {
        expect((e as ValidationError).message).toBe('不能删除自己的账号')
      }
    })

    it('应该传递用户不存在的错误', async () => {
      req.params = { id: 'missing-user' }
      req.user = { userId: 'user-1', username: 'alice', roles: ['super_admin'] }
      vi.mocked(usersService.deleteUser).mockRejectedValue(new NotFoundError('用户不存在'))

      await expect(usersController.delete(req as Request, res as Response)).rejects.toBeInstanceOf(
        NotFoundError
      )
    })
  })

  describe('getLogs', () => {
    it('应该成功获取系统日志', async () => {
      const mockResult = {
        items: [
          {
            id: '1',
            action: 'user.login',
            userId: 'user-1',
            username: 'alice',
          },
        ],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      }

      req.query = { page: '1', pageSize: '10' }
      vi.mocked(usersService.getLogs).mockResolvedValue(mockResult)

      await usersController.getLogs(req as Request, res as Response)

      expect(usersService.getLogs).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
      })
      expect(mockPaginated).toHaveBeenCalledWith(res, mockResult.items, mockResult.pagination)
    })
  })

  describe('batchCreate', () => {
    it('应该成功批量创建用户', async () => {
      const mockResult = {
        success: true,
        created_count: 2,
        users: [
          { id: 'user-1', username: 'user1' },
          { id: 'user-2', username: 'user2' },
        ],
      }

      req.body = {
        users: [
          { username: 'user1', password: 'Password123', realName: '用户一' },
          { username: 'user2', password: 'Password123', realName: '用户二' },
        ],
      }
      vi.mocked(usersService.batchCreateUsers).mockResolvedValue(mockResult)

      await usersController.batchCreate(req as Request, res as Response)

      expect(usersService.batchCreateUsers).toHaveBeenCalledWith(req.body)
      expect(mockSuccess).toHaveBeenCalledWith(res, mockResult, '批量创建成功', 201)
    })

    it('应该拒绝超过100个用户的批量创建', async () => {
      const users = Array(101)
        .fill(null)
        .map((_, i) => ({
          username: `user${i}`,
          password: 'Password123',
          realName: `用户${i}`,
        }))

      req.body = { users }

      // Zod 验证会抛出 ZodError
      await expect(usersController.batchCreate(req as Request, res as Response)).rejects.toThrow()
    })
  })

  describe('batchUpdateStatus', () => {
    it('应该成功批量更新用户状态', async () => {
      const mockResult = { updated_count: 2, failed_count: 0 }

      req.body = {
        userIds: ['user-1', 'user-2'],
        status: 'INACTIVE',
      }
      vi.mocked(usersService.batchUpdateStatus).mockResolvedValue(mockResult)

      await usersController.batchUpdateStatus(req as Request, res as Response)

      expect(usersService.batchUpdateStatus).toHaveBeenCalledWith(req.body)
      expect(mockSuccess).toHaveBeenCalledWith(res, mockResult, '批量修改状态成功')
    })
  })

  describe('changePassword', () => {
    it('应该成功修改自己的密码', async () => {
      req.params = { id: 'user-1' }
      req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }
      req.body = {
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      }
      vi.mocked(usersService.changePassword).mockResolvedValue(undefined)

      await usersController.changePassword(req as Request, res as Response)

      expect(usersService.changePassword).toHaveBeenCalledWith('user-1', req.body)
      expect(mockSuccess).toHaveBeenCalledWith(res, null, '密码修改成功')
    })

    it('应该拒绝修改他人密码', async () => {
      req.params = { id: 'user-2' }
      req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }
      req.body = {
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      }

      await expect(
        usersController.changePassword(req as Request, res as Response)
      ).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  describe('resetPassword', () => {
    it('管理员应该成功重置用户密码', async () => {
      req.params = { id: 'user-1' }
      req.body = { newPassword: 'NewPassword123' }
      vi.mocked(usersService.resetPassword).mockResolvedValue(undefined)

      await usersController.resetPassword(req as Request, res as Response)

      expect(usersService.resetPassword).toHaveBeenCalledWith('user-1', req.body)
      expect(mockSuccess).toHaveBeenCalledWith(res, null, '密码重置成功')
    })

    it('应该传递用户不存在的错误', async () => {
      req.params = { id: 'missing-user' }
      req.body = { newPassword: 'NewPassword123' }
      vi.mocked(usersService.resetPassword).mockRejectedValue(new NotFoundError('用户不存在'))

      await expect(
        usersController.resetPassword(req as Request, res as Response)
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  describe('updateStatus', () => {
    it('应该成功修改用户状态', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'alice',
        status: 'INACTIVE',
      }

      req.params = { id: 'user-1' }
      req.body = { status: 'INACTIVE' }
      vi.mocked(usersService.updateStatus).mockResolvedValue(mockUser)

      await usersController.updateStatus(req as Request, res as Response)

      expect(usersService.updateStatus).toHaveBeenCalledWith('user-1', req.body)
      expect(mockSuccess).toHaveBeenCalledWith(res, mockUser, '状态修改成功')
    })
  })

  describe('assignRoles', () => {
    it('应该成功分配角色', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'alice',
        roles: ['admin', 'student'],
      }

      req.params = { id: 'user-1' }
      req.user = { userId: 'admin-1', username: 'admin', roles: ['admin'] }
      req.body = { roleIds: ['role-admin', 'role-student'] }
      vi.mocked(usersService.assignRoles).mockResolvedValue(mockUser)

      await usersController.assignRoles(req as Request, res as Response)

      expect(usersService.assignRoles).toHaveBeenCalledWith('user-1', req.body, 'admin-1', [
        'admin',
      ])
      expect(mockSuccess).toHaveBeenCalledWith(res, mockUser, '角色分配成功')
    })

    it('应该传递权限不足的错误', async () => {
      req.params = { id: 'user-1' }
      req.user = { userId: 'user-2', username: 'bob', roles: ['student'] }
      req.body = { roleIds: ['role-admin'] }
      vi.mocked(usersService.assignRoles).mockRejectedValue(
        new ForbiddenError('只有超级管理员才能分配超级管理员角色')
      )

      await expect(
        usersController.assignRoles(req as Request, res as Response)
      ).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  describe('revokeRole', () => {
    it('应该成功撤销角色', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'alice',
        roles: ['student'],
      }

      req.params = { id: 'user-1', role_id: 'role-admin' }
      req.user = { userId: 'admin-1', username: 'admin', roles: ['admin'] }
      vi.mocked(usersService.revokeRole).mockResolvedValue(mockUser)

      await usersController.revokeRole(req as Request, res as Response)

      expect(usersService.revokeRole).toHaveBeenCalledWith('user-1', 'role-admin', 'admin-1')
      expect(mockSuccess).toHaveBeenCalledWith(res, mockUser, '角色撤销成功')
    })

    it('应该防止撤销自己的最后一个管理员角色', async () => {
      req.params = { id: 'user-1', role_id: 'role-admin' }
      req.user = { userId: 'user-1', username: 'alice', roles: ['admin'] }
      vi.mocked(usersService.revokeRole).mockRejectedValue(
        new ForbiddenError('不能撤销自己的最后一个管理员角色')
      )

      await expect(
        usersController.revokeRole(req as Request, res as Response)
      ).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  describe('getPermissions', () => {
    it('管理员应该成功查看他人权限', async () => {
      const mockPermissions = {
        user_id: 'user-1',
        username: 'alice',
        permissions: ['course:read', 'profile:update'],
      }

      req.params = { id: 'user-1' }
      req.user = { userId: 'admin-1', username: 'admin', roles: ['admin'] }
      vi.mocked(usersService.getUserPermissions).mockResolvedValue(mockPermissions)

      await usersController.getPermissions(req as Request, res as Response)

      expect(usersService.getUserPermissions).toHaveBeenCalledWith('user-1')
      expect(mockSuccess).toHaveBeenCalledWith(res, mockPermissions)
    })

    it('用户应该成功查看自己的权限', async () => {
      const mockPermissions = {
        user_id: 'user-1',
        username: 'alice',
        permissions: ['course:read'],
      }

      req.params = { id: 'user-1' }
      req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }
      vi.mocked(usersService.getUserPermissions).mockResolvedValue(mockPermissions)

      await usersController.getPermissions(req as Request, res as Response)

      expect(usersService.getUserPermissions).toHaveBeenCalledWith('user-1')
      expect(mockSuccess).toHaveBeenCalledWith(res, mockPermissions)
    })

    it('应该拒绝普通用户查看他人权限', async () => {
      req.params = { id: 'user-2' }
      req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }

      await expect(
        usersController.getPermissions(req as Request, res as Response)
      ).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  describe('getRoles', () => {
    it('应该成功获取所有角色列表', async () => {
      const mockRoles = [
        { id: 'role-1', code: 'student', name: '学生', description: '学生角色' },
        { id: 'role-2', code: 'teacher', name: '教师', description: '教师角色' },
      ]

      vi.mocked(usersService.getRoles).mockResolvedValue(mockRoles)

      await usersController.getRoles(req as Request, res as Response)

      expect(usersService.getRoles).toHaveBeenCalled()
      expect(mockSuccess).toHaveBeenCalledWith(res, mockRoles)
    })
  })
})
