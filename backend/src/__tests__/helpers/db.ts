/**
 * 测试数据库辅助函数
 * 用于集成测试的数据库设置和数据填充
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

let prisma: PrismaClient | null = null

/**
 * 获取测试数据库 Prisma Client
 * 使用单例模式避免连接泄漏
 */
export function getTestPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/stss_test',
        },
      },
    })
  }
  return prisma
}

/**
 * 清理所有测试数据
 * 注意：按照依赖关系顺序删除
 */
export async function cleanupTestDatabase(): Promise<void> {
  const client = getTestPrismaClient()

  // 按照外键依赖关系删除
  await client.scoreModificationLog.deleteMany()
  await client.score.deleteMany()
  await client.enrollment.deleteMany()
  await client.testResult.deleteMany()
  await client.answer.deleteMany()
  await client.testQuestion.deleteMany()
  await client.testPaper.deleteMany()
  await client.question.deleteMany()
  await client.questionBank.deleteMany()
  await client.forumComment.deleteMany()
  await client.forumAttachment.deleteMany()
  await client.forumPost.deleteMany()
  await client.schedule.deleteMany()
  await client.courseOffering.deleteMany()
  await client.curriculumCourse.deleteMany()
  await client.curriculum.deleteMany()
  await client.course.deleteMany()
  await client.selectionPeriod.deleteMany()
  await client.semester.deleteMany()
  await client.major.deleteMany()
  await client.classroom.deleteMany()
  await client.passwordResetToken.deleteMany()
  await client.activationToken.deleteMany()
  await client.refreshToken.deleteMany()
  await client.userRole.deleteMany()
  await client.rolePermission.deleteMany()
  await client.permission.deleteMany()
  await client.role.deleteMany()
  await client.systemLog.deleteMany()
  await client.admin.deleteMany()
  await client.teacher.deleteMany()
  await client.student.deleteMany()
  await client.user.deleteMany()
  await client.department.deleteMany()
}

/**
 * 创建测试用户
 */
export async function createTestUser(options: {
  username?: string
  password?: string
  email?: string
  realName?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'BANNED'
}) {
  const client = getTestPrismaClient()
  const hashedPassword = await bcrypt.hash(options.password || 'Password123', 10)

  const user = await client.user.create({
    data: {
      username: options.username || `test_${Date.now()}`,
      passwordHash: hashedPassword,
      email: options.email || `test_${Date.now()}@example.com`,
      realName: options.realName || 'Test User',
      status: options.status || 'ACTIVE',
    },
  })

  return user
}

/**
 * 创建测试管理员用户
 */
export async function createTestAdmin(options: {
  username?: string
  password?: string
  email?: string
  adminType?: 'ACADEMIC' | 'SUPER' | 'SECURITY'
}) {
  const client = getTestPrismaClient()
  const hashedPassword = await bcrypt.hash(options.password || 'Admin123', 10)

  const user = await client.user.create({
    data: {
      username: options.username || `admin_${Date.now()}`,
      passwordHash: hashedPassword,
      email: options.email || `admin_${Date.now()}@example.com`,
      realName: 'Admin User',
      status: 'ACTIVE',
      admin: {
        create: {
          adminType: options.adminType || 'SUPER',
        },
      },
    },
  })

  // 分配 admin 角色
  const adminRole = await client.role.findUnique({
    where: { code: 'admin' },
  })

  if (adminRole) {
    await client.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
      },
    })
  }

  return user
}

/**
 * 创建测试院系
 */
export async function createTestDepartment(options: {
  name?: string
  code?: string
  description?: string
}) {
  const client = getTestPrismaClient()

  const department = await client.department.create({
    data: {
      name: options.name || `Department_${Date.now()}`,
      code: options.code || `DEPT_${Date.now()}`,
      description: options.description || 'Test Department',
    },
  })

  return department
}

/**
 * 创建测试角色
 */
export async function createTestRole(options: {
  name?: string
  code?: string
  description?: string
  permissions?: Array<{ code: string; name: string; resource: string; action: string }>
}) {
  const client = getTestPrismaClient()

  const role = await client.role.create({
    data: {
      name: options.name || `Role_${Date.now()}`,
      code: options.code || `role_${Date.now()}`,
      description: options.description || 'Test Role',
    },
  })

  // 创建权限并关联
  if (options.permissions) {
    for (const perm of options.permissions) {
      const permission = await client.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: {
          name: perm.name,
          code: perm.code,
          resource: perm.resource,
          action: perm.action,
        },
      })

      await client.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      })
    }
  }

  return role
}

/**
 * 创建测试 Refresh Token
 */
export async function createTestRefreshToken(options: {
  userId: string
  tokenHash?: string
  isUsed?: boolean
  expiresAt?: Date
}) {
  const client = getTestPrismaClient()

  const token = await client.refreshToken.create({
    data: {
      userId: options.userId,
      tokenHash: options.tokenHash || `hash_${Date.now()}`,
      isUsed: options.isUsed ?? false,
      expiresAt: options.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return token
}

/**
 * 初始化测试数据库
 * 创建基础角色和权限
 */
export async function initializeTestDatabase(): Promise<void> {
  const client = getTestPrismaClient()

  // 创建基础角色
  const roles = [
    {
      code: 'super_admin',
      name: 'Super Administrator',
      description: 'Super admin with all permissions',
    },
    { code: 'admin', name: 'Administrator', description: 'Admin with most permissions' },
    { code: 'teacher', name: 'Teacher', description: 'Teacher role' },
    { code: 'student', name: 'Student', description: 'Student role' },
  ]

  for (const role of roles) {
    await client.role.upsert({
      where: { code: role.code },
      update: {},
      create: role,
    })
  }

  // 创建基础权限
  const permissions = [
    { code: 'user:manage', name: 'Manage Users', resource: 'user', action: 'manage' },
    { code: 'user:read', name: 'Read Users', resource: 'user', action: 'read' },
    { code: 'role:manage', name: 'Manage Roles', resource: 'role', action: 'manage' },
    { code: 'course:read', name: 'Read Courses', resource: 'course', action: 'read' },
    { code: 'course:manage', name: 'Manage Courses', resource: 'course', action: 'manage' },
    { code: 'profile:update', name: 'Update Profile', resource: 'profile', action: 'update' },
    { code: 'log:read', name: 'Read Logs', resource: 'log', action: 'read' },
  ]

  for (const perm of permissions) {
    await client.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    })
  }

  // 为超级管理员分配所有权限
  const superAdminRole = await client.role.findUnique({
    where: { code: 'super_admin' },
  })
  const allPermissions = await client.permission.findMany()

  if (superAdminRole && allPermissions.length > 0) {
    await client.rolePermission.deleteMany({
      where: { roleId: superAdminRole.id },
    })

    await client.rolePermission.createMany({
      data: allPermissions.map((p) => ({
        roleId: superAdminRole!.id,
        permissionId: p.id,
      })),
    })
  }
}

/**
 * 关闭测试数据库连接
 */
export async function closeTestDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
