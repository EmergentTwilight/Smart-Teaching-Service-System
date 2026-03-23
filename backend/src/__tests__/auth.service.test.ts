/**
 * 认证服务测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authService } from '../modules/info-management/auth.service.js'
import prisma from '../shared/prisma/client.js'
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from '../shared/utils/password.js'

// Mock Prisma client
vi.mock('../shared/prisma/client.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
    userRole: {
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

// Mock password utils
vi.mock('../shared/utils/password.js', () => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
  validatePasswordStrength: vi.fn(),
}))

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        realName: 'Test User',
        passwordHash: 'hashed-password',
        gender: 'MALE',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed-password')
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser)
      vi.mocked(prisma.role.findUnique).mockResolvedValue({
        id: 'role-id',
        code: 'student',
        name: 'Student',
        description: 'Default student role',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(prisma.userRole.create).mockResolvedValue({
        id: 'user-role-id',
        userId: 'test-user-id',
        roleId: 'role-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await authService.register({
        username: 'testuser',
        password: 'Password123!',
        email: 'test@example.com',
        realName: 'Test User',
        gender: 'MALE',
      })

      expect(result.username).toBe('testuser')
      expect(result.email).toBe('test@example.com')
      expect(result.realName).toBe('Test User')
    })

    it('should throw ValidationError for weak password', async () => {
      vi.mocked(validatePasswordStrength).mockReturnValue({
        valid: false,
        errors: ['密码长度至少为 8 个字符'],
      })

      await expect(
        authService.register({
          username: 'testuser',
          password: 'weak',
          realName: 'Test User',
        })
      ).rejects.toThrow('密码强度不足')
    })

    it('should throw ConflictError for existing username', async () => {
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] })
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing-user-id',
        username: 'existinguser',
        passwordHash: 'hash',
        realName: 'Existing User',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(
        authService.register({
          username: 'existinguser',
          password: 'Password123!',
          realName: 'Test User',
        })
      ).rejects.toThrow('用户名已存在')
    })
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        passwordHash: 'hashed-password',
        email: 'test@example.com',
        realName: 'Test User',
        status: 'ACTIVE',
        userRoles: [{ role: { code: 'student' } }],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
      vi.mocked(comparePassword).mockResolvedValue(true)
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser)
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({
        id: 'token-id',
        userId: 'user-id',
        tokenHash: 'hash',
        expiresAt: new Date(),
        isUsed: false,
        createdAt: new Date(),
      })
      vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 0 })

      const result = await authService.login('testuser', 'Password123!')

      expect(result.accessToken).toBeDefined()
      expect(result.refreshToken).toBeDefined()
      expect(result.tokenType).toBe('Bearer')
      expect(result.user.username).toBe('testuser')
    })

    it('should throw UnauthorizedError for invalid username', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      await expect(authService.login('nonexistent', 'password')).rejects.toThrow('用户名或密码错误')
    })

    it('should throw UnauthorizedError for invalid password', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        passwordHash: 'hashed-password',
        status: 'ACTIVE',
        userRoles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
      vi.mocked(comparePassword).mockResolvedValue(false)

      await expect(authService.login('testuser', 'wrongpassword')).rejects.toThrow(
        '用户名或密码错误'
      )
    })

    it('should throw ForbiddenError for disabled account', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        passwordHash: 'hashed-password',
        status: 'INACTIVE',
        userRoles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

      await expect(authService.login('testuser', 'password')).rejects.toThrow('账户已被禁用')
    })
  })
})
