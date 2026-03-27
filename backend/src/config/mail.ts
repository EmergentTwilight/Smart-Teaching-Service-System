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
  const resetUrlBase = process.env.PASSWORD_RESET_URL_BASE || 'http://localhost:5173/reset-password'
  const resetUrl = `${resetUrlBase}?token=${encodeURIComponent(input.token)}`

  console.info(
    JSON.stringify({
      type: 'password_reset_email',
      to: input.to,
      username: input.username,
      reset_url: resetUrl,
      expires_at: input.expires_at,
      timestamp: new Date().toISOString(),
    })
  )
}
