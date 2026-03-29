import crypto from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from '@stss/shared'

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  systemLog: {
    create: vi.fn(),
  },
  activationToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  passwordResetToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  role: {
    findUnique: vi.fn(),
  },
  userRole: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
}))

const passwordMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
  validatePasswordStrength: vi.fn(),
}))

const mailMock = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(),
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

vi.mock('../../../config/redis.js', () => ({
  redisClient: redisMock,
}))

vi.mock('../../../shared/utils/password.js', () => ({
  hashPassword: passwordMock.hashPassword,
  comparePassword: passwordMock.comparePassword,
  validatePasswordStrength: passwordMock.validatePasswordStrength,
}))

vi.mock('../../../config/mail.js', () => ({
  sendPasswordResetEmail: mailMock.sendPasswordResetEmail,
}))

import { authService } from '../../../modules/info-management/auth.service.js'

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    username: 'alice',
    passwordHash: 'stored-hash',
    email: 'alice@example.com',
    phone: '13800000000',
    realName: 'Alice',
    avatarUrl: 'https://example.com/avatar.png',
    gender: 'FEMALE',
    status: 'ACTIVE',
    lastLoginAt: null,
    userRoles: [
      {
        role: {
          code: 'student',
          permissions: [
            { permission: { code: 'course:read' } },
            { permission: { code: 'profile:update' } },
          ],
        },
      },
      {
        role: {
          code: 'assistant',
          permissions: [{ permission: { code: 'course:read' } }],
        },
      },
    ],
    ...overrides,
  }
}

function buildStoredRefreshToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'refresh-1',
    userId: 'user-1',
    isUsed: false,
    expiresAt: new Date(Date.now() + 60_000),
    user: buildUser(),
    ...overrides,
  }
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

beforeEach(() => {
  vi.resetAllMocks()

  redisMock.get.mockResolvedValue(null)
  redisMock.set.mockResolvedValue(undefined)
  redisMock.incr.mockResolvedValue(1)
  redisMock.expire.mockResolvedValue(undefined)
  redisMock.del.mockResolvedValue(1)

  passwordMock.hashPassword.mockImplementation(async (password: string) => `hashed:${password}`)
  passwordMock.comparePassword.mockResolvedValue(true)
  passwordMock.validatePasswordStrength.mockReturnValue({ valid: true, errors: [] })

  mailMock.sendPasswordResetEmail.mockResolvedValue(undefined)

  prismaMock.$transaction.mockImplementation(async (input: unknown) => {
    if (typeof input === 'function') {
      const tx = {
        user: {
          update: prismaMock.user.update,
        },
        refreshToken: {
          create: prismaMock.refreshToken.create,
          deleteMany: prismaMock.refreshToken.deleteMany,
        },
        systemLog: {
          create: prismaMock.systemLog.create,
        },
      }
      return input(tx)
    }

    return Promise.all(input as Promise<unknown>[])
  })
})

describe('AuthService', () => {
  // 测试登录流程的成功、失败、锁定和审计行为。
  describe('login', () => {
    it('应该成功登录并返回 token，同时更新最后登录时间和系统日志', async () => {
      const user = buildUser()
      const updatedUser = buildUser({ lastLoginAt: new Date('2026-03-27T10:00:00.000Z') })

      prismaMock.user.findUnique.mockResolvedValue(user)
      prismaMock.user.update.mockResolvedValue(updatedUser)
      prismaMock.refreshToken.create.mockResolvedValue({ id: 'refresh-1' })
      prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 0 })
      prismaMock.systemLog.create.mockResolvedValue({ id: 1 })

      const result = await authService.login({
        username: 'alice',
        password: 'Password123',
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      })

      expect(result.accessToken).toEqual(expect.any(String))
      expect(result.refreshToken).toEqual(expect.any(String))
      expect(result.expiresIn).toBe(7200)
      expect(result.tokenType).toBe('Bearer')
      expect(result.user.roles).toEqual(['student', 'assistant'])
      expect(result.user.permissions).toEqual(['course:read', 'profile:update'])
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { lastLoginAt: expect.any(Date) },
        })
      )
      expect(prismaMock.systemLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'auth:login',
            userId: 'user-1',
            ipAddress: '127.0.0.1',
            userAgent: 'vitest',
          }),
        })
      )
      expect(redisMock.del).toHaveBeenCalledTimes(2)
    })

    it('应该拒绝不存在的用户', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(
        authService.login({
          username: 'missing',
          password: 'Password123',
          ipAddress: '127.0.0.1',
        })
      ).rejects.toBeInstanceOf(UnauthorizedError)

      expect(redisMock.incr).toHaveBeenCalledOnce()
      expect(prismaMock.systemLog.create).not.toHaveBeenCalled()
    })

    it('应该拒绝错误的密码', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser())
      passwordMock.comparePassword.mockResolvedValue(false)

      await expect(
        authService.login({
          username: 'alice',
          password: 'wrong-password',
          ipAddress: '127.0.0.1',
        })
      ).rejects.toBeInstanceOf(UnauthorizedError)

      expect(redisMock.incr).toHaveBeenCalledOnce()
    })

    it('应该拒绝被禁用或未激活的账户', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(buildUser({ status: 'INACTIVE' }))
        .mockResolvedValueOnce(buildUser({ status: 'BANNED' }))

      await expect(
        authService.login({ username: 'alice', password: 'Password123', ipAddress: '127.0.0.1' })
      ).rejects.toBeInstanceOf(ForbiddenError)

      await expect(
        authService.login({ username: 'alice', password: 'Password123', ipAddress: '127.0.0.1' })
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('应该在5次失败后锁定15分钟', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)
      redisMock.incr.mockResolvedValue(5)

      await expect(
        authService.login({
          username: 'alice',
          password: 'Password123',
          ipAddress: '10.0.0.8',
        })
      ).rejects.toBeInstanceOf(UnauthorizedError)

      expect(redisMock.set).toHaveBeenCalledWith(
        'auth:login_lock:alice:10.0.0.8',
        expect.any(String),
        { ex: 900 }
      )

      redisMock.get.mockResolvedValueOnce(new Date(Date.now() + 900_000).toISOString())

      await expect(
        authService.login({
          username: 'alice',
          password: 'Password123',
          ipAddress: '10.0.0.8',
        })
      ).rejects.toBeInstanceOf(TooManyRequestsError)
    })
  })

  // 测试刷新令牌的校验、轮换和异常分支。
  describe('refreshToken', () => {
    it('应该成功刷新 token，并使旧 token 失效', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(buildStoredRefreshToken())
      prismaMock.refreshToken.update.mockResolvedValue({ id: 'refresh-1', isUsed: true })
      prismaMock.refreshToken.create.mockResolvedValue({ id: 'refresh-2' })

      const result = await authService.refreshToken('refresh-token-value')

      expect(result.accessToken).toEqual(expect.any(String))
      expect(result.refreshToken).toEqual(expect.any(String))
      expect(result.refreshToken).not.toBe('refresh-token-value')
      expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'refresh-1' },
        data: { isUsed: true },
      })
      expect(prismaMock.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            tokenHash: sha256(result.refreshToken),
          }),
        })
      )
    })

    it('应该拒绝无效、已使用或过期的 refresh token', async () => {
      prismaMock.refreshToken.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(buildStoredRefreshToken({ isUsed: true }))
        .mockResolvedValueOnce(buildStoredRefreshToken({ expiresAt: new Date(Date.now() - 1_000) }))

      await expect(authService.refreshToken('missing-token')).rejects.toBeInstanceOf(
        UnauthorizedError
      )
      await expect(authService.refreshToken('used-token')).rejects.toBeInstanceOf(UnauthorizedError)
      await expect(authService.refreshToken('expired-token')).rejects.toBeInstanceOf(
        UnauthorizedError
      )
    })

    it('应该拒绝已被禁用的账户刷新 token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(
        buildStoredRefreshToken({
          user: buildUser({ status: 'BANNED' }),
        })
      )

      await expect(authService.refreshToken('refresh-token')).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  // 测试登出时刷新令牌失效与日志写入行为。
  describe('logout', () => {
    it('应该成功登出并使 refresh token 失效，同时写入系统日志', async () => {
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 })
      prismaMock.systemLog.create.mockResolvedValue({ id: 1 })

      await authService.logout({
        userId: 'user-1',
        refreshToken: 'refresh-token',
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      })

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          tokenHash: sha256('refresh-token'),
          isUsed: false,
        },
        data: { isUsed: true },
      })
      expect(prismaMock.systemLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'auth:logout',
            userId: 'user-1',
          }),
        })
      )
    })

    it('应该拒绝无效的 refresh token', async () => {
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 0 })

      await expect(
        authService.logout({
          userId: 'user-1',
          refreshToken: 'bad-token',
        })
      ).rejects.toBeInstanceOf(UnauthorizedError)
    })
  })

  // 测试注册流程中的冲突校验、默认角色和激活令牌创建。
  describe('register', () => {
    it('应该成功注册新用户，并分配默认学生角色与激活令牌', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)
      prismaMock.user.create.mockResolvedValue({
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        realName: 'Alice',
      })
      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-student', code: 'student' })
      prismaMock.userRole.create.mockResolvedValue({ id: 'user-role-1' })
      prismaMock.activationToken.create.mockResolvedValue({ id: 'activation-1' })

      const result = await authService.register({
        username: 'alice',
        password: 'Password123',
        email: 'alice@example.com',
        realName: 'Alice',
        gender: 'female',
      })

      expect(result).toEqual(
        expect.objectContaining({
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          realName: 'Alice',
          // 注意：activationToken 不再返回给客户端，只通过邮件发送
        })
      )
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'INACTIVE',
            passwordHash: 'hashed:Password123',
            gender: 'FEMALE',
          }),
        })
      )
      expect(prismaMock.userRole.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          roleId: 'role-student',
        },
      })
      expect(prismaMock.activationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            // 注意：activationToken 不再返回，所以不验证 tokenHash
          }),
        })
      )
    })

    it('应该拒绝弱密码、重复用户名和重复邮箱', async () => {
      passwordMock.validatePasswordStrength.mockReturnValueOnce({
        valid: false,
        errors: ['密码长度至少 8 位'],
      })

      await expect(
        authService.register({
          username: 'alice',
          password: 'weak',
          realName: 'Alice',
        })
      ).rejects.toBeInstanceOf(ValidationError)

      passwordMock.validatePasswordStrength.mockReturnValue({ valid: true, errors: [] })
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 'user-exists' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'mail-exists' })

      await expect(
        authService.register({
          username: 'alice',
          password: 'Password123',
          realName: 'Alice',
        })
      ).rejects.toBeInstanceOf(ConflictError)

      await expect(
        authService.register({
          username: 'alice',
          password: 'Password123',
          email: 'alice@example.com',
          realName: 'Alice',
        })
      ).rejects.toBeInstanceOf(ConflictError)
    })
  })

  // 测试账号激活令牌的有效与无效场景。
  describe('activateAccount', () => {
    it('应该成功激活账户', async () => {
      prismaMock.activationToken.findUnique.mockResolvedValue({
        id: 'activation-1',
        userId: 'user-1',
        isUsed: false,
        expiresAt: new Date(Date.now() + 3_600_000),
        user: { id: 'user-1' },
      })
      prismaMock.activationToken.update.mockResolvedValue({ id: 'activation-1', isUsed: true })
      prismaMock.user.update.mockResolvedValue({ id: 'user-1', status: 'ACTIVE' })

      await authService.activateAccount('activation-token')

      expect(prismaMock.activationToken.update).toHaveBeenCalledWith({
        where: { id: 'activation-1' },
        data: { isUsed: true },
      })
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: 'ACTIVE' },
      })
    })

    it('应该拒绝无效、已使用或过期的激活令牌', async () => {
      prismaMock.activationToken.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'activation-1',
          userId: 'user-1',
          isUsed: true,
          expiresAt: new Date(Date.now() + 1_000),
          user: { id: 'user-1' },
        })
        .mockResolvedValueOnce({
          id: 'activation-2',
          userId: 'user-1',
          isUsed: false,
          expiresAt: new Date(Date.now() - 1_000),
          user: { id: 'user-1' },
        })

      await expect(authService.activateAccount('missing')).rejects.toBeInstanceOf(ValidationError)
      await expect(authService.activateAccount('used')).rejects.toBeInstanceOf(ValidationError)
      await expect(authService.activateAccount('expired')).rejects.toBeInstanceOf(ValidationError)
    })
  })

  // 测试忘记密码流程的防枚举行为与邮件发送。
  describe('forgotPassword', () => {
    it('应该为存在的邮箱创建重置令牌并发送邮件', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
      })
      prismaMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 })
      prismaMock.passwordResetToken.create.mockResolvedValue({ id: 'reset-1' })

      await authService.forgotPassword('alice@example.com')

      expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
      expect(prismaMock.passwordResetToken.create).toHaveBeenCalledOnce()
      expect(mailMock.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'alice@example.com',
          username: 'alice',
          token: expect.any(String),
        })
      )
    })

    it('应该对不存在的邮箱直接返回成功，防止用户枚举', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(authService.forgotPassword('nobody@example.com')).resolves.toBeUndefined()
      expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled()
      expect(mailMock.sendPasswordResetEmail).not.toHaveBeenCalled()
    })
  })

  // 测试密码重置流程的令牌校验、令牌失效和日志写入。
  describe('resetPassword', () => {
    it('应该成功重置密码，并使所有 refresh token 失效且写入系统日志', async () => {
      prismaMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'reset-1',
        userId: 'user-1',
        isUsed: false,
        expiresAt: new Date(Date.now() + 1_000),
        user: { id: 'user-1' },
      })
      prismaMock.passwordResetToken.update.mockResolvedValue({ id: 'reset-1', isUsed: true })
      prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 })
      prismaMock.user.update.mockResolvedValue({ id: 'user-1' })
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 })
      prismaMock.systemLog.create.mockResolvedValue({ id: 1 })

      await authService.resetPassword('reset-token', 'Password123', {
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      })

      expect(passwordMock.hashPassword).toHaveBeenCalledWith('Password123')
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isUsed: true },
      })
      expect(prismaMock.systemLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'user:password_reset',
            userId: 'user-1',
          }),
        })
      )
    })

    it('应该拒绝无效令牌和弱密码', async () => {
      passwordMock.validatePasswordStrength.mockReturnValueOnce({
        valid: false,
        errors: ['密码必须包含数字'],
      })

      await expect(authService.resetPassword('reset-token', 'weak')).rejects.toBeInstanceOf(
        ValidationError
      )

      passwordMock.validatePasswordStrength.mockReturnValue({ valid: true, errors: [] })
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(null)

      await expect(
        authService.resetPassword('invalid-token', 'Password123')
      ).rejects.toBeInstanceOf(ValidationError)
    })
  })

  // 测试修改密码流程的旧密码校验、同密码拦截和令牌失效。
  describe('changePassword', () => {
    it('应该成功修改密码，并使所有 refresh token 失效且写入系统日志', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser())
      prismaMock.user.update.mockResolvedValue({ id: 'user-1' })
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 })
      prismaMock.systemLog.create.mockResolvedValue({ id: 1 })

      await authService.changePassword('user-1', 'OldPassword123', 'NewPassword123', {
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      })

      expect(passwordMock.comparePassword).toHaveBeenCalledWith('OldPassword123', 'stored-hash')
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'hashed:NewPassword123' },
      })
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isUsed: true },
      })
      expect(prismaMock.systemLog.create).toHaveBeenCalledOnce()
    })

    it('应该拒绝错误的旧密码、相同新密码和不存在的用户', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(buildUser())
        .mockResolvedValueOnce(buildUser())
        .mockResolvedValueOnce(null)
      passwordMock.comparePassword.mockResolvedValueOnce(false).mockResolvedValueOnce(true)

      await expect(
        authService.changePassword('user-1', 'bad-old', 'NewPassword123')
      ).rejects.toBeInstanceOf(ValidationError)

      await expect(
        authService.changePassword('user-1', 'SamePassword123', 'SamePassword123')
      ).rejects.toBeInstanceOf(ValidationError)

      await expect(
        authService.changePassword('missing-user', 'OldPassword123', 'NewPassword123')
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  // 测试根据用户 ID 获取用户信息的返回和异常。
  describe('getUserById', () => {
    it('应该返回包含角色和权限的用户信息', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser())

      const result = await authService.getUserById('user-1')

      expect(result).toEqual(
        expect.objectContaining({
          id: 'user-1',
          username: 'alice',
          roles: ['student', 'assistant'],
          permissions: ['course:read', 'profile:update'],
        })
      )
    })

    it('应该拒绝不存在的用户', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(authService.getUserById('missing-user')).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
