/**
 * 密码工具函数
 * 处理密码加密和验证
 */
import bcrypt from 'bcryptjs'
import config from '../../config/index.js'

const SALT_ROUNDS = 10

/**
 * 密码强度验证结果
 */
export interface PasswordValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误信息列表 */
  errors: string[]
}

/**
 * 验证密码强度
 * @param password 待验证的密码
 * @returns 验证结果
 */
export const validatePasswordStrength = (password: string): PasswordValidationResult => {
  const errors: string[] = []
  const { minLength, requireNumber, requireLetter, requireSpecialChar } = config.password

  // 检查最小长度
  if (password.length < minLength) {
    errors.push(`密码长度至少 ${minLength} 位`)
  }

  // 检查是否需要数字
  if (requireNumber && !/\d/.test(password)) {
    errors.push('密码必须包含数字')
  }

  // 检查是否需要字母
  if (requireLetter && !/[a-zA-Z]/.test(password)) {
    errors.push('密码必须包含字母')
  }

  // 检查是否需要特殊字符
  if (requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含特殊字符')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 加密密码
 * @param password 原始密码
 * @returns 加密后的密码哈希
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * 验证密码
 * @param password 原始密码
 * @param hash 密码哈希
 * @returns 密码是否匹配
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}
