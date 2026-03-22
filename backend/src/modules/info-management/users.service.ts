import prisma from '../../shared/prisma/client.js'
import { hashPassword } from '../../shared/utils/password.js'
import type { GetUsersQuery, CreateUserInput, UpdateUserInput, GetLogsQuery } from './users.types.js'
import type { Prisma } from '@prisma/client'

export const usersService = {
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
      throw new Error('用户不存在')
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

  async createUser(data: CreateUserInput) {
    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (existingUser) {
      throw new Error('用户名已存在')
    }

    // 创建用户
    const hashedPassword = await hashPassword(data.password)
    const { roleIds, password, ...userData } = data

    const user = await prisma.user.create({
      data: {
        ...userData,
        gender: userData.gender?.toUpperCase(),
        passwordHash: hashedPassword,
      },
    })

    // 分配角色
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

  async updateUser(id: string, data: UpdateUserInput) {
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    const { roleIds, password, ...updateData } = data

    const updatePayload: Prisma.UserUpdateInput = {
      ...updateData,
      gender: updateData.gender,
    }

    // 如果提供了密码，则更新密码
    if (password) {
      updatePayload.passwordHash = await hashPassword(password)
    }

    // 更新用户信息
    await prisma.user.update({
      where: { id },
      data: updatePayload,
    })

    // 更新角色
    if (roleIds) {
      // 删除旧角色
      await prisma.userRole.deleteMany({
        where: { userId: id },
      })

      // 添加新角色
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

  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    await prisma.user.delete({
      where: { id },
    })
  },

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
}
