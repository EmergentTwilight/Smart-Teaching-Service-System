/**
 * 用户管理控制器
 * 处理用户 CRUD 相关的 HTTP 请求
 */
import { Request, Response, NextFunction } from 'express'
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

export const usersController = {
  /**
   * 获取用户列表
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = getUsersQuerySchema.parse(req.query)
      const result = await usersService.getUsers(query)
      paginated(res, result.items, result.pagination)
    } catch (err) {
      next(err)
    }
  },

  /**
   * 获取单个用户详情
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const user = await usersService.getUserById(id)
      success(res, user)
    } catch (err) {
      next(err)
    }
  },

  /**
   * 创建用户
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createUserSchema.parse(req.body)
      const user = await usersService.createUser(data)
      success(res, user, '创建成功', 201)
    } catch (err) {
      next(err)
    }
  },

  /**
   * 更新用户信息
   * 普通用户不能修改 status、roleIds 和 password 字段
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const data = updateUserSchema.parse(req.body)
      const currentUser = req.user!
      const isAdmin = currentUser.roles.some((r) => r === 'admin' || r === 'super_admin')

      // 非管理员不能修改 status 字段
      if (!isAdmin && data.status !== undefined) {
        const error = new Error('无权修改用户状态')
        ;(error as Error & { status?: number }).status = 403
        throw error
      }

      // 非管理员不能修改 roleIds 字段
      if (!isAdmin && data.roleIds !== undefined) {
        const error = new Error('无权修改用户角色')
        ;(error as Error & { status?: number }).status = 403
        throw error
      }

      // 非管理员（和管理员）都不能通过此接口修改密码
      // 密码修改必须走专门的 changePassword 或 resetPassword 接口
      if (data.password !== undefined) {
        const error = new Error('不允许通过此接口修改密码，请使用专门的密码修改接口')
        ;(error as Error & { status?: number }).status = 400
        throw error
      }

      const user = await usersService.updateUser(id, data)
      success(res, user, '更新成功')
    } catch (err) {
      next(err)
    }
  },

  /**
   * 删除用户
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      await usersService.deleteUser(id)
      success(res, null, '删除成功')
    } catch (err) {
      next(err)
    }
  },

  /**
   * 获取系统日志
   */
  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const query = getLogsQuerySchema.parse(req.query)
      const result = await usersService.getLogs(query)
      paginated(res, result.items, result.pagination)
    } catch (err) {
      next(err)
    }
  },

  // ==================== 新增方法 ====================

  /**
   * 批量创建用户
   */
  async batchCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = batchCreateUsersSchema.parse(req.body)
      const result = await usersService.batchCreateUsers(data)
      success(res, result, '批量创建成功', 201)
    } catch (err) {
      next(err)
    }
  },

  /**
   * 批量修改用户状态
   */
  async batchUpdateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = batchUpdateStatusSchema.parse(req.body)
      const result = await usersService.batchUpdateStatus(data)
      success(res, result, '批量修改状态成功')
    } catch (err) {
      next(err)
    }
  },

  /**
   * 修改密码（用户自己修改)
   */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const data = changePasswordSchema.parse(req.body)
      const currentUserId = req.user?.userId

      // 只能修改自己的密码
      if (id !== currentUserId) {
        const error = new Error('无权修改他人密码')
        ;(error as Error & { status?: number }).status = 403
        throw error
      }

      await usersService.changePassword(id, data)
      success(res, null, '密码修改成功')
    } catch (err) {
      next(err)
    }
  },

  /**
   * 重置密码(管理员操作)
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const data = resetPasswordSchema.parse(req.body)
      await usersService.resetPassword(id, data)
      success(res, null, '密码重置成功')
    } catch (err) {
      next(err)
    }
  },

  /**
   * 修改用户状态
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const data = updateStatusSchema.parse(req.body)
      const user = await usersService.updateStatus(id, data)
      success(res, user, '状态修改成功')
    } catch (err) {
      next(err)
    }
  },

  /**
   * 分配角色
   */
  async assignRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const data = assignRolesSchema.parse(req.body)
      const user = await usersService.assignRoles(id, data)
      success(res, user, '角色分配成功')
    } catch (err) {
      next(err)
    }
  },

  /**
   * 撤销角色
   */
  async revokeRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const role_id = req.params.role_id as string
      const user = await usersService.revokeRole(id, role_id as string)
      success(res, user, '角色撤销成功')
    } catch (err) {
      next(err)
    }
  },

  /**
   * 获取用户权限列表
   * 管理员可查看任意用户权限，普通用户只能查看自己的权限
   */
  async getPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const currentUser = req.user!
      const isSelf = currentUser.userId === id
      const isAdmin = currentUser.roles.some((r) => r === 'admin' || r === 'super_admin')

      // 非管理员只能查看自己的权限
      if (!isAdmin && !isSelf) {
        const error = new Error('无权查看他人权限')
        ;(error as Error & { status?: number }).status = 403
        throw error
      }

      const permissions = await usersService.getUserPermissions(id)
      success(res, permissions)
    } catch (err) {
      next(err)
    }
  },
}
