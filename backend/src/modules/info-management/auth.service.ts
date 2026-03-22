import prisma from '../../shared/prisma/client.js'
import { hashPassword, comparePassword } from '../../shared/utils/password.js'
import jwt from 'jsonwebtoken'
import config from '../../config/index.js'

export const authService = {
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
      throw new Error('用户名或密码错误')
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('账户已被禁用')
    }

    const isValid = await comparePassword(password, user.passwordHash)
    if (!isValid) {
      throw new Error('用户名或密码错误')
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const roles = user.userRoles.map((ur) => ur.role.code)

    // 生成 JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        roles,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    )

    return {
      accessToken: token,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
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

  async register(data: { username: string; password: string; email?: string; realName: string; phone?: string; gender?: string }) {
    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (existingUser) {
      throw new Error('用户名已存在')
    }

    // 检查邮箱是否已存在
    if (data.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      })
      if (existingEmail) {
        throw new Error('邮箱已被注册')
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
        gender: data.gender?.toUpperCase(),
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

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    const isValid = await comparePassword(oldPassword, user.passwordHash)
    if (!isValid) {
      throw new Error('旧密码错误')
    }

    const hashedPassword = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    })
  },

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
      throw new Error('用户不存在')
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
