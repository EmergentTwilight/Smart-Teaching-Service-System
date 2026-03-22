/**
 * 密码工具函数
 * 处理密码加密和验证
 */
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

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
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}
