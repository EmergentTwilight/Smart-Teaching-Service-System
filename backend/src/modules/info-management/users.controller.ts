/**
 * 用户管理控制器
 * 处理用户 CRUD 相关的 HTTP 请求
 *
 * 注意：express-async-errors 会自动捕获所有 async 错误并传给 errorHandler 中间件
 */
import { Request, Response } from 'express'
import { usersService } from './users.service.js'
import { success, paginated } from '../../shared/utils/response.js'
import {
  getUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  getLogsQuerySchema,
  batchCreateUsersSchema,
  batchUpdateStatusSchema,
  changePasswordSchema,
  resetPasswordSchema,
  updateStatusSchema,
  assignRolesSchema,
} from './users.types.js'
import { ForbiddenError, ValidationError } from '@stss/shared'

export const usersController = {
  /**
   * 获取用户列表
   */
  async list(req: Request, res: Response) {
    const query = getUsersQuerySchema.parse(req.query)
    const result = await usersService.getUsers(query)
    paginated(res, result.items, result.pagination)
  },

  /**
   * 获取用户统计
   */
  async getStats(req: Request, res: Response) {
    const stats = await usersService.getUserStats()
    success(res, stats)
  },

  /**
   * 获取单个用户详情
   */
  async getById(req: Request, res: Response) {
    const id = req.params.id as string
    const user = await usersService.getUserById(id)
    success(res, user)
  },

  /**
   * 创建用户
   */
  async create(req: Request, res: Response) {
    const data = createUserSchema.parse(req.body)
    const user = await usersService.createUser(data, req)
    success(res, user, '用户创建成功', 201)
  },

  /**
   * 更新用户信息
   * 注意：status、roleIds、password 不能通过此接口修改
   */
  async update(req: Request, res: Response) {
    const id = req.params.id as string
    const data = updateUserSchema.parse(req.body)
    const user = await usersService.updateUser(id, data)
    success(res, user, '用户更新成功')
  },

  /**
   * 删除用户
   */
  async delete(req: Request, res: Response) {
    const id = req.params.id as string
    const currentUserId = req.user?.userId

    // 防止删除自己的账号
    if (id === currentUserId) {
      throw new ValidationError('不能删除自己的账号')
    }

    await usersService.deleteUser(id, req)
    success(res, null, '用户已删除')
  },

  /**
   * 获取系统日志
   */
  async getLogs(req: Request, res: Response) {
    const query = getLogsQuerySchema.parse(req.query)
    const result = await usersService.getLogs(query)
    paginated(res, result.items, result.pagination)
  },

  /**
   * 批量创建用户
   */
  async batchCreate(req: Request, res: Response) {
    const data = batchCreateUsersSchema.parse(req.body)
    const result = await usersService.batchCreateUsers(data)
    success(res, result, '批量创建完成')
  },

  /**
   * 批量修改用户状态
   */
  async batchUpdateStatus(req: Request, res: Response) {
    const data = batchUpdateStatusSchema.parse(req.body)
    const result = await usersService.batchUpdateStatus(data)
    success(res, result, '批量状态更新完成')
  },

  /**
   * 修改密码（用户自己修改)
   */
  async changePassword(req: Request, res: Response) {
    const id = req.params.id as string
    const data = changePasswordSchema.parse(req.body)
    const currentUserId = req.user?.userId

    // 只能修改自己的密码
    if (id !== currentUserId) {
      throw new ForbiddenError('无权修改他人密码')
    }

    await usersService.changePassword(id, data)
    success(res, null, '密码修改成功')
  },

  /**
   * 重置密码(管理员操作)
   */
  async resetPassword(req: Request, res: Response) {
    const id = req.params.id as string
    const data = resetPasswordSchema.parse(req.body)
    await usersService.resetPassword(id, data)
    success(res, null, '密码已重置')
  },

  /**
   * 修改用户状态
   */
  async updateStatus(req: Request, res: Response) {
    const id = req.params.id as string
    const data = updateStatusSchema.parse(req.body)
    const user = await usersService.updateStatus(id, data)
    success(res, user, '状态已更新')
  },

  /**
   * 分配角色
   */
  async assignRoles(req: Request, res: Response) {
    const id = req.params.id as string
    const data = assignRolesSchema.parse(req.body)
    const currentUserId = req.user?.userId
    const currentUserRoles = req.user?.roles
    const user = await usersService.assignRoles(id, data, currentUserId, currentUserRoles)
    success(res, user, '角色分配成功')
  },

  /**
   * 撤销角色
   */
  async revokeRole(req: Request, res: Response) {
    const id = req.params.id as string
    const roleId = req.params.role_id as string
    const currentUserId = req.user?.userId
    const user = await usersService.revokeRole(id, roleId, currentUserId)
    success(res, user, '角色已撤销')
  },

  /**
   * 获取用户权限列表
   */
  async getPermissions(req: Request, res: Response) {
    const id = req.params.id as string
    const currentUser = req.user!
    const isSelf = currentUser.userId === id
    const isAdmin = currentUser.roles.some((r) => r === 'admin' || r === 'super_admin')

    // 非管理员只能查看自己的权限
    if (!isAdmin && !isSelf) {
      throw new ForbiddenError('无权查看他人权限')
    }

    const permissions = await usersService.getUserPermissions(id)
    success(res, permissions)
  },

  /**
   * 获取所有角色列表
   */
  async getRoles(req: Request, res: Response) {
    const roles = await usersService.getRoles()
    success(res, roles)
  },

  // ==================== 令牌管理 ====================

  /**
   * 获取用户活跃令牌列表
   */
  async getUserTokens(req: Request, res: Response) {
    const id = req.params.id as string
    const currentUser = req.user!

    // 普通用户只能查看自己的令牌
    const isSelf = currentUser.userId === id
    const isAdmin = currentUser.roles.some((r) => r === 'admin' || r === 'super_admin')
    if (!isAdmin && !isSelf) {
      throw new ForbiddenError('无权查看他人令牌')
    }

    const tokens = await usersService.getUserTokens(id)
    success(res, tokens)
  },

  /**
   * 吊销指定令牌
   */
  async revokeToken(req: Request, res: Response) {
    const { id, token_id } = req.params as { id: string; token_id: string }
    const currentUser = req.user!

    // 普通用户只能吊销自己的令牌
    const isSelf = currentUser.userId === id
    const isAdmin = currentUser.roles.some((r) => r === 'admin' || r === 'super_admin')
    if (!isAdmin && !isSelf) {
      throw new ForbiddenError('无权吊销他人令牌')
    }

    await usersService.revokeToken(id, token_id)
    success(res, null, '令牌已吊销')
  },

  /**
   * 吊销用户所有令牌
   */
  async revokeAllTokens(req: Request, res: Response) {
    const id = req.params.id as string
    const currentUser = req.user!

    // 普通用户只能吊销自己的令牌
    const isSelf = currentUser.userId === id
    const isAdmin = currentUser.roles.some((r) => r === 'admin' || r === 'super_admin')
    if (!isAdmin && !isSelf) {
      throw new ForbiddenError('无权吊销他人令牌')
    }

    const result = await usersService.revokeAllTokens(id)
    success(res, result, '已吊销所有令牌')
  },

  // ==================== 头像上传 ====================

  /**
   * 上传用户头像
   */
  async uploadAvatar(req: Request, res: Response) {
    const id = req.params.id as string
    const file = req.file

    if (!file) {
      throw new ValidationError('请选择要上传的头像文件')
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`
    const result = await usersService.updateAvatar(id, avatarUrl)
    success(res, result, '头像上传成功')
  },

  // ==================== 学生专业 / 教师院系 / 管理员院系 更新 ====================

  /**
   * 更新学生专业
   */
  async updateStudentMajor(req: Request, res: Response) {
    const id = req.params.id as string
    const { majorId } = req.body as { majorId: string }
    const result = await usersService.updateStudentMajor(id, majorId)
    success(res, result, '学生专业更新成功')
  },

  /**
   * 更新教师院系
   */
  async updateTeacherDepartment(req: Request, res: Response) {
    const id = req.params.id as string
    const { departmentId } = req.body as { departmentId: string }
    const result = await usersService.updateTeacherDepartment(id, departmentId)
    success(res, result, '教师院系更新成功')
  },

  /**
   * 更新管理员院系
   */
  async updateAdminDepartment(req: Request, res: Response) {
    const id = req.params.id as string
    const { departmentId } = req.body as { departmentId: string }
    const result = await usersService.updateAdminDepartment(id, departmentId)
    success(res, result, '管理员院系更新成功')
  },
}
