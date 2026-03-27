/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 认证服务单元测试
 * 测试 auth.service.ts 中所有功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authService } from '../../../modules/info-management/auth.service.js'
import prisma from '../../../shared/prisma/client.js'
import { redisClient } from '../../../config/redis.js'
import { sendPasswordResetEmail } from '../../../config/mail.js'

// Mock 依赖
vi.mock('../../../shared/prisma/client.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    activationToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
    userRole: {
      create: vi.fn(),
    },
    systemLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn) => {
      // 支持 callback 形式的 transaction
      if (typeof fn === 'function') {
        return fn({
          user: {
            update: vi.fn().mockResolvedValue({
              id: 'user-1',
              username: 'testuser',
              email: 'test@example.com',
              realName: 'Test User',
              status: 'ACTIVE',
              lastLoginAt: new Date(),
              userRoles: [{ role: { code: 'student', permissions: [] } }],
            }),
          },
          refreshToken: {
            create: vi.fn().mockResolvedValue({}),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          systemLog: {
            create: vi.fn().mockResolvedValue({}),
          },
          activationToken: {
            create: vi.fn().mockResolvedValue({}),
          },
          passwordResetToken: {
            create: vi.fn().mockResolvedValue({}),
            update: vi.fn().mockResolvedValue({}),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        })
      }
      return Promise.all(fn)
    }),
  },
}))

vi.mock('../../../config/redis.js', () => ({
  redisClient: {
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(),
  },
}))

vi.mock('../../../config/mail.js', () => ({
  sendPasswordResetEmail: vi.fn(),
}))

vi.mock('../../../shared/utils/password.js', () => ({
  hashPassword: vi.fn((pwd) => `hashed_${pwd}`),
  comparePassword: vi.fn((pwd, hash) => hash === `hashed_${pwd}`),
  validatePasswordStrength: vi.fn((pwd) => {
    if (pwd.length < 8) return { valid: false, errors: ['密码至少8位'] }
    if (!/[A-Z]/.test(pwd)) return { valid: false, errors: ['密码必须包含大写字母'] }
    if (!/[a-z]/.test(pwd)) return { valid: false, errors: ['密码必须包含小写字母'] }
    if (!/[0-9]/.test(pwd)) return { valid: false, errors: ['密码必须包含数字'] }
    return { valid: true, errors: [] }
  }),
}))

describe('AuthService', () => {
  beforeEach(() => {
    // 清除所有 mock 调用记录
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('应该成功登录并返回 token', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'hashed_password123',
        email: 'test@example.com',
        realName: 'Test User',
        status: 'ACTIVE',
        lastLoginAt: null,
        userRoles: [{ role: { code: 'student' } }],
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any)
      vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 0 })
      vi.mocked(redisClient.get).mockResolvedValue(null)

      const result = await authService.login({
        username: 'testuser',
        password: 'password123',
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
      })

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result.user.username).toBe('testuser')
    })

    it('应该拒绝不存在的用户', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(redisClient.get).mockResolvedValue(null)

      await expect(
        authService.login({
          username: 'nonexistent',
          password: 'password123',
          ip_address: '127.0.0.1',
        })
      ).rejects.toThrow('用户名或密码错误')
    })

    it('应该拒绝错误的密码', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'hashed_different_password',
        status: 'ACTIVE',
        userRoles: [],
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(redisClient.get).mockResolvedValue(null)

      await expect(
        authService.login({
          username: 'testuser',
          password: 'wrongpassword',
          ip_address: '127.0.0.1',
        })
      ).rejects.toThrow('用户名或密码错误')
    })

    it('应该拒绝被禁用的账户', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'hashed_password123',
        status: 'BANNED',
        userRoles: [],
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(redisClient.get).mockResolvedValue(null)

      await expect(
        authService.login({
          username: 'testuser',
          password: 'password123',
          ip_address: '127.0.0.1',
        })
      ).rejects.toThrow('账户已被禁用')
    })

    it('应该在5次失败后锁定15分钟', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      // 模拟锁定状态
      vi.mocked(redisClient.get).mockResolvedValueOnce('locked-until-1234567890')

      await expect(
        authService.login({
          username: 'testuser',
          password: 'wrongpassword',
          ip_address: '127.0.0.1',
        })
      ).rejects.toThrow('登录失败次数过多')
    })
  })

  describe('refreshToken', () => {
    it('应该成功刷新 token', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        status: 'ACTIVE',
        userRoles: [{ role: { code: 'student', permissions: [] } }],
      }

      const mockStoredToken = {
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'test-hash',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isUsed: false,
        user: mockUser,
      }

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(mockStoredToken as any)
      vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as any)
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any)

      const result = await authService.refreshToken('valid-refresh-token')

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
    })

    it('应该拒绝无效的 refresh token', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(null)

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow('无效的刷新令牌')
    })

    it('应该拒绝已使用的 refresh token', async () => {
      const mockStoredToken = {
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'test-hash',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isUsed: true,
        user: { status: 'ACTIVE' },
      }

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(mockStoredToken as any)

      await expect(authService.refreshToken('used-token')).rejects.toThrow('刷新令牌已使用')
    })

    it('应该拒绝过期的 refresh token', async () => {
      const mockStoredToken = {
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'test-hash',
        expiresAt: new Date(Date.now() - 1000), // 已过期
        isUsed: false,
        user: { status: 'ACTIVE' },
      }

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(mockStoredToken as any)

      await expect(authService.refreshToken('expired-token')).rejects.toThrow('刷新令牌已过期')
    })
  })

  describe('logout', () => {
    it('应该成功登出并使 refresh token 失效', async () => {
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 })
      vi.mocked(prisma.systemLog.create).mockResolvedValue({} as any)

      await authService.logout({
        user_id: 'user-1',
        refresh_token: 'valid-token',
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
      })

      expect(prisma.refreshToken.updateMany).toHaveBeenCalled()
      expect(prisma.systemLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'auth:logout',
          }),
        })
      )
    })
  })

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      const mockCreatedUser = {
        id: 'user-1',
        username: 'newuser',
        email: 'new@example.com',
        realName: 'New User',
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.create).mockResolvedValue(mockCreatedUser as any)
      vi.mocked(prisma.role.findUnique).mockResolvedValue({ id: 'role-1', code: 'student' } as any)
      vi.mocked(prisma.userRole.create).mockResolvedValue({} as any)
      vi.mocked(prisma.activationToken.create).mockResolvedValue({} as any)

      const result = await authService.register({
        username: 'newuser',
        password: 'Password123',
        email: 'new@example.com',
        real_name: 'New User',
      })

      expect(result.username).toBe('newuser')
    })

    it('应该拒绝已存在的用户名', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing-user' } as any)

      await expect(
        authService.register({
          username: 'existinguser',
          password: 'Password123',
          real_name: 'Test',
        })
      ).rejects.toThrow('用户名已存在')
    })

    it('应该拒绝弱密码', async () => {
      await expect(
        authService.register({
          username: 'newuser',
          password: 'weak',
          real_name: 'Test',
        })
      ).rejects.toThrow('密码强度不足')
    })
  })

  describe('changePassword', () => {
    it('应该成功修改密码', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: 'hashed_oldpassword',
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 0 })
      vi.mocked(prisma.systemLog.create).mockResolvedValue({} as any)

      await authService.changePassword('user-1', 'oldpassword', 'Newpassword123', {
        ip_address: '127.0.0.1',
      })

      expect(prisma.user.update).toHaveBeenCalled()
      expect(prisma.systemLog.create).toHaveBeenCalled()
    })

    it('应该拒绝错误的旧密码', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: 'hashed_different_password',
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

      await expect(
        authService.changePassword('user-1', 'wrongpassword', 'Newpassword123')
      ).rejects.toThrow('旧密码错误')
    })

    it('应该拒绝与旧密码相同的新密码', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: 'hashed_Oldpassword123',
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

      await expect(
        authService.changePassword('user-1', 'Oldpassword123', 'Oldpassword123')
      ).rejects.toThrow('新密码不能与旧密码相同')
    })
  })

  describe('activateAccount', () => {
    it('应该成功激活账户', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        isUsed: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        user: { id: 'user-1', status: 'INACTIVE' },
      }

      vi.mocked(prisma.activationToken.findUnique).mockResolvedValue(mockToken as any)
      vi.mocked(prisma.activationToken.update).mockResolvedValue({} as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)

      await authService.activateAccount('valid-activation-token')

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'ACTIVE' },
        })
      )
    })

    it('应该拒绝无效的激活令牌', async () => {
      vi.mocked(prisma.activationToken.findUnique).mockResolvedValue(null)

      await expect(authService.activateAccount('invalid-token')).rejects.toThrow(
        '激活令牌无效或已过期'
      )
    })
  })

  describe('forgotPassword', () => {
    it('应该为存在的邮箱创建重置令牌', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 })
      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as any)
      vi.mocked(sendPasswordResetEmail).mockResolvedValue()

      await authService.forgotPassword('test@example.com')

      expect(sendPasswordResetEmail).toHaveBeenCalled()
    })

    it('应该对不存在的邮箱也返回成功（防止用户枚举）', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      // 不应该抛出异常
      await authService.forgotPassword('nonexistent@example.com')
    })
  })

  describe('resetPassword', () => {
    it('应该成功重置密码', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        isUsed: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: { id: 'user-1' },
      }

      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(mockToken as any)
      vi.mocked(prisma.passwordResetToken.update).mockResolvedValue({} as any)
      vi.mocked(prisma.passwordResetToken.updateMany).mockResolvedValue({ count: 0 })
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 0 })
      vi.mocked(prisma.systemLog.create).mockResolvedValue({} as any)

      await authService.resetPassword('valid-reset-token', 'Newpassword123', {
        ip_address: '127.0.0.1',
      })

      expect(prisma.user.update).toHaveBeenCalled()
      expect(prisma.systemLog.create).toHaveBeenCalled()
    })

    it('应该拒绝无效的重置令牌', async () => {
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(null)

      await expect(authService.resetPassword('invalid-token', 'Newpassword123')).rejects.toThrow(
        '重置令牌无效或已过期'
      )
    })
  })

  describe('getUserById', () => {
    it('应该返回用户信息', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        phone: '13800138000',
        realName: 'Test User',
        avatarUrl: null,
        gender: 'MALE',
        status: 'ACTIVE',
        lastLoginAt: new Date(),
        userRoles: [
          {
            role: {
              code: 'student',
              permissions: [{ permission: { code: 'course:read' } }],
            },
          },
        ],
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

      const result = await authService.getUserById('user-1')

      expect(result.username).toBe('testuser')
      expect(result.roles).toContain('student')
      expect(result.permissions).toContain('course:read')
    })

    it('应该拒绝不存在的用户', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      await expect(authService.getUserById('nonexistent-user')).rejects.toThrow('用户不存在')
    })
  })
})
