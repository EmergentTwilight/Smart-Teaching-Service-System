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
import { ForbiddenError } from '@stss/shared'

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
    const user = await usersService.createUser(data)
    success(res, user, '创建成功', 201)
  },

  /**
   * 更新用户信息
   * 注意：status、roleIds、password 不能通过此接口修改
   */
  async update(req: Request, res: Response) {
    const id = req.params.id as string
    const data = updateUserSchema.parse(req.body)
    const user = await usersService.updateUser(id, data)
    success(res, user, '更新成功')
  },

  /**
   * 删除用户
   */
  async delete(req: Request, res: Response) {
    const id = req.params.id as string
    await usersService.deleteUser(id)
    success(res, null, '删除成功')
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
    success(res, result, '批量创建成功', 201)
  },

  /**
   * 批量修改用户状态
   */
  async batchUpdateStatus(req: Request, res: Response) {
    const data = batchUpdateStatusSchema.parse(req.body)
    const result = await usersService.batchUpdateStatus(data)
    success(res, result, '批量修改状态成功')
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
    success(res, null, '密码重置成功')
  },

  /**
   * 修改用户状态
   */
  async updateStatus(req: Request, res: Response) {
    const id = req.params.id as string
    const data = updateStatusSchema.parse(req.body)
    const user = await usersService.updateStatus(id, data)
    success(res, user, '状态修改成功')
  },

  /**
   * 分配角色
   */
  async assignRoles(req: Request, res: Response) {
    const id = req.params.id as string
    const data = assignRolesSchema.parse(req.body)
    const currentUserId = req.user?.userId
    const user = await usersService.assignRoles(id, data, currentUserId)
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
    success(res, user, '角色撤销成功')
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
}
