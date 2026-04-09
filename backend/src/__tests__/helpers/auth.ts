/**
 * 认证测试辅助函数
 */
import jwt, { type SignOptions } from 'jsonwebtoken'
import config from '../../config/index.js'

/**
 * 生成测试用 JWT Token
 */
export function generateTestToken(payload: {
  userId: string
  username: string
  roles?: string[]
  expiresIn?: string
}): string {
  const { userId, username, roles = ['student'], expiresIn = '2h' } = payload

  return jwt.sign(
    {
      userId,
      username,
      roles,
      type: 'access',
    },
    config.jwt.secret,
    { expiresIn: expiresIn as SignOptions['expiresIn'] }
  )
}

/**
 * 生成过期的测试 Token
 */
export function generateExpiredTestToken(payload: {
  userId: string
  username: string
  roles?: string[]
}): string {
  const { userId, username, roles = ['student'] } = payload

  return jwt.sign(
    {
      userId,
      username,
      roles,
      type: 'access',
    },
    config.jwt.secret,
    { expiresIn: '-1h' } as SignOptions // 已过期
  )
}

/**
 * 生成无效的测试 Token (签名错误)
 */
export function generateInvalidTestToken(): string {
  return jwt.sign(
    {
      userId: 'test-user-id',
      username: 'testuser',
      roles: ['student'],
      type: 'access',
    },
    'wrong-secret',
    { expiresIn: '2h' } as SignOptions
  )
}

/**
 * 解析 Token (不验证签名)
 */
export function decodeToken(token: string) {
  return jwt.decode(token)
}

/**
 * 创建认证请求头
 */
export function createAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  }
}
