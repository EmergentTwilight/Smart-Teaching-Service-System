/**
 * 认证服务
 * 处理登录、注册、登出、账号激活、密码重置等业务逻辑
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
  TooManyRequestsError,
} from '@stss/shared'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import config from '../../config/index.js'
import { redisClient } from '../../config/redis.js'
import { sendPasswordResetEmail } from '../../config/mail.js'
import type { Gender, Prisma } from '@prisma/client'

const LOGIN_FAILURE_WINDOW_SECONDS = 5 * 60
const LOGIN_LOCK_SECONDS = 15 * 60
const LOGIN_FAILURE_LIMIT = 5
const PASSWORD_RESET_TOKEN_TTL_SECONDS = 60 * 60
const ACTIVATION_TOKEN_TTL_SECONDS = 24 * 60 * 60

type AuditMeta = {
  ip_address?: string
  user_agent?: string
}

type LoginInput = AuditMeta & {
  username: string
  password: string
}

const userAuthInclude = {
  userRoles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude

/**
 * 生成随机令牌
 * @returns 随机令牌字符串
 */
function generateOpaqueToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

/**
 * 对令牌进行哈希，避免明文落库
 * @param token 原始令牌
 * @returns 哈希后的令牌
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * 解析 JWT 过期时间字符串为秒数
 * @param expiresIn 过期时间字符串
 * @returns 秒数
 */
function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/)
  if (!match) {
    return 7 * 24 * 60 * 60
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
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  })
}

/**
 * 构造登录失败计数键
 * @param username 用户名
 * @param ipAddress IP 地址
 * @returns Redis 键
 */
function getLoginFailureKey(username: string, ipAddress: string): string {
  return `auth:login_failures:${username}:${ipAddress}`
}

/**
 * 构造登录锁定键
 * @param username 用户名
 * @param ipAddress IP 地址
 * @returns Redis 键
 */
function getLoginLockKey(username: string, ipAddress: string): string {
  return `auth:login_lock:${username}:${ipAddress}`
}

/**
 * 标准化用户输出
 * @param user 用户对象
 * @returns 面向 API 的用户信息
 */
function serializeUser(
  user: Prisma.UserGetPayload<{
    include: typeof userAuthInclude
  }>
) {
  const roles = user.userRoles.map((userRole) => userRole.role.code)
  const permissions = Array.from(
    new Set(
      user.userRoles.flatMap((userRole) =>
        userRole.role.permissions.map((rolePermission) => rolePermission.permission.code)
      )
    )
  )

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    realName: user.realName,
    avatarUrl: user.avatarUrl,
    gender: user.gender,
    status: user.status.toLowerCase(),
    lastLoginAt: user.lastLoginAt,
    roles,
    permissions,
  }
}

/**
 * 写入系统日志
 * @param params 日志参数
 */
async function createSystemLog(params: {
  user_id?: string
  action: string
  resource_type?: string
  resource_id?: string
  details?: Prisma.InputJsonValue
  ip_address?: string
  user_agent?: string
}): Promise<void> {
  await prisma.systemLog.create({
    data: {
      userId: params.user_id,
      action: params.action,
      resourceType: params.resource_type,
      resourceId: params.resource_id,
      details: params.details,
      ipAddress: params.ip_address,
      userAgent: params.user_agent,
    },
  })
}

/**
 * 检查登录是否被锁定
 * @param username 用户名
 * @param ipAddress IP 地址
 */
async function ensureLoginNotLocked(username: string, ipAddress: string): Promise<void> {
  const lockKey = getLoginLockKey(username, ipAddress)
  const lockUntil = await redisClient.get(lockKey)

  if (lockUntil) {
    throw new TooManyRequestsError('登录失败次数过多，请 15 分钟后再试')
  }
}

/**
 * 记录登录失败
 * @param username 用户名
 * @param ipAddress IP 地址
 */
async function recordLoginFailure(username: string, ipAddress: string): Promise<void> {
  const failureKey = getLoginFailureKey(username, ipAddress)
  const lockKey = getLoginLockKey(username, ipAddress)

  const count = await redisClient.incr(failureKey)
  await redisClient.expire(failureKey, LOGIN_FAILURE_WINDOW_SECONDS)

  if (count >= LOGIN_FAILURE_LIMIT) {
    await redisClient.set(lockKey, new Date(Date.now() + LOGIN_LOCK_SECONDS * 1000).toISOString(), {
      ex: LOGIN_LOCK_SECONDS,
    })
  }
}

/**
 * 清理登录失败记录
 * @param username 用户名
 * @param ipAddress IP 地址
 */
async function clearLoginFailures(username: string, ipAddress: string): Promise<void> {
  await redisClient.del(getLoginFailureKey(username, ipAddress))
  await redisClient.del(getLoginLockKey(username, ipAddress))
}

/**
 * 构建访问令牌
 * @param user 用户对象
 * @returns access token
 */
function issueAccessToken(
  user: Prisma.UserGetPayload<{
    include: typeof userAuthInclude
  }>
): string {
  const roles = user.userRoles.map((userRole) => userRole.role.code)

  return generateJwtToken(
    {
      userId: user.id,
      username: user.username,
      roles,
      type: 'access',
    },
    config.jwt.accessTokenExpiresIn
  )
}

/**
 * 创建账号激活令牌
 * @param userId 用户 ID
 * @returns 激活令牌
 */
async function createActivationToken(userId: string): Promise<string> {
  const token = generateOpaqueToken()

  await prisma.activationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_SECONDS * 1000),
    },
  })

  return token
}

export const authService = {
  /**
   * 用户登录
   * @param input 登录输入
   * @returns 登录结果
   */
  async login(input: LoginInput) {
    const ipAddress = input.ip_address || 'unknown'
    await ensureLoginNotLocked(input.username, ipAddress)

    const user = await prisma.user.findUnique({
      where: { username: input.username },
      include: userAuthInclude,
    })

    if (!user) {
      await recordLoginFailure(input.username, ipAddress)
      throw new UnauthorizedError('用户名或密码错误')
    }

    if (user.status === 'INACTIVE') {
      throw new ForbiddenError('账号尚未激活')
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('账户已被禁用')
    }

    const isValid = await comparePassword(input.password, user.passwordHash)
    if (!isValid) {
      await recordLoginFailure(input.username, ipAddress)
      throw new UnauthorizedError('用户名或密码错误')
    }

    await clearLoginFailures(input.username, ipAddress)

    const lastLoginAt = new Date()
    const [refreshTokenValue, updatedUser] = await prisma.$transaction(async (tx) => {
      const refreshedUser = await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt },
        include: userAuthInclude,
      })

      const tokenValue = generateOpaqueToken()
      const refreshTokenExpiresIn = parseExpiresIn(config.jwt.refreshTokenExpiresIn)

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(tokenValue),
          expiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
        },
      })

      await tx.refreshToken.deleteMany({
        where: {
          userId: user.id,
          OR: [{ expiresAt: { lt: new Date() } }, { isUsed: true }],
        },
      })

      await tx.systemLog.create({
        data: {
          userId: user.id,
          action: 'auth:login',
          resourceType: 'auth',
          resourceId: user.id,
          ipAddress: input.ip_address,
          userAgent: input.user_agent,
          details: {
            username: user.username,
            last_login_at: lastLoginAt.toISOString(),
          },
        },
      })

      return [tokenValue, refreshedUser] as const
    })

    return {
      accessToken: issueAccessToken(updatedUser),
      refreshToken: refreshTokenValue,
      expiresIn: parseExpiresIn(config.jwt.accessTokenExpiresIn),
      tokenType: 'Bearer',
      user: serializeUser(updatedUser),
    }
  },

  /**
   * 刷新访问令牌
   * @param refreshTokenValue 刷新令牌
   * @returns 新的访问令牌和刷新令牌
   */
  async refreshToken(refreshTokenValue: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshTokenValue) },
      include: {
        user: {
          include: userAuthInclude,
        },
      },
    })

    if (!storedToken) {
      throw new UnauthorizedError('无效的刷新令牌')
    }

    if (storedToken.isUsed) {
      throw new UnauthorizedError('刷新令牌已使用，请重新登录')
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('刷新令牌已过期，请重新登录')
    }

    if (storedToken.user.status !== 'ACTIVE') {
      throw new ForbiddenError('账户已被禁用')
    }

    const newRefreshTokenValue = generateOpaqueToken()
    const refreshTokenExpiresIn = parseExpiresIn(config.jwt.refreshTokenExpiresIn)

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isUsed: true },
      }),
      prisma.refreshToken.create({
        data: {
          userId: storedToken.user.id,
          tokenHash: hashToken(newRefreshTokenValue),
          expiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
        },
      }),
    ])

    return {
      accessToken: issueAccessToken(storedToken.user),
      refreshToken: newRefreshTokenValue,
      expiresIn: parseExpiresIn(config.jwt.accessTokenExpiresIn),
      tokenType: 'Bearer',
    }
  },

  /**
   * 用户登出
   * @param input 登出输入
   */
  async logout(input: {
    user_id: string
    refresh_token: string
    ip_address?: string
    user_agent?: string
  }) {
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId: input.user_id,
        tokenHash: hashToken(input.refresh_token),
        isUsed: false,
      },
      data: { isUsed: true },
    })

    if (result.count === 0) {
      throw new UnauthorizedError('刷新令牌无效或已失效')
    }

    await createSystemLog({
      user_id: input.user_id,
      action: 'auth:logout',
      resource_type: 'auth',
      resource_id: input.user_id,
      ip_address: input.ip_address,
      user_agent: input.user_agent,
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
    real_name: string
    phone?: string
    gender?: string
  }) {
    const passwordValidation = validatePasswordStrength(data.password)
    if (!passwordValidation.valid) {
      throw new ValidationError(`密码强度不足: ${passwordValidation.errors.join(', ')}`)
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (existingUser) {
      throw new ConflictError('用户名已存在')
    }

    if (data.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      })
      if (existingEmail) {
        throw new ConflictError('邮箱已被注册')
      }
    }

    const hashedPassword = await hashPassword(data.password)
    const createdUser = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash: hashedPassword,
        email: data.email,
        realName: data.real_name,
        phone: data.phone,
        gender: data.gender?.toUpperCase() as Gender | undefined,
        status: 'INACTIVE',
      },
    })

    const studentRole = await prisma.role.findUnique({
      where: { code: 'student' },
    })

    if (studentRole) {
      await prisma.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: studentRole.id,
        },
      })
    }

    const activationToken = await createActivationToken(createdUser.id)

    return {
      id: createdUser.id,
      username: createdUser.username,
      email: createdUser.email,
      realName: createdUser.realName,
      activationToken,
    }
  },

  /**
   * 激活账号
   * @param token 激活令牌
   */
  async activateAccount(token: string) {
    const activationToken = await prisma.activationToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: true,
      },
    })

    if (!activationToken || activationToken.isUsed || activationToken.expiresAt < new Date()) {
      throw new ValidationError('激活令牌无效或已过期')
    }

    await prisma.$transaction([
      prisma.activationToken.update({
        where: { id: activationToken.id },
        data: { isUsed: true },
      }),
      prisma.user.update({
        where: { id: activationToken.userId },
        data: { status: 'ACTIVE' },
      }),
    ])
  },

  /**
   * 发起忘记密码流程
   * @param email 邮箱
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return
    }

    const token = generateOpaqueToken()
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_SECONDS * 1000)

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt,
        },
      }),
    ])

    await sendPasswordResetEmail({
      to: email,
      username: user.username,
      token,
      expires_at: expiresAt.toISOString(),
    })
  },

  /**
   * 重置密码
   * @param token 重置令牌
   * @param newPassword 新密码
   * @param meta 审计信息
   */
  async verifyResetToken(token: string): Promise<boolean> {
    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    })

    if (
      !passwordResetToken ||
      passwordResetToken.isUsed ||
      passwordResetToken.expiresAt < new Date()
    ) {
      return false
    }

    return true
  },

  async resetPassword(token: string, newPassword: string, meta: AuditMeta = {}) {
    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.valid) {
      throw new ValidationError(`密码强度不足: ${passwordValidation.errors.join(', ')}`)
    }

    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: true,
      },
    })

    if (
      !passwordResetToken ||
      passwordResetToken.isUsed ||
      passwordResetToken.expiresAt < new Date()
    ) {
      throw new ValidationError('重置令牌无效或已过期')
    }

    const hashedPassword = await hashPassword(newPassword)

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: passwordResetToken.id },
        data: { isUsed: true },
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          userId: passwordResetToken.userId,
          id: { not: passwordResetToken.id },
        },
        data: { isUsed: true },
      }),
      prisma.user.update({
        where: { id: passwordResetToken.userId },
        data: { passwordHash: hashedPassword },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: passwordResetToken.userId },
        data: { isUsed: true },
      }),
      prisma.systemLog.create({
        data: {
          userId: passwordResetToken.userId,
          action: 'user:password_reset',
          resourceType: 'user',
          resourceId: passwordResetToken.userId,
          ipAddress: meta.ip_address,
          userAgent: meta.user_agent,
        },
      }),
    ])
  },

  /**
   * 修改密码
   * @param userId 用户ID
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   * @param meta 审计信息
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    meta: AuditMeta = {}
  ) {
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

    if (oldPassword === newPassword) {
      throw new ValidationError('新密码不能与旧密码相同')
    }

    const hashedPassword = await hashPassword(newPassword)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      }),
      prisma.refreshToken.updateMany({
        where: { userId },
        data: { isUsed: true },
      }),
      prisma.systemLog.create({
        data: {
          userId,
          action: 'user:password_change',
          resourceType: 'user',
          resourceId: userId,
          ipAddress: meta.ip_address,
          userAgent: meta.user_agent,
        },
      }),
    ])
  },

  /**
   * 获取当前用户信息
   * @param userId 用户ID
   * @returns 用户信息
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: userAuthInclude,
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    return serializeUser(user)
  },
}
