import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import config from '../../config/index.js'
import { error } from '../utils/response.js'

export interface JwtPayload {
  userId: string
  username: string
  roles: string[]
}

// 扩展 Express Request 类型
declare module 'express' {
  interface Request {
    user?: JwtPayload
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

export const requireRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return error(res, '未认证', 401)
    }

    const hasRole = req.user.roles.some((role) => roles.includes(role))
    if (!hasRole) {
      return error(res, '权限不足', 403)
    }

    next()
  }
}
