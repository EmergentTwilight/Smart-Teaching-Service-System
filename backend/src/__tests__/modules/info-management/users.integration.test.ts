/**
 * 用户管理集成测试
 * 使用真实数据库进行测试
 *
 * 运行方式：
 * 1. 确保测试数据库已创建并配置了 DATABASE_URL 环境变量
 * 2. 运行: pnpm --filter backend test users.integration
 *
 * 注意：此测试会清空 users、user_roles、roles 表的数据
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { hashPassword, comparePassword } from '../../../shared/utils/password.js'
import { usersService } from '../../../modules/info-management/users.service.js'
import { ConflictError, NotFoundError, ValidationError } from '@stss/shared'
import type { UserStatus } from '@prisma/client'

// 使用独立的 Prisma Client 实例用于测试
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// 测试数据
const testRoleIds: string[] = []

// 清理函数
async function cleanupDatabase() {
  // 按依赖顺序删除：先删除关联表，再删除主表
  await prisma.userRole.deleteMany({})
  await prisma.refreshToken.deleteMany({})
  await prisma.activationToken.deleteMany({})
  await prisma.passwordResetToken.deleteMany({})
  await prisma.systemLog.deleteMany({})

  // 只删除测试创建的用户（通过特定前缀识别）
  await prisma.user.deleteMany({
    where: {
      OR: [{ username: { startsWith: 'itest_' } }, { email: { startsWith: 'itest_' } }],
    },
  })

  // 删除测试创建的角色
  await prisma.role.deleteMany({
    where: {
      code: { startsWith: 'itest_' },
    },
  })
}

// 辅助函数：创建测试角色
async function createTestRole(code: string, name: string) {
  const role = await prisma.role.create({
    data: {
      code,
      name,
      description: `集成测试角色: ${name}`,
    },
  })
  testRoleIds.push(role.id)
  return role
}

// 辅助函数：创建测试用户
async function createTestUser(overrides: Record<string, unknown> = {}) {
  const username = `itest_user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const hashedPassword = await hashPassword('Password123')

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashedPassword,
      email: `itest_${Date.now()}@test.com`,
      realName: '测试用户',
      ...overrides,
    },
  })

  return user
}

beforeAll(async () => {
  // 连接数据库
  await prisma.$connect()

  // 清理测试数据
  await cleanupDatabase()

  // 创建测试角色
  await createTestRole('itest_student', '测试学生')
  await createTestRole('itest_teacher', '测试教师')
  await createTestRole('itest_admin', '测试管理员')
})

afterAll(async () => {
  // 清理测试数据
  await cleanupDatabase()

  // 断开数据库连接
  await prisma.$disconnect()
})

beforeEach(async () => {
  // 每个测试前清理用户数据（保留角色）
  await prisma.userRole.deleteMany({})
  await prisma.refreshToken.deleteMany({})
  await prisma.activationToken.deleteMany({})
  await prisma.passwordResetToken.deleteMany({})
  await prisma.systemLog.deleteMany({})

  await prisma.user.deleteMany({
    where: {
      OR: [{ username: { startsWith: 'itest_' } }, { email: { startsWith: 'itest_' } }],
    },
  })
})

describe('UsersService Integration Tests', () => {
  // ==================== 用户 CRUD ====================
  describe('用户 CRUD', () => {
    describe('createUser', () => {
      it('应该成功创建用户并写入数据库', async () => {
        const result = await usersService.createUser({
          username: 'itest_newuser',
          password: 'Password123',
          realName: '新用户',
          email: 'itest_newuser@test.com',
          phone: '13800000001',
          roleIds: [testRoleIds[0]],
        })

        // 验证返回值
        expect(result.username).toBe('itest_newuser')
        expect(result.realName).toBe('新用户')
        expect(result.email).toBe('itest_newuser@test.com')
        expect(result.roles).toContain('itest_student')

        // 验证数据库中真实存在该用户
        const dbUser = await prisma.user.findUnique({
          where: { id: result.id },
          include: { userRoles: true },
        })

        expect(dbUser).not.toBeNull()
        expect(dbUser!.username).toBe('itest_newuser')
        expect(dbUser!.email).toBe('itest_newuser@test.com')
        expect(dbUser!.userRoles).toHaveLength(1)
        expect(dbUser!.userRoles[0].roleId).toBe(testRoleIds[0])
      })

      it('用户名冲突时应该抛出 ConflictError', async () => {
        // 先创建一个用户
        await createTestUser({ username: 'itest_conflict' })

        // 尝试创建同名用户
        await expect(
          usersService.createUser({
            username: 'itest_conflict',
            password: 'Password123',
            realName: '冲突用户',
          })
        ).rejects.toBeInstanceOf(ConflictError)
      })

      it('邮箱冲突时应该抛出 ConflictError', async () => {
        // 先创建一个用户
        await createTestUser({ email: 'itest_conflict@test.com' })

        // 尝试使用相同邮箱创建用户
        await expect(
          usersService.createUser({
            username: 'itest_another',
            password: 'Password123',
            realName: '另一个用户',
            email: 'itest_conflict@test.com',
          })
        ).rejects.toBeInstanceOf(ConflictError)
      })
    })

    describe('getUsers', () => {
      it('应该成功查询用户列表并验证分页功能', async () => {
        // 创建多个测试用户
        for (let i = 0; i < 15; i++) {
          await createTestUser({
            username: `itest_list_${i}`,
            email: `itest_list_${i}@test.com`,
            realName: `列表用户${i}`,
          })
        }

        // 查询第一页
        const result = await usersService.getUsers({
          page: 1,
          pageSize: 10,
        })

        expect(result.items.length).toBeLessThanOrEqual(10)
        expect(result.pagination.page).toBe(1)
        expect(result.pagination.pageSize).toBe(10)
        expect(result.pagination.total).toBeGreaterThanOrEqual(15)
        expect(result.pagination.totalPages).toBeGreaterThanOrEqual(2)
      })

      it('应该支持按关键词搜索', async () => {
        // 创建特定用户
        await createTestUser({
          username: 'itest_searchuser',
          realName: '搜索测试用户',
          email: 'itest_searchuser@test.com',
        })

        const result = await usersService.getUsers({
          page: 1,
          pageSize: 10,
          keyword: 'searchuser',
        })

        expect(result.items.length).toBeGreaterThanOrEqual(1)
        expect(result.items.some((u) => u.username === 'itest_searchuser')).toBe(true)
      })

      it('应该支持按状态筛选', async () => {
        // 创建不同状态的用户
        await createTestUser({
          username: 'itest_active',
          status: 'ACTIVE',
        })
        await createTestUser({
          username: 'itest_inactive',
          status: 'INACTIVE',
        })

        const result = await usersService.getUsers({
          page: 1,
          pageSize: 10,
          status: 'ACTIVE' as UserStatus,
        })

        expect(result.items.every((u) => u.status === 'ACTIVE')).toBe(true)
      })
    })

    describe('updateUser', () => {
      it('应该成功更新用户并验证数据库中字段已更新', async () => {
        const user = await createTestUser({
          username: 'itest_update',
          realName: '更新前',
          email: 'itest_update@test.com',
        })

        const result = await usersService.updateUser(user.id, {
          realName: '更新后',
          phone: '13900000000',
        })

        expect(result.realName).toBe('更新后')
        expect(result.phone).toBe('13900000000')

        // 验证数据库中已更新
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        })

        expect(dbUser!.realName).toBe('更新后')
        expect(dbUser!.phone).toBe('13900000000')
      })

      it('用户不存在时应该抛出 NotFoundError', async () => {
        await expect(
          usersService.updateUser('non-existent-id', { realName: '更新' })
        ).rejects.toBeInstanceOf(NotFoundError)
      })

      it('更新邮箱时应该检查唯一性', async () => {
        const user1 = await createTestUser({
          username: 'itest_update1',
          email: 'itest_update1@test.com',
        })
        await createTestUser({
          username: 'itest_update2',
          email: 'itest_update2@test.com',
        })

        await expect(
          usersService.updateUser(user1.id, { email: 'itest_update2@test.com' })
        ).rejects.toBeInstanceOf(ConflictError)
      })
    })

    describe('deleteUser', () => {
      it('应该成功删除用户并验证数据库中记录已删除', async () => {
        const user = await createTestUser({
          username: 'itest_delete',
        })

        await usersService.deleteUser(user.id)

        // 验证数据库中已删除
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        })

        expect(dbUser).toBeNull()
      })

      it('用户不存在时应该抛出 NotFoundError', async () => {
        await expect(usersService.deleteUser('non-existent-id')).rejects.toBeInstanceOf(
          NotFoundError
        )
      })

      it('删除用户时应该级联删除相关数据', async () => {
        const user = await createTestUser({
          username: 'itest_cascade',
        })

        // 创建 refresh token
        await prisma.refreshToken.create({
          data: {
            userId: user.id,
            tokenHash: 'test_token_hash',
            expiresAt: new Date(Date.now() + 86400000),
          },
        })

        // 创建用户角色
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: testRoleIds[0],
          },
        })

        // 删除用户
        await usersService.deleteUser(user.id)

        // 验证级联删除
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        })
        const dbTokens = await prisma.refreshToken.findMany({
          where: { userId: user.id },
        })
        const dbUserRoles = await prisma.userRole.findMany({
          where: { userId: user.id },
        })

        expect(dbUser).toBeNull()
        expect(dbTokens).toHaveLength(0)
        expect(dbUserRoles).toHaveLength(0)
      })
    })
  })

  // ==================== 密码管理 ====================
  describe('密码管理', () => {
    describe('changePassword', () => {
      it('应该成功修改密码并验证密码哈希已更新', async () => {
        const user = await createTestUser({
          username: 'itest_changepwd',
          passwordHash: await hashPassword('OldPassword123'),
        })

        await usersService.changePassword(user.id, {
          oldPassword: 'OldPassword123',
          newPassword: 'NewPassword456',
        })

        // 验证数据库中密码哈希已更新
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        })

        const isValid = await comparePassword('NewPassword456', dbUser!.passwordHash)
        expect(isValid).toBe(true)

        // 旧密码应该失效
        const isOldValid = await comparePassword('OldPassword123', dbUser!.passwordHash)
        expect(isOldValid).toBe(false)
      })

      it('旧密码错误时应该抛出 ValidationError', async () => {
        const user = await createTestUser({
          username: 'itest_wrongpwd',
          passwordHash: await hashPassword('CorrectPassword123'),
        })

        await expect(
          usersService.changePassword(user.id, {
            oldPassword: 'WrongPassword123',
            newPassword: 'NewPassword456',
          })
        ).rejects.toBeInstanceOf(ValidationError)
      })

      it('修改密码后应该吊销所有 Refresh Token', async () => {
        const user = await createTestUser({
          username: 'itest_revoketoken',
          passwordHash: await hashPassword('OldPassword123'),
        })

        // 创建 refresh token
        await prisma.refreshToken.createMany({
          data: [
            {
              userId: user.id,
              tokenHash: 'test_token_1',
              expiresAt: new Date(Date.now() + 86400000),
            },
            {
              userId: user.id,
              tokenHash: 'test_token_2',
              expiresAt: new Date(Date.now() + 86400000),
            },
          ],
        })

        await usersService.changePassword(user.id, {
          oldPassword: 'OldPassword123',
          newPassword: 'NewPassword456',
        })

        // 验证所有 token 都被标记为已使用
        const tokens = await prisma.refreshToken.findMany({
          where: { userId: user.id },
        })

        expect(tokens.every((t) => t.isUsed === true)).toBe(true)
      })
    })

    describe('resetPassword', () => {
      it('应该成功重置密码并验证新密码生效', async () => {
        const user = await createTestUser({
          username: 'itest_resetpwd',
          passwordHash: await hashPassword('OldPassword123'),
        })

        await usersService.resetPassword(user.id, {
          newPassword: 'ResetPassword789',
        })

        // 验证新密码生效
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        })

        const isValid = await comparePassword('ResetPassword789', dbUser!.passwordHash)
        expect(isValid).toBe(true)
      })

      it('重置密码后应该吊销所有 Refresh Token', async () => {
        const user = await createTestUser({
          username: 'itest_resetrevoke',
          passwordHash: await hashPassword('OldPassword123'),
        })

        // 创建 refresh token
        await prisma.refreshToken.create({
          data: {
            userId: user.id,
            tokenHash: 'test_token_reset',
            expiresAt: new Date(Date.now() + 86400000),
          },
        })

        await usersService.resetPassword(user.id, {
          newPassword: 'ResetPassword789',
        })

        const tokens = await prisma.refreshToken.findMany({
          where: { userId: user.id },
        })

        expect(tokens.every((t) => t.isUsed === true)).toBe(true)
      })

      it('用户不存在时应该抛出 NotFoundError', async () => {
        await expect(
          usersService.resetPassword('non-existent-id', {
            newPassword: 'NewPassword123',
          })
        ).rejects.toBeInstanceOf(NotFoundError)
      })
    })
  })

  // ==================== 角色管理 ====================
  describe('角色管理', () => {
    describe('assignRoles', () => {
      it('应该成功分配角色并验证 user_roles 表中有对应记录', async () => {
        const user = await createTestUser({
          username: 'itest_assignrole',
        })

        await usersService.assignRoles(user.id, {
          roleIds: [testRoleIds[0], testRoleIds[1]],
        })

        // 验证 user_roles 表中有对应记录
        const userRoles = await prisma.userRole.findMany({
          where: { userId: user.id },
          include: { role: true },
        })

        expect(userRoles).toHaveLength(2)
        expect(userRoles.map((ur) => ur.role.code)).toContain('itest_student')
        expect(userRoles.map((ur) => ur.role.code)).toContain('itest_teacher')
      })

      it('角色不存在时应该抛出 NotFoundError', async () => {
        const user = await createTestUser({
          username: 'itest_invalidrole',
        })

        await expect(
          usersService.assignRoles(user.id, {
            roleIds: ['non-existent-role-id'],
          })
        ).rejects.toBeInstanceOf(NotFoundError)
      })

      it('分配角色后应该吊销所有 Refresh Token', async () => {
        const user = await createTestUser({
          username: 'itest_rolerevoke',
        })

        // 创建 refresh token
        await prisma.refreshToken.create({
          data: {
            userId: user.id,
            tokenHash: 'test_token_role',
            expiresAt: new Date(Date.now() + 86400000),
          },
        })

        await usersService.assignRoles(user.id, {
          roleIds: [testRoleIds[0]],
        })

        const tokens = await prisma.refreshToken.findMany({
          where: { userId: user.id },
        })

        // 角色变更后应该删除所有 token
        expect(tokens).toHaveLength(0)
      })

      it('重复分配角色应该替换原有角色', async () => {
        const user = await createTestUser({
          username: 'itest_replacerole',
        })

        // 第一次分配
        await usersService.assignRoles(user.id, {
          roleIds: [testRoleIds[0]],
        })

        let userRoles = await prisma.userRole.findMany({
          where: { userId: user.id },
          include: { role: true },
        })
        expect(userRoles).toHaveLength(1)

        // 第二次分配（替换）
        await usersService.assignRoles(user.id, {
          roleIds: [testRoleIds[1], testRoleIds[2]],
        })

        userRoles = await prisma.userRole.findMany({
          where: { userId: user.id },
          include: { role: true },
        })
        expect(userRoles).toHaveLength(2)
        expect(userRoles.map((ur) => ur.role.code)).toContain('itest_teacher')
        expect(userRoles.map((ur) => ur.role.code)).toContain('itest_admin')
        expect(userRoles.map((ur) => ur.role.code)).not.toContain('itest_student')
      })
    })

    describe('revokeRole', () => {
      it('应该成功撤销角色并验证 user_roles 表中记录已删除', async () => {
        const user = await createTestUser({
          username: 'itest_revokerole',
        })

        // 先分配角色
        await prisma.userRole.createMany({
          data: [
            { userId: user.id, roleId: testRoleIds[0] },
            { userId: user.id, roleId: testRoleIds[1] },
          ],
        })

        // 撤销一个角色
        await usersService.revokeRole(user.id, testRoleIds[0])

        // 验证 user_roles 表中记录已删除
        const userRoles = await prisma.userRole.findMany({
          where: { userId: user.id },
          include: { role: true },
        })

        expect(userRoles).toHaveLength(1)
        expect(userRoles[0].role.code).toBe('itest_teacher')
      })

      it('用户未分配该角色时应该抛出 NotFoundError', async () => {
        const user = await createTestUser({
          username: 'itest_notassigned',
        })

        await expect(usersService.revokeRole(user.id, testRoleIds[0])).rejects.toBeInstanceOf(
          NotFoundError
        )
      })

      it('撤销角色后应该吊销所有 Refresh Token', async () => {
        const user = await createTestUser({
          username: 'itest_revoketokenrole',
        })

        // 分配角色
        await prisma.userRole.create({
          data: { userId: user.id, roleId: testRoleIds[0] },
        })

        // 创建 refresh token
        await prisma.refreshToken.create({
          data: {
            userId: user.id,
            tokenHash: 'test_token_revoke',
            expiresAt: new Date(Date.now() + 86400000),
          },
        })

        // 撤销角色
        await usersService.revokeRole(user.id, testRoleIds[0])

        const tokens = await prisma.refreshToken.findMany({
          where: { userId: user.id },
        })

        expect(tokens).toHaveLength(0)
      })
    })
  })

  // ==================== 批量操作 ====================
  describe('批量操作', () => {
    describe('batchCreateUsers', () => {
      it('应该成功批量创建用户并验证所有用户都已写入数据库', async () => {
        const users = [
          {
            username: 'itest_batch1',
            password: 'Password123',
            realName: '批量用户1',
            email: 'itest_batch1@test.com',
            roleIds: [testRoleIds[0]],
          },
          {
            username: 'itest_batch2',
            password: 'Password456',
            realName: '批量用户2',
            email: 'itest_batch2@test.com',
            roleIds: [testRoleIds[1]],
          },
          {
            username: 'itest_batch3',
            password: 'Password789',
            realName: '批量用户3',
            email: 'itest_batch3@test.com',
          },
        ]

        const result = await usersService.batchCreateUsers({ users })

        expect(result.success).toBe(true)
        expect(result.created_count).toBe(3)
        expect(result.users).toHaveLength(3)

        // 验证所有用户都已写入数据库
        for (const user of result.users) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
          })
          expect(dbUser).not.toBeNull()
          expect(dbUser!.username).toContain('itest_batch')
        }

        // 验证角色分配
        const user1Roles = await prisma.userRole.findMany({
          where: { userId: result.users[0].id },
        })
        expect(user1Roles).toHaveLength(1)

        const user3Roles = await prisma.userRole.findMany({
          where: { userId: result.users[2].id },
        })
        expect(user3Roles).toHaveLength(0)
      })

      it('用户名冲突时应该抛出 ConflictError 并回滚所有操作', async () => {
        // 先创建一个用户
        await createTestUser({ username: 'itest_batchconflict' })

        const users = [
          {
            username: 'itest_batchnew1',
            password: 'Password123',
            realName: '新用户1',
          },
          {
            username: 'itest_batchconflict', // 冲突
            password: 'Password456',
            realName: '冲突用户',
          },
        ]

        await expect(usersService.batchCreateUsers({ users })).rejects.toBeInstanceOf(ConflictError)

        // 验证第一个用户也没有被创建（事务回滚）
        const dbUser = await prisma.user.findUnique({
          where: { username: 'itest_batchnew1' },
        })
        expect(dbUser).toBeNull()
      })

      it('超过100个用户时应该抛出 ValidationError', async () => {
        const users = Array(101)
          .fill(null)
          .map((_, i) => ({
            username: `itest_toomany_${i}`,
            password: 'Password123',
            realName: `用户${i}`,
          }))

        await expect(usersService.batchCreateUsers({ users })).rejects.toBeInstanceOf(
          ValidationError
        )
      })
    })

    describe('batchUpdateStatus', () => {
      it('应该成功批量修改状态并验证所有用户状态都已更新', async () => {
        // 创建多个用户
        const userIds: string[] = []
        for (let i = 0; i < 5; i++) {
          const user = await createTestUser({
            username: `itest_status_${i}`,
            status: 'ACTIVE',
          })
          userIds.push(user.id)
        }

        const result = await usersService.batchUpdateStatus({
          userIds,
          status: 'INACTIVE',
        })

        expect(result.updated_count).toBe(5)
        expect(result.failed_count).toBe(0)

        // 验证所有用户状态都已更新
        for (const userId of userIds) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
          })
          expect(dbUser!.status).toBe('INACTIVE')
        }
      })

      it('不存在的用户应该抛出 NotFoundError', async () => {
        const user = await createTestUser({ username: 'itest_existing' })

        await expect(
          usersService.batchUpdateStatus({
            userIds: [user.id, 'non-existent-id'],
            status: 'BANNED',
          })
        ).rejects.toBeInstanceOf(NotFoundError)
      })

      it('超过100个用户时应该抛出 ValidationError', async () => {
        const userIds = Array(101)
          .fill(null)
          .map((_, i) => `user-${i}`)

        await expect(
          usersService.batchUpdateStatus({
            userIds,
            status: 'INACTIVE',
          })
        ).rejects.toBeInstanceOf(ValidationError)
      })
    })
  })

  // ==================== 其他功能 ====================
  describe('getUserById', () => {
    it('应该成功获取用户详情', async () => {
      const user = await createTestUser({
        username: 'itest_getbyid',
        email: 'itest_getbyid@test.com',
        realName: '详情用户',
      })

      // 分配角色
      await prisma.userRole.create({
        data: { userId: user.id, roleId: testRoleIds[0] },
      })

      const result = await usersService.getUserById(user.id)

      expect(result.id).toBe(user.id)
      expect(result.username).toBe('itest_getbyid')
      expect(result.email).toBe('itest_getbyid@test.com')
      expect(result.realName).toBe('详情用户')
      expect(result.roles).toContain('itest_student')
    })

    it('用户不存在时应该抛出 NotFoundError', async () => {
      await expect(usersService.getUserById('non-existent-id')).rejects.toBeInstanceOf(
        NotFoundError
      )
    })
  })

  describe('updateStatus', () => {
    it('应该成功修改用户状态', async () => {
      const user = await createTestUser({
        username: 'itest_updatestatus',
        status: 'ACTIVE',
      })

      const result = await usersService.updateStatus(user.id, {
        status: 'BANNED',
      })

      expect(result.status).toBe('BANNED')

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      })
      expect(dbUser!.status).toBe('BANNED')
    })

    it('用户不存在时应该抛出 NotFoundError', async () => {
      await expect(
        usersService.updateStatus('non-existent-id', { status: 'INACTIVE' })
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  describe('getUserPermissions', () => {
    it('应该成功获取用户权限列表', async () => {
      // 创建权限
      const permission1 = await prisma.permission.create({
        data: {
          code: 'itest_read',
          name: '读取权限',
          resource: 'test',
          action: 'read',
        },
      })
      const permission2 = await prisma.permission.create({
        data: {
          code: 'itest_write',
          name: '写入权限',
          resource: 'test',
          action: 'write',
        },
      })

      // 给角色分配权限
      await prisma.rolePermission.createMany({
        data: [
          { roleId: testRoleIds[0], permissionId: permission1.id },
          { roleId: testRoleIds[0], permissionId: permission2.id },
        ],
      })

      const user = await createTestUser({
        username: 'itest_permissions',
      })

      // 分配角色
      await prisma.userRole.create({
        data: { userId: user.id, roleId: testRoleIds[0] },
      })

      const result = await usersService.getUserPermissions(user.id)

      expect(result.user_id).toBe(user.id)
      expect(result.permissions).toContain('itest_read')
      expect(result.permissions).toContain('itest_write')

      // 清理权限
      await prisma.rolePermission.deleteMany({
        where: { permissionId: { in: [permission1.id, permission2.id] } },
      })
      await prisma.permission.deleteMany({
        where: { id: { in: [permission1.id, permission2.id] } },
      })
    })

    it('无角色时应该返回空数组', async () => {
      const user = await createTestUser({
        username: 'itest_noperms',
      })

      const result = await usersService.getUserPermissions(user.id)

      expect(result.permissions).toEqual([])
    })

    it('用户不存在时应该抛出 NotFoundError', async () => {
      await expect(usersService.getUserPermissions('non-existent-id')).rejects.toBeInstanceOf(
        NotFoundError
      )
    })
  })
})
