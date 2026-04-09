/**
 * 认证中间件
 * 处理 JWT token 验证和权限控制
 */
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import config from '../../config/index.js'
import { error } from '../utils/response.js'

/**
 * JWT 载荷结构
 */
export interface JwtPayload {
  /** 用户ID */
  userId: string
  /** 用户名 */
  username: string
  /** 用户角色列表 */
  roles: string[]
}

// 扩展 Express Request 类型
declare module 'express' {
  interface Request {
    user?: JwtPayload
  }
}

/**
 * 认证中间件
 * 验证请求头中的 JWT token 并解析用户信息
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, '未提供认证令牌', 401)
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload

    req.user = decoded
    next()
  } catch {
    return error(res, '无效或过期的令牌', 401)
  }
}

/**
 * 角色权限中间件工厂
 * @param roles 允许访问的角色列表
 * @returns Express 中间件函数
 */
export const requireRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return error(res, '未认证', 401)
    }

    // 空角色列表表示允许所有已认证用户
    if (roles.length === 0) {
      return next()
    }

    const hasRole = req.user.roles.some((role) => roles.includes(role))
    if (!hasRole) {
      return error(res, '权限不足', 403)
    }

    next()
  }
}

/**
 * 自身或管理员权限中间件
 * 用户只能访问自己的资源，管理员可以访问所有资源
 * @param adminRoles 管理员角色列表（super_admin 会自动包含）
 * @returns Express 中间件函数
 */
export const requireSelfOrAdmin = (...adminRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return error(res, '未认证', 401)
    }

    const targetId = req.params.id
    const isSelf = req.user.userId === targetId

    // super_admin 自动拥有所有管理员权限
    const allAdminRoles = new Set([...adminRoles, 'super_admin'])
    const isAdmin = req.user.roles.some((role) => allAdminRoles.has(role))

    if (!isSelf && !isAdmin) {
      return error(res, '权限不足', 403)
    }

    next()
  }
}
