/**
 * 认证控制器
 * 处理认证相关的 HTTP 请求
 */
import { Request, Response } from 'express'
import { authService } from './auth.service.js'
import { success, error } from '../../shared/utils/response.js'

export const authController = {
  /**
   * 用户登录
   */
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

  /**
   * 刷新访问令牌
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body
      const result = await authService.refreshToken(refreshToken)
      success(res, result, '令牌刷新成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '令牌刷新失败'
      error(res, message, 401)
    }
  },

  /**
   * 用户注册
   */
  async register(req: Request, res: Response) {
    try {
      const user = await authService.register(req.body)
      success(res, user, '注册成功', 201)
    } catch (err) {
      const message = err instanceof Error ? err.message : '注册失败'
      error(res, message, 400)
    }
  },

  /**
   * 用户登出
   */
  async logout(req: Request, res: Response) {
    try {
      // 如果请求体中包含 refreshToken，则撤销它
      const { refreshToken } = req.body
      if (refreshToken) {
        await authService.revokeRefreshToken(refreshToken)
      }
      success(res, null, '登出成功')
    } catch {
      // 即使撤销失败也返回成功，不影响用户体验
      success(res, null, '登出成功')
    }
  },

  /**
   * 修改密码
   */
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

  /**
   * 获取当前用户信息
   */
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
