import { Request, Response } from 'express'
import { authService } from './auth.service.js'
import { success, error } from '../../shared/utils/response.js'

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body
      const result = await authService.login(username, password)
      success(res, result, '登录成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败'
      error(res, message, 401)
    }
  },

  async register(req: Request, res: Response) {
    try {
      const user = await authService.register(req.body)
      success(res, user, '注册成功', 201)
    } catch (err) {
      const message = err instanceof Error ? err.message : '注册失败'
      error(res, message, 400)
    }
  },

  async logout(req: Request, res: Response) {
    success(res, null, '登出成功')
  },

  async changePassword(req: Request, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body
      const userId = req.user!.userId
      await authService.changePassword(userId, oldPassword, newPassword)
      success(res, null, '密码修改成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '密码修改失败'
      error(res, message, 400)
    }
  },

  async me(req: Request, res: Response) {
    try {
      const userId = req.user!.userId
      const user = await authService.getUserById(userId)
      success(res, user)
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取用户信息失败'
      error(res, message, 404)
    }
  },
}
