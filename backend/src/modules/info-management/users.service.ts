/**
 * 用户管理服务
 * 处理用户 CRUD 和系统日志查询
 */
import prisma from '../../shared/prisma/client.js'
import { hashPassword, comparePassword } from '../../shared/utils/password.js'
import { NotFoundError, ConflictError, ValidationError } from '@stss/shared'
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
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (existingUser) {
      throw new ConflictError('用户名已存在')
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
   */
  async updateUser(id: string, data: UpdateUserInput) {
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const { roleIds, password, gender, ...updateData } = data

    const updatePayload: Prisma.UserUpdateInput = {
      ...updateData,
      gender: gender as Gender | null | undefined,
    }

    if (password) {
      updatePayload.passwordHash = await hashPassword(password)
    }

    await prisma.user.update({
      where: { id },
      data: updatePayload,
    })

    if (roleIds) {
      await prisma.userRole.deleteMany({
        where: { userId: id },
      })

      if (roleIds.length > 0) {
        await prisma.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: id,
            roleId,
          })),
        })
      }
    }

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

    await prisma.user.delete({
      where: { id },
    })
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
      for (const userData of data.users) {
        // 检查用户名是否存在
        const existingUser = await tx.user.findUnique({
          where: { username: userData.username },
        })
        if (existingUser) {
          throw new ConflictError(`用户名 ${userData.username} 已存在`)
        }

        // 检查邮箱是否存在
        if (userData.email) {
          const existingEmail = await tx.user.findUnique({
            where: { email: userData.email },
          })
          if (existingEmail) {
            throw new ConflictError(`邮箱 ${userData.email} 已被注册`)
          }
        }

        // 创建用户
        const hashedPassword = await hashPassword(userData.password)
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
  async assignRoles(userId: string, data: AssignRolesInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const existingRoles = await prisma.role.findMany({
      where: { id: { in: data.roleIds } },
    })

    if (existingRoles.length !== data.roleIds.length) {
      const missingIds = data.roleIds.filter((id) => !existingRoles.some((r) => r.id === id))
      throw new NotFoundError(`角色不存在: ${missingIds.join(', ')}`)
    }

    await prisma.userRole.createMany({
      data: data.roleIds.map((roleId) => ({
        userId,
        roleId,
      })),
    })

    return this.getUserById(userId)
  },

  /**
   * 撤销角色
   */
  async revokeRole(userId: string, roleId: string) {
    const userRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    })

    if (!userRole) {
      throw new NotFoundError('用户未分配此角色')
    }

    await prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
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
