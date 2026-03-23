/**
 * 用户管理控制器
 * 处理用户 CRUD 相关的 HTTP 请求
 */
import { Request, Response } from 'express'
import { usersService } from './users.service.js'
import { success, error, paginated } from '../../shared/utils/response.js'
import { getUsersQuerySchema, createUserSchema, updateUserSchema, getLogsQuerySchema } from './users.types.js'

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
}
