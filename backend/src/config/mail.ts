/**
 * 邮件配置
 * 当前使用控制台输出作为默认回退，便于在未接入 SMTP 服务时联调
 */

type PasswordResetEmailInput = {
  to: string
  username: string
  token: string
  expires_at: string
}

/**
 * 发送密码重置邮件
 * @param input 邮件内容
 */
export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
  // 注意：不要将 resetUrl 打印到日志中，否则会泄露 token
  // 日志只记录邮件发送事件，不记录敏感链接
  console.info(
    JSON.stringify({
      type: 'password_reset_email',
      to: input.to,
      username: input.username,
      // 注意：不要打印 reset_url，避免 token 泄露到日志
      expires_at: input.expires_at,
      timestamp: new Date().toISOString(),
    })
  )
}
