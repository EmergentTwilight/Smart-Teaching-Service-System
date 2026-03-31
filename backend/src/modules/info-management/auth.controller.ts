/**
 * 认证控制器
 * 处理认证相关的 HTTP 请求
 *
 * 注意：express-async-errors 会自动捕获所有 async 错误并传给 errorHandler 中间件
 * 因此 controller 中不需要 try-catch，错误处理统一在 middleware/error.ts
 */
import { Request, Response } from 'express'
import { authService } from './auth.service.js'
import { success, error } from '../../shared/utils/response.js'

export const authController = {
  /**
   * 用户登录
   */
  async login(req: Request, res: Response) {
    const { username, password } = req.body
    const result = await authService.login({
      username,
      password,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    })
    success(res, result, '登录成功')
  },

  /**
   * 刷新访问令牌
   */
  async refreshToken(req: Request, res: Response) {
    const { refreshToken } = req.body
    const result = await authService.refreshToken(refreshToken)
    success(res, result, '令牌刷新成功')
  },

  /**
   * 用户注册
   */
  async register(req: Request, res: Response) {
    const user = await authService.register(req.body)
    success(res, user, '注册成功', 201)
  },

  /**
   * 用户登出
   */
  async logout(req: Request, res: Response) {
    const { refreshToken } = req.body
    await authService.logout({
      userId: req.user!.userId,
      refreshToken: refreshToken,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    })
    success(res, null, '登出成功')
  },

  /**
   * 获取当前用户信息
   */
  async me(req: Request, res: Response) {
    const userId = req.user!.userId
    const user = await authService.getUserById(userId)
    success(res, user)
  },

  /**
   * 激活账号
   */
  async activate(req: Request, res: Response) {
    const { token } = req.body
    await authService.activateAccount(token)
    success(res, null, '账号激活成功')
  },

  /**
   * 修改密码
   */
  async changePassword(req: Request, res: Response) {
    const { oldPassword, newPassword } = req.body
    const userId = req.user!.userId
    await authService.changePassword(userId, oldPassword, newPassword, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    })
    success(res, null, '密码修改成功')
  },

  /**
   * 忘记密码 - 发送重置链接
   */
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body
    await authService.forgotPassword(email)
    // 即使用户不存在也返回成功，防止用户枚举攻击
    success(res, null, '如该邮箱已注册，重置链接已发送')
  },

  /**
   * 验证重置令牌是否有效
   */
  async verifyResetToken(req: Request, res: Response) {
    const { token } = req.query
    if (!token || typeof token !== 'string') {
      error(res, '缺少重置令牌', 400)
      return
    }
    const isValid = await authService.verifyResetToken(token)
    if (!isValid) {
      error(res, '重置令牌无效或已过期', 400)
      return
    }
    success(res, { valid: true }, '令牌有效')
  },

  /**
   * 确认重置密码
   */
  async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body
    await authService.resetPassword(token, newPassword, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    })
    success(res, null, '密码重置成功，请使用新密码登录')
  },
}
