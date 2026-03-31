/**
 * 密码工具函数
 */

/** 生成随机密码 */
export function generateRandomPassword(length: number = 8): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'

  let password = ''
  // 确保至少包含一个大写字母、一个小写字母和一个数字
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]

  // 填充剩余字符
  const allChars = lowercase + uppercase + numbers
  for (let i = 0; i < length - 3; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // 打乱顺序
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

/** 计算密码强度 (0-100) */
export function calculatePasswordStrength(password: string): number {
  if (!password) return 0
  let strength = 0
  if (password.length >= 8) strength += 25
  if (/[a-z]/.test(password)) strength += 25
  if (/[A-Z]/.test(password)) strength += 25
  if (/[0-9]/.test(password)) strength += 15
  if (/[^a-zA-Z0-9]/.test(password)) strength += 10
  return Math.min(strength, 100)
}

/** 获取密码强度颜色 */
export function getStrengthColor(strength: number): string {
  if (strength < 30) return '#ff4d4f'
  if (strength < 60) return '#faad14'
  if (strength < 80) return '#52c41a'
  return '#1890ff'
}

/** 获取密码强度文本 */
export function getStrengthText(strength: number): string {
  if (strength < 30) return '弱'
  if (strength < 60) return '中等'
  if (strength < 80) return '强'
  return '非常强'
}
