/**
 * 认证控制器
 * 处理认证相关的 HTTP 请求
 */
import { Request, Response } from 'express'
import { authService } from './auth.service.js'
import { success, error } from '../../shared/utils/response.js'

function getStatusCode(err: unknown, fallback: number): number {
  if (err && typeof err === 'object' && 'statusCode' in err && typeof err.statusCode === 'number') {
    return err.statusCode
  }

  return fallback
}

export const authController = {
  /**
   * 用户登录
   */
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body
      const result = await authService.login({
        username,
        password,
        ip_address: req.ip,
        user_agent: req.get('user-agent') || undefined,
      })
      success(res, result, '登录成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败'
      error(res, message, getStatusCode(err, 401))
    }
  },

  /**
   * 刷新访问令牌
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const { refresh_token } = req.body
      const result = await authService.refreshToken(refresh_token)
      success(res, result, '令牌刷新成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '令牌刷新失败'
      error(res, message, getStatusCode(err, 401))
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
      const { refresh_token } = req.body
      await authService.logout({
        user_id: req.user!.userId,
        refresh_token,
        ip_address: req.ip,
        user_agent: req.get('user-agent') || undefined,
      })
      success(res, null, '登出成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '登出失败'
      error(res, message, getStatusCode(err, 400))
    }
  },

  /**
   * 修改密码
   */
  async changePassword(req: Request, res: Response) {
    try {
      const { old_password, new_password } = req.body
      const userId = req.user!.userId
      await authService.changePassword(userId, old_password, new_password, {
        ip_address: req.ip,
        user_agent: req.get('user-agent') || undefined,
      })
      success(res, null, '密码修改成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '密码修改失败'
      error(res, message, getStatusCode(err, 400))
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

  /**
   * 激活账号
   */
  async activate(req: Request, res: Response) {
    try {
      const { token } = req.body
      await authService.activateAccount(token)
      success(res, null, '账号激活成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '账号激活失败'
      error(res, message, getStatusCode(err, 400))
    }
  },

  /**
   * 忘记密码
   */
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body
      await authService.forgotPassword(email)
      success(res, null, '如该邮箱已注册，重置链接已发送')
    } catch {
      success(res, null, '如该邮箱已注册，重置链接已发送')
    }
  },

  /**
   * 确认重置密码
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, new_password } = req.body
      await authService.resetPassword(token, new_password, {
        ip_address: req.ip,
        user_agent: req.get('user-agent') || undefined,
      })
      success(res, null, '密码重置成功，请使用新密码登录')
    } catch (err) {
      const message = err instanceof Error ? err.message : '密码重置失败'
      error(res, message, getStatusCode(err, 400))
    }
  },
}
