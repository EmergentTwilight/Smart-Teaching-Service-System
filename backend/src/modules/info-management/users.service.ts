/**
 * 用户管理服务
 * 处理用户 CRUD 和系统日志查询
 */
import prisma from '../../shared/prisma/client.js'
import { hashPassword, comparePassword } from '../../shared/utils/password.js'
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '@stss/shared'
import type {
  GetUsersQuery,
  CreateUserInput,
  UpdateUserInput,
  GetLogsQuery,
  BatchCreateUsersInput,
  BatchUpdateStatusInput,
  ChangePasswordInput,
  ResetPasswordInput,
  UpdateStatusInput,
  AssignRolesInput,
} from './users.types.js'
import type { Prisma, Gender, UserStatus } from '@prisma/client'

export const usersService = {
  /**
   * 获取用户列表（分页）
   */
  async getUsers(query: GetUsersQuery) {
    const { page, pageSize, keyword, status, role } = query
    const skip = (page - 1) * pageSize

    const where: Prisma.UserWhereInput = {}

    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { realName: { contains: keyword } },
        { email: { contains: keyword } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (role) {
      where.userRoles = {
        some: {
          role: {
            code: role,
          },
        },
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    const items = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      realName: user.realName,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      status: user.status,
      roles: user.userRoles.map((ur) => ur.role.code),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  },

  /**
   * 根据 ID 获取用户详情
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      realName: user.realName,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      status: user.status,
      roles: user.userRoles.map((ur) => ur.role.code),
      student: user.student,
      teacher: user.teacher,
      admin: user.admin,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  },

  /**
   * 创建用户
   */
  async createUser(data: CreateUserInput) {
    // 检查用户名是否存在
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (existingUser) {
      throw new ConflictError('用户名已存在')
    }

    // 检查邮箱是否存在
    if (data.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      })
      if (existingEmail) {
        throw new ConflictError(`邮箱 ${data.email} 已被注册`)
      }
    }

    const hashedPassword = await hashPassword(data.password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { roleIds, password: _unusedPassword, ...userData } = data

    const user = await prisma.user.create({
      data: {
        ...userData,
        passwordHash: hashedPassword,
      },
    })

    if (roleIds && roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId: user.id,
          roleId,
        })),
      })
    }

    return this.getUserById(user.id)
  },

  /**
   * 更新用户信息
   * 支持更新基本信息、状态和角色
   * 注意：此方法不允许修改密码
   * - 密码修改请使用 changePassword 或 resetPassword
   */
  async updateUser(id: string, data: UpdateUserInput) {
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const { gender, email, roleIds, status, ...restData } = data

    // 邮箱唯一性检查：只有当新邮箱与当前用户不同时才检查
    if (email !== undefined && email !== user.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      })
      if (existingEmail) {
        throw new ConflictError(`邮箱 ${email} 已被注册`)
      }
    }

    const updatePayload: Prisma.UserUpdateInput = {
      ...restData,
      email: email,
      gender: gender as Gender | null | undefined,
      status: status as UserStatus | undefined,
    }

    // 使用事务更新用户信息和角色
    await prisma.$transaction(async (tx) => {
      // 更新用户基本信息
      await tx.user.update({
        where: { id },
        data: updatePayload,
      })

      // 如果提供了 roleIds，则更新角色
      if (roleIds !== undefined) {
        // 先删除所有现有角色
        await tx.userRole.deleteMany({
          where: { userId: id },
        })

        // 添加新角色
        if (roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({
              userId: id,
              roleId,
            })),
          })
        }
      }
    })

    return this.getUserById(id)
  },

  /**
   * 删除用户
   */
  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    // 使用事务确保：先吊销 token，再删除用户（会级联删除 userRoles）
    await prisma.$transaction([
      // 删除该用户的所有 refresh token
      prisma.refreshToken.deleteMany({
        where: { userId: id },
      }),
      // 删除用户（会级联删除 userRoles）
      prisma.user.delete({
        where: { id },
      }),
    ])
  },

  /**
   * 获取系统日志（分页）
   */
  async getLogs(query: GetLogsQuery) {
    const { page, pageSize, userId, action, resourceType, startDate, endDate } = query
    const skip = (page - 1) * pageSize

    const where: Prisma.SystemLogWhereInput = {}

    if (userId) {
      where.userId = userId
    }

    if (action) {
      where.action = { contains: action }
    }

    if (resourceType) {
      where.resourceType = resourceType
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        skip,
        take: pageSize,
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
      }),
      prisma.systemLog.count({ where }),
    ])

    const items = logs.map((log) => ({
      id: log.id.toString(),
      userId: log.userId,
      username: log.user?.username || null,
      realName: log.user?.realName || null,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      details: log.details,
      createdAt: log.createdAt,
    }))

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  },

  // ==================== 新增方法 ====================

  /**
   * 批量创建用户
   */
  async batchCreateUsers(data: BatchCreateUsersInput) {
    // 数量上限检查
    if (data.users.length > 100) {
      throw new ValidationError('单次最多创建 100 个用户')
    }

    const results: Array<{
      id: string
      username: string
      email: string | null
      phone: string | null
      realName: string
      gender: Gender | null
      status: UserStatus
    }> = []

    await prisma.$transaction(async (tx) => {
      // 批量查询已存在的用户名
      const usernames = data.users.map((u) => u.username)
      const existingUsers = await tx.user.findMany({
        where: { username: { in: usernames } },
        select: { username: true },
      })
      if (existingUsers.length > 0) {
        throw new ConflictError(`用户名已存在: ${existingUsers.map((u) => u.username).join(', ')}`)
      }

      // 批量查询已存在的邮箱
      const emails = data.users.filter((u) => u.email).map((u) => u.email as string)
      if (emails.length > 0) {
        const existingEmails = await tx.user.findMany({
          where: { email: { in: emails } },
          select: { email: true },
        })
        if (existingEmails.length > 0) {
          throw new ConflictError(`邮箱已被注册: ${existingEmails.map((u) => u.email).join(', ')}`)
        }
      }

      // 并行 hash 所有密码
      const hashedPasswords = await Promise.all(data.users.map((u) => hashPassword(u.password)))

      for (let i = 0; i < data.users.length; i++) {
        const userData = data.users[i]
        const hashedPassword = hashedPasswords[i]
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { roleIds, password, ...createData } = userData

        const user = await tx.user.create({
          data: {
            ...createData,
            passwordHash: hashedPassword,
          },
        })

        // 分配角色
        if (roleIds && roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({
              userId: user.id,
              roleId,
            })),
          })
        }

        results.push({
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          realName: user.realName,
          gender: user.gender,
          status: user.status,
        })
      }
    })

    return {
      success: true,
      created_count: results.length,
      users: results,
    }
  },

  /**
   * 批量修改用户状态
   */
  async batchUpdateStatus(data: BatchUpdateStatusInput) {
    const { userIds, status } = data

    // 数量上限检查
    if (userIds.length > 100) {
      throw new ValidationError('单次最多修改 100 个用户')
    }

    const existingUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
    })

    if (existingUsers.length !== userIds.length) {
      const missingIds = userIds.filter((id) => !existingUsers.some((u) => u.id === id))
      throw new NotFoundError(`用户不存在: ${missingIds.join(', ')}`)
    }

    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { status },
    })

    return {
      updated_count: existingUsers.length,
      failed_count: userIds.length - existingUsers.length,
    }
  },

  /**
   * 修改密码（用户自己修改）
   */
  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const isValid = await comparePassword(data.oldPassword, user.passwordHash)
    if (!isValid) {
      throw new ValidationError('旧密码错误')
    }

    const hashedPassword = await hashPassword(data.newPassword)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      }),
      // 吊销所有 Refresh Token，强制重新登录
      // 注意：isUsed 语义是"已使用/已吊销"，在此用于标记 token 失效
      // 这是一种简化实现，避免需要额外的 revokedAt 或 isValid 字段
      prisma.refreshToken.updateMany({
        where: { userId },
        data: { isUsed: true },
      }),
    ])
  },

  /**
   * 重置密码（管理员操作）
   */
  async resetPassword(userId: string, data: ResetPasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const hashedPassword = await hashPassword(data.newPassword)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      }),
      // 吊销所有 Refresh Token，强制重新登录
      // 注意：isUsed 语义是"已使用/已吊销"，在此用于标记 token 失效
      // 这是一种简化实现，避免需要额外的 revokedAt 或 isValid 字段
      prisma.refreshToken.updateMany({
        where: { userId },
        data: { isUsed: true },
      }),
    ])
  },

  /**
   * 修改用户状态
   */
  async updateStatus(userId: string, data: UpdateStatusInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: data.status },
    })

    return this.getUserById(userId)
  },

  /**
   * 分配角色
   */
  async assignRoles(userId: string, data: AssignRolesInput, currentUserId?: string) {
    // 先检查用户和角色存在性（在事务外做，减少事务时间）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    // 支持通过角色 ID 或角色代码分配角色
    const existingRoles = await prisma.role.findMany({
      where: {
        OR: [{ id: { in: data.roleIds } }, { code: { in: data.roleIds } }],
      },
    })

    if (existingRoles.length !== data.roleIds.length) {
      const missingIds = data.roleIds.filter(
        (id) => !existingRoles.some((r) => r.id === id || r.code === id)
      )
      throw new NotFoundError(`角色不存在: ${missingIds.join(', ')}`)
    }

    // 检查是否在修改自己的角色（在事务外做）
    if (currentUserId && userId === currentUserId) {
      const targetCodes = existingRoles.map((r) => r.code)
      const currentPrivilegedRoles = user.userRoles
        .map((ur) => ur.role.code)
        .filter((code) => ['admin', 'super_admin'].includes(code))
      const isRemovingPrivilegedRole =
        currentPrivilegedRoles.length > 0 &&
        !targetCodes.some((c) => ['admin', 'super_admin'].includes(c))

      if (isRemovingPrivilegedRole) {
        throw new ForbiddenError('不能移除自己的管理员角色')
      }
    }

    // 使用事务保证原子性（先删角色，再创建新角色，最后吊销 token）
    await prisma.$transaction([
      // 先删除已有角色
      prisma.userRole.deleteMany({
        where: { userId },
      }),
      // 再创建新角色（使用查询到的角色 ID）
      prisma.userRole.createMany({
        data: existingRoles.map((role) => ({
          userId,
          roleId: role.id,
        })),
      }),
      // 吊销所有 Refresh Token
      prisma.refreshToken.deleteMany({
        where: { userId },
      }),
    ])

    return this.getUserById(userId)
  },

  /**
   * 撤销角色
   */
  async revokeRole(userId: string, roleIdOrCode: string, currentUserId?: string) {
    // 先查找角色（支持 ID 或代码）
    const role = await prisma.role.findFirst({
      where: {
        OR: [{ id: roleIdOrCode }, { code: roleIdOrCode }],
      },
    })

    if (!role) {
      throw new NotFoundError('角色不存在')
    }

    const roleId = role.id

    // 检查是否在撤销自己的角色
    if (currentUserId && userId === currentUserId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { userRoles: { include: { role: true } } },
      })
      if (user && ['admin', 'super_admin'].includes(role.code)) {
        // 检查用户是否只有这一个特权角色
        const privilegedRoles = user.userRoles
          .map((ur) => ur.role.code)
          .filter((code) => ['admin', 'super_admin'].includes(code))
        if (privilegedRoles.length <= 1) {
          throw new ForbiddenError('不能撤销自己的最后一个管理员角色')
        }
      }
    }

    const userRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    })

    if (!userRole) {
      throw new NotFoundError('用户未分配此角色')
    }

    await prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    })

    // 角色变更后吊销所有 Refresh Token，强制重新登录以获取新权限
    await prisma.refreshToken.deleteMany({
      where: { userId },
    })

    return this.getUserById(userId)
  },

  /**
   * 获取用户权限列表
   */
  async getUserPermissions(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
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
      },
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((userRole) =>
          userRole.role.permissions.map((rp) => rp.permission.code)
        )
      )
    )

    return {
      user_id: userId,
      username: user.username,
      permissions,
    }
  },
}
