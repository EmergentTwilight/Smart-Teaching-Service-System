/**
 * 认证服务
 * 处理登录、注册、密码修改等业务逻辑
 */
import prisma from '../../shared/prisma/client.js'
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from '../../shared/utils/password.js'
import {
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  NotFoundError,
} from '../../shared/errors/AppError.js'
import jwt, { type SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'
import config from '../../config/index.js'
import type { Gender } from '@prisma/client'

/**
 * 生成刷新令牌
 * @returns 随机生成的刷新令牌
 */
function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

/**
 * 对令牌进行哈希（用于安全存储）
 * @param token 原始令牌
 * @returns 哈希后的令牌
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * 解析 JWT 过期时间字符串为秒数
 * @param expiresIn 过期时间字符串（如 '15m', '7d'）
 * @returns 秒数
 */
function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/)
  if (!match) {
    return 7 * 24 * 60 * 60 // 默认 7 天
  }
  const value = parseInt(match[1], 10)
  const unit = match[2]
  switch (unit) {
    case 's':
      return value
    case 'm':
      return value * 60
    case 'h':
      return value * 60 * 60
    case 'd':
      return value * 24 * 60 * 60
    default:
      return 7 * 24 * 60 * 60
  }
}

/**
 * 生成 JWT Token
 * @param payload Token 载荷
 * @param expiresIn 过期时间
 * @returns JWT 字符串
 */
function generateJwtToken(payload: object, expiresIn: string): string {
  // 使用类型断言绕过 TypeScript 的严格类型检查
  // expiresIn 格式：如 '15m', '7d', '1h' 等
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  })
}

export const authService = {
  /**
   * 用户登录
   * @param username 用户名
   * @param password 密码
   * @returns 登录信息（access token、refresh token 和用户数据）
   */
  async login(username: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!user) {
      throw new UnauthorizedError('用户名或密码错误')
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('账户已被禁用')
    }

    const isValid = await comparePassword(password, user.passwordHash)
    if (!isValid) {
      throw new UnauthorizedError('用户名或密码错误')
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const roles = user.userRoles.map((ur) => ur.role.code)

    // 生成 Access Token（短时效）
    const accessToken = generateJwtToken(
      {
        userId: user.id,
        username: user.username,
        roles,
        type: 'access',
      },
      config.jwt.accessTokenExpiresIn
    )

    // 生成 Refresh Token（长时效）
    const refreshTokenValue = generateRefreshToken()
    const refreshTokenHash = hashToken(refreshTokenValue)
    const refreshTokenExpiresIn = parseExpiresIn(config.jwt.refreshTokenExpiresIn)
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenExpiresIn * 1000)

    // 存储 Refresh Token 到数据库
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshTokenExpiresAt,
      },
    })

    // 清理该用户的过期或已使用的旧令牌
    await prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
        OR: [{ expiresAt: { lt: new Date() } }, { isUsed: true }],
      },
    })

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: parseExpiresIn(config.jwt.accessTokenExpiresIn),
      tokenType: 'Bearer',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        realName: user.realName,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        status: user.status,
        roles,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    }
  },

  /**
   * 刷新访问令牌
   * @param refreshTokenValue 刷新令牌
   * @returns 新的访问令牌和刷新令牌
   */
  async refreshToken(refreshTokenValue: string) {
    const refreshTokenHash = hashToken(refreshTokenValue)

    // 查找刷新令牌
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: refreshTokenHash },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    })

    if (!storedToken) {
      throw new UnauthorizedError('无效的刷新令牌')
    }

    // 检查令牌是否已使用
    if (storedToken.isUsed) {
      throw new UnauthorizedError('刷新令牌已使用，请重新登录')
    }

    // 检查令牌是否过期
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('刷新令牌已过期，请重新登录')
    }

    // 检查用户状态
    if (storedToken.user.status !== 'ACTIVE') {
      throw new ForbiddenError('账户已被禁用')
    }

    // 标记当前令牌为已使用
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isUsed: true },
    })

    const roles = storedToken.user.userRoles.map((ur) => ur.role.code)

    // 生成新的 Access Token
    const accessToken = generateJwtToken(
      {
        userId: storedToken.user.id,
        username: storedToken.user.username,
        roles,
        type: 'access',
      },
      config.jwt.accessTokenExpiresIn
    )

    // 生成新的 Refresh Token（刷新令牌轮换）
    const newRefreshTokenValue = generateRefreshToken()
    const newRefreshTokenHash = hashToken(newRefreshTokenValue)
    const refreshTokenExpiresIn = parseExpiresIn(config.jwt.refreshTokenExpiresIn)
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenExpiresIn * 1000)

    // 存储新的 Refresh Token
    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: newRefreshTokenHash,
        expiresAt: refreshTokenExpiresAt,
      },
    })

    return {
      accessToken,
      refreshToken: newRefreshTokenValue,
      expiresIn: parseExpiresIn(config.jwt.accessTokenExpiresIn),
      tokenType: 'Bearer',
    }
  },

  /**
   * 撤销刷新令牌（登出时调用）
   * @param refreshTokenValue 刷新令牌
   */
  async revokeRefreshToken(refreshTokenValue: string) {
    const refreshTokenHash = hashToken(refreshTokenValue)

    await prisma.refreshToken.updateMany({
      where: { tokenHash: refreshTokenHash },
      data: { isUsed: true },
    })
  },

  /**
   * 用户注册
   * @param data 注册数据
   * @returns 新创建的用户信息
   */
  async register(data: {
    username: string
    password: string
    email?: string
    realName: string
    phone?: string
    gender?: string
  }) {
    // 验证密码强度
    const passwordValidation = validatePasswordStrength(data.password)
    if (!passwordValidation.valid) {
      throw new ValidationError(`密码强度不足: ${passwordValidation.errors.join(', ')}`)
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (existingUser) {
      throw new ConflictError('用户名已存在')
    }

    // 检查邮箱是否已存在
    if (data.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      })
      if (existingEmail) {
        throw new ConflictError('邮箱已被注册')
      }
    }

    // 创建用户
    const hashedPassword = await hashPassword(data.password)
    const user = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash: hashedPassword,
        email: data.email,
        realName: data.realName,
        phone: data.phone,
        gender: data.gender?.toUpperCase() as Gender | undefined,
      },
    })

    // 分配默认角色
    const studentRole = await prisma.role.findUnique({
      where: { code: 'student' },
    })

    if (studentRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: studentRole.id,
        },
      })
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      realName: user.realName,
    }
  },

  /**
   * 修改密码
   * @param userId 用户ID
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    // 验证新密码强度
    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.valid) {
      throw new ValidationError(`密码强度不足: ${passwordValidation.errors.join(', ')}`)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const isValid = await comparePassword(oldPassword, user.passwordHash)
    if (!isValid) {
      throw new ValidationError('旧密码错误')
    }

    // 新密码不能与旧密码相同
    if (oldPassword === newPassword) {
      throw new ValidationError('新密码不能与旧密码相同')
    }

    const hashedPassword = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    })
  },

  /**
   * 根据 ID 获取用户信息
   * @param userId 用户ID
   * @returns 用户信息
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const roles = user.userRoles.map((ur) => ur.role.code)

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      realName: user.realName,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      status: user.status,
      roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  },
}
