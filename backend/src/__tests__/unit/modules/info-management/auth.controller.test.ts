/**
 * 认证控制器单元测试
 * 测试认证相关的 HTTP 请求处理
 *
 * 注意：Controller 层主要职责是：
 * 1. 从 request 中提取参数（body, params, query, headers）
 * 2. 调用 service 层方法
 * 3. 使用 response 工具返回结果
 * 4. 错误由 express-async-errors 自动捕获并传递给 errorHandler
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { UnauthorizedError, ValidationError } from '@stss/shared'

// 使用 vi.hoisted() 来确保 mock 函数在 mock 提升之前被初始化
const { mockSuccess, mockError } = vi.hoisted(() => ({
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}))

// Mock response utils
vi.mock('../../../../shared/utils/response.js', () => ({
  success: mockSuccess,
  error: mockError,
}))

// Mock authService
vi.mock('../../../../modules/info-management/auth.service.js', () => ({
  authService: {
    login: vi.fn(),
    refreshToken: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getUserById: vi.fn(),
    activateAccount: vi.fn(),
    changePassword: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyResetToken: vi.fn(),
  },
}))

// 必须在 mock 之后再导入真实的模块
import { authController } from '../../../../modules/info-management/auth.controller.js'
import { authService } from '../../../../modules/info-management/auth.service.js'

interface AuthRequest extends Partial<Request> {
  user?: {
    userId: string
    username: string
    roles: string[]
  }
}

describe('AuthController', () => {
  let req: AuthRequest
  let res: Partial<Response>

  beforeEach(() => {
    vi.clearAllMocks()

    req = {
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
      get: vi.fn((header: string) => {
        if (header === 'user-agent') return 'vitest'
        return undefined
      }),
    }

    res = {}

    // Default success response mock - 空实现，避免实际调用 res.status/res.json
    mockSuccess.mockImplementation(() => {})
    mockError.mockImplementation(() => {})
  })

  describe('login', () => {
    it('应该成功登录并返回 tokens', async () => {
      const mockResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 7200,
        tokenType: 'Bearer',
        user: {
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          roles: ['student'],
        },
      }

      req.body = { username: 'alice', password: 'Password123' }
      vi.mocked(authService.login).mockResolvedValue(mockResult)

      await authController.login(req as Request, res as Response)

      expect(authService.login).toHaveBeenCalledWith({
        username: 'alice',
        password: 'Password123',
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      })
      expect(mockSuccess).toHaveBeenCalledWith(res, mockResult, '登录成功')
    })

    it('应该传递 service 抛出的错误', async () => {
      req.body = { username: 'alice', password: 'wrong-password' }
      vi.mocked(authService.login).mockRejectedValue(new UnauthorizedError('用户名或密码错误'))

      await expect(authController.login(req as Request, res as Response)).rejects.toBeInstanceOf(
        UnauthorizedError
      )
    })
  })

  describe('refreshToken', () => {
    it('应该成功刷新 token', async () => {
      const mockResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 7200,
        tokenType: 'Bearer',
      }

      req.body = { refreshToken: 'valid-refresh-token' }
      vi.mocked(authService.refreshToken).mockResolvedValue(mockResult)

      await authController.refreshToken(req as Request, res as Response)

      expect(authService.refreshToken).toHaveBeenCalledWith('valid-refresh-token')
      expect(mockSuccess).toHaveBeenCalledWith(res, mockResult, '令牌刷新成功')
    })

    it('应该拒绝无效的 refresh token', async () => {
      req.body = { refreshToken: 'invalid-token' }
      vi.mocked(authService.refreshToken).mockRejectedValue(new UnauthorizedError('无效的刷新令牌'))

      await expect(
        authController.refreshToken(req as Request, res as Response)
      ).rejects.toBeInstanceOf(UnauthorizedError)
    })
  })

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'newuser',
        email: 'newuser@example.com',
        realName: '新用户',
      }

      req.body = {
        username: 'newuser',
        password: 'Password123',
        realName: '新用户',
        email: 'newuser@example.com',
      }
      vi.mocked(authService.register).mockResolvedValue(mockUser)

      await authController.register(req as Request, res as Response)

      expect(authService.register).toHaveBeenCalledWith(req.body)
      expect(mockSuccess).toHaveBeenCalledWith(res, mockUser, '注册成功', 201)
    })

    it('应该拒绝弱密码', async () => {
      req.body = {
        username: 'newuser',
        password: 'weak',
        realName: '新用户',
      }
      vi.mocked(authService.register).mockRejectedValue(new ValidationError('密码强度不足'))

      await expect(authController.register(req as Request, res as Response)).rejects.toBeInstanceOf(
        ValidationError
      )
    })

    it('应该拒绝重复的用户名', async () => {
      req.body = {
        username: 'existing-user',
        password: 'Password123',
        realName: '已存在用户',
      }
      vi.mocked(authService.register).mockRejectedValue(new ValidationError('用户名已存在'))

      await expect(authController.register(req as Request, res as Response)).rejects.toBeInstanceOf(
        ValidationError
      )
    })
  })

  describe('logout', () => {
    it('应该成功登出', async () => {
      req.body = { refreshToken: 'valid-token' }
      req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }
      vi.mocked(authService.logout).mockResolvedValue(undefined)

      await authController.logout(req as Request, res as Response)

      expect(authService.logout).toHaveBeenCalledWith({
        userId: 'user-1',
        refreshToken: 'valid-token',
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      })
      expect(mockSuccess).toHaveBeenCalledWith(res, null, '登出成功')
    })

    it('应该拒绝无效的 refresh token', async () => {
      req.body = { refreshToken: 'invalid-token' }
      req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }
      vi.mocked(authService.logout).mockRejectedValue(new UnauthorizedError('刷新令牌无效'))

      await expect(authController.logout(req as Request, res as Response)).rejects.toBeInstanceOf(
        UnauthorizedError
      )
    })
  })

  describe('me', () => {
    it('应该返回当前用户信息', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        roles: ['student'],
        permissions: ['course:read'],
      }

      req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }
      vi.mocked(authService.getUserById).mockResolvedValue(mockUser)

      await authController.me(req as Request, res as Response)

      expect(authService.getUserById).toHaveBeenCalledWith('user-1')
      expect(mockSuccess).toHaveBeenCalledWith(res, mockUser)
    })

    it('应该传递用户不存在的错误', async () => {
      req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }
      vi.mocked(authService.getUserById).mockRejectedValue(new UnauthorizedError('用户不存在'))

      await expect(authController.me(req as Request, res as Response)).rejects.toBeInstanceOf(
        UnauthorizedError
      )
    })
  })

  describe('activate', () => {
    it('应该成功激活账户', async () => {
      req.body = { token: 'valid-activation-token' }
      vi.mocked(authService.activateAccount).mockResolvedValue(undefined)

      await authController.activate(req as Request, res as Response)

      expect(authService.activateAccount).toHaveBeenCalledWith('valid-activation-token')
      expect(mockSuccess).toHaveBeenCalledWith(res, null, '账号激活成功')
    })

    it('应该拒绝无效的激活令牌', async () => {
      req.body = { token: 'invalid-token' }
      vi.mocked(authService.activateAccount).mockRejectedValue(new ValidationError('激活令牌无效'))

      await expect(authController.activate(req as Request, res as Response)).rejects.toBeInstanceOf(
        ValidationError
      )
    })
  })

  describe('changePassword', () => {
    it('应该成功修改密码', async () => {
      req.body = {
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      }
      req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }
      vi.mocked(authService.changePassword).mockResolvedValue(undefined)

      await authController.changePassword(req as Request, res as Response)

      expect(authService.changePassword).toHaveBeenCalledWith(
        'user-1',
        'OldPassword123',
        'NewPassword456',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'vitest',
        }
      )
      expect(mockSuccess).toHaveBeenCalledWith(res, null, '密码修改成功')
    })

    it('应该拒绝错误的旧密码', async () => {
      req.body = {
        oldPassword: 'WrongPassword123',
        newPassword: 'NewPassword456',
      }
      req.user = { userId: 'user-1', username: 'alice', roles: ['student'] }
      vi.mocked(authService.changePassword).mockRejectedValue(new ValidationError('旧密码错误'))

      await expect(
        authController.changePassword(req as Request, res as Response)
      ).rejects.toBeInstanceOf(ValidationError)
    })
  })

  describe('forgotPassword', () => {
    it('应该为存在的邮箱发送重置邮件', async () => {
      req.body = { email: 'existing@example.com' }
      vi.mocked(authService.forgotPassword).mockResolvedValue(undefined)

      await authController.forgotPassword(req as Request, res as Response)

      expect(authService.forgotPassword).toHaveBeenCalledWith('existing@example.com')
      expect(mockSuccess).toHaveBeenCalledWith(res, null, '如该邮箱已注册，重置链接已发送')
    })

    it('应该对不存在的邮箱返回相同响应（防止用户枚举）', async () => {
      req.body = { email: 'nonexistent@example.com' }
      vi.mocked(authService.forgotPassword).mockResolvedValue(undefined)

      await authController.forgotPassword(req as Request, res as Response)

      expect(authService.forgotPassword).toHaveBeenCalledWith('nonexistent@example.com')
      expect(mockSuccess).toHaveBeenCalledWith(res, null, '如该邮箱已注册，重置链接已发送')
    })
  })

  describe('resetPassword', () => {
    it('应该成功重置密码', async () => {
      req.body = {
        token: 'valid-reset-token',
        newPassword: 'NewPassword123',
      }
      vi.mocked(authService.resetPassword).mockResolvedValue(undefined)

      await authController.resetPassword(req as Request, res as Response)

      expect(authService.resetPassword).toHaveBeenCalledWith(
        'valid-reset-token',
        'NewPassword123',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'vitest',
        }
      )
      expect(mockSuccess).toHaveBeenCalledWith(res, null, '密码重置成功，请使用新密码登录')
    })

    it('应该拒绝无效的重置令牌', async () => {
      req.body = {
        token: 'invalid-token',
        newPassword: 'NewPassword123',
      }
      vi.mocked(authService.resetPassword).mockRejectedValue(new ValidationError('重置令牌无效'))

      await expect(
        authController.resetPassword(req as Request, res as Response)
      ).rejects.toBeInstanceOf(ValidationError)
    })

    it('应该拒绝弱密码', async () => {
      req.body = {
        token: 'valid-reset-token',
        newPassword: 'weak',
      }
      vi.mocked(authService.resetPassword).mockRejectedValue(new ValidationError('密码强度不足'))

      await expect(
        authController.resetPassword(req as Request, res as Response)
      ).rejects.toBeInstanceOf(ValidationError)
    })
  })
})
