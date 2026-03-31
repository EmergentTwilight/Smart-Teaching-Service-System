/**
 * 邮件配置
 * 使用 nodemailer 发送真实的邮件
 */
import nodemailer from 'nodemailer'
import config from './index.js'

type PasswordResetEmailInput = {
  to: string
  username: string
  token: string
  expires_at: string
}

// 创建 nodemailer transporter
let transporter: nodemailer.Transporter | null = null

/**
 * 获取或创建 nodemailer transporter
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    // 检查 SMTP 配置是否存在
    if (!config.smtp.host || config.smtp.host === 'smtp.example.com') {
      console.warn(
        '⚠️ SMTP_HOST not configured, password reset emails will be logged to console only'
      )
      // 创建一个只输出到控制台的 mock transporter
      transporter = {
        sendMail: async (options: nodemailer.SendMailOptions) => {
          console.log('📧 [MOCK EMAIL] Password reset email would be sent:')
          console.log(`  To: ${options.to}`)
          console.log(`  Subject: ${options.subject}`)
          if (typeof options.html === 'string') {
            // 提取重置链接用于开发测试
            const match = options.html.match(/href="([^"]+reset-password[^"]*)"/)
            if (match) {
              console.log(`  🔗 Reset URL: ${match[1]}`)
            }
          }
          return { messageId: `mock-${Date.now()}` }
        },
      } as nodemailer.Transporter
    } else {
      // 使用真实的 SMTP 服务
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465, // 465 端口使用 SSL
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      })
    }
  }
  return transporter
}

/**
 * 发送密码重置邮件
 * @param input 邮件内容
 */
export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
  const frontendUrl = config.frontend.url
  const resetUrl = `${frontendUrl}/reset-password?token=${input.token}`

  const mailOptions = {
    from: config.smtp.from,
    to: input.to,
    subject: '【智慧教学服务系统】重置您的密码',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #6366f1; margin: 0;">重置您的密码</h1>
        </div>
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
          您好，<strong>${input.username}</strong>，
        </p>
        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
          我们收到了重置您密码的请求。请点击下面的按钮来设置新密码：
        </p>
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
            重置密码
          </a>
        </div>
        <p style="color: #999; font-size: 12px; margin-bottom: 10px;">
          此链接将在 <strong>${new Date(input.expires_at).toLocaleString('zh-CN')}</strong> 后失效。
        </p>
        <p style="color: #999; font-size: 12px; margin-bottom: 10px;">
          如果您没有请求重置密码，请忽略此邮件。
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          此邮件由智慧教学服务系统自动发送，请勿直接回复。
        </p>
      </div>
    `,
    text: `
您好，${input.username}，

我们收到了重置您密码的请求。请点击下面的链接来设置新密码：

${resetUrl}

此链接将在 ${new Date(input.expires_at).toLocaleString('zh-CN')} 后失效。

如果您没有请求重置密码，请忽略此邮件。

此邮件由智慧教学服务系统自动发送，请勿直接回复。
    `,
  }

  try {
    const result = await getTransporter().sendMail(mailOptions)
    console.log(`✅ Password reset email sent to ${input.to}, messageId: ${result.messageId}`)
  } catch (error) {
    const err = error as { message?: string; code?: string; command?: string }
    console.error('❌ Failed to send password reset email:', err.message || error)
    console.error('❌ Error code:', err.code)
    console.error('❌ Error command:', err.command)
    throw error
  }
}
