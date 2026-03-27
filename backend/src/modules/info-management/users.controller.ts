/**
 * 用户管理控制器
 * 处理用户 CRUD 相关的 HTTP 请求
 */
import { Request, Response } from 'express'
import { usersService } from './users.service.js'
import { success, error, paginated } from '../../shared/utils/response.js'
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

export const usersController = {
  /**
   * 获取用户列表
   */
  async list(req: Request, res: Response) {
    try {
      const query = getUsersQuerySchema.parse(req.query)
      const result = await usersService.getUsers(query)
      paginated(res, result.items, result.pagination)
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取用户列表失败'
      error(res, message, 400)
    }
  },

  /**
   * 获取单个用户详情
   */
  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id
      if (!id || typeof id !== 'string') {
        throw new Error('无效的用户ID')
      }
      const user = await usersService.getUserById(id)
      success(res, user)
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取用户信息失败'
      error(res, message, 404)
    }
  },

  /**
   * 创建用户
   */
  async create(req: Request, res: Response) {
    try {
      const data = createUserSchema.parse(req.body)
      const user = await usersService.createUser(data)
      success(res, user, '创建成功', 201)
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建用户失败'
      error(res, message, 400)
    }
  },

  /**
   * 更新用户信息
   */
  async update(req: Request, res: Response) {
    try {
      const id = req.params.id
      if (!id || typeof id !== 'string') {
        throw new Error('无效的用户ID')
      }
      const data = updateUserSchema.parse(req.body)
      const user = await usersService.updateUser(id, data)
      success(res, user, '更新成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新用户失败'
      error(res, message, 400)
    }
  },

  /**
   * 删除用户
   */
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id
      if (!id || typeof id !== 'string') {
        throw new Error('无效的用户ID')
      }
      await usersService.deleteUser(id)
      success(res, null, '删除成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除用户失败'
      error(res, message, 400)
    }
  },

  /**
   * 获取系统日志
   */
  async getLogs(req: Request, res: Response) {
    try {
      const query = getLogsQuerySchema.parse(req.query)
      const result = await usersService.getLogs(query)
      paginated(res, result.items, result.pagination)
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取系统日志失败'
      error(res, message, 400)
    }
  },

  // ==================== 新增方法 ====================

  /**
   * 批量创建用户
   */
  async batchCreate(req: Request, res: Response) {
    try {
      const data = batchCreateUsersSchema.parse(req.body)
      const result = await usersService.batchCreateUsers(data)
      success(res, result, '批量创建成功', 201)
    } catch (err) {
      const message = err instanceof Error ? err.message : '批量创建用户失败'
      error(res, message, 400)
    }
  },

  /**
   * 批量修改用户状态
   */
  async batchUpdateStatus(req: Request, res: Response) {
    try {
      const data = batchUpdateStatusSchema.parse(req.body)
      const result = await usersService.batchUpdateStatus(data)
      success(res, result, '批量修改状态成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '批量修改状态失败'
      error(res, message, 400)
    }
  },

  /**
   * 修改密码（用户自己修改)
   */
  async changePassword(req: Request, res: Response) {
    try {
      const id = req.params.id
      if (!id || typeof id !== 'string') {
        throw new Error('无效的用户ID')
      }

      const data = changePasswordSchema.parse(req.body)
      const currentUserId = req.user?.userId
      if (!currentUserId) {
        throw new Error('未认证')
      }
      // 只能修改自己的密码
      if (id !== currentUserId) {
        throw new Error('无权修改他人密码')
      }
      await usersService.changePassword(id, data)
      success(res, null, '密码修改成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '修改密码失败'
      error(res, message, 400)
    }
  },

  /**
   * 重置密码(管理员操作)
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const id = req.params.id
      if (!id || typeof id !== 'string') {
        throw new Error('无效的用户ID')
      }
      const data = resetPasswordSchema.parse(req.body)
      await usersService.resetPassword(id, data)
      success(res, null, '密码重置成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '重置密码失败'
      error(res, message, 400)
    }
  },

  /**
   * 修改用户状态
   */
  async updateStatus(req: Request, res: Response) {
    try {
      const id = req.params.id
      if (!id || typeof id !== 'string') {
        throw new Error('无效的用户ID')
      }
      const data = updateStatusSchema.parse(req.body)
      const user = await usersService.updateStatus(id, data)
      success(res, user, '状态修改成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '修改状态失败'
      error(res, message, 400)
    }
  },

  /**
   * 分配角色
   */
  async assignRoles(req: Request, res: Response) {
    try {
      const id = req.params.id
      if (!id || typeof id !== 'string') {
        throw new Error('无效的用户ID')
      }
      const data = assignRolesSchema.parse(req.body)
      const user = await usersService.assignRoles(id, data)
      success(res, user, '角色分配成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '分配角色失败'
      error(res, message, 400)
    }
  },

  /**
   * 撤销角色
   */
  async revokeRole(req: Request, res: Response) {
    try {
      const id = req.params.id
      const roleId = req.params.role_id
      if (!id || typeof id !== 'string') {
        throw new Error('无效的用户ID')
      }
      if (!roleId || typeof roleId !== 'string') {
        throw new Error('无效的角色ID')
      }
      const user = await usersService.revokeRole(id, roleId)
      success(res, user, '角色撤销成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '撤销角色失败'
      error(res, message, 400)
    }
  },

  /**
   * 获取用户权限列表
   */
  async getPermissions(req: Request, res: Response) {
    try {
      const id = req.params.id
      if (!id || typeof id !== 'string') {
        throw new Error('无效的用户ID')
      }
      const permissions = await usersService.getUserPermissions(id)
      success(res, permissions)
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取权限列表失败'
      error(res, message, 400)
    }
  },
}
