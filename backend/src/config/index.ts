/**
 * 应用配置
 * 从环境变量加载配置项，包含必要的验证
 */

/**
 * 验证必需的环境变量
 * 在生产环境中，敏感配置必须通过环境变量设置
 */
const validateEnv = () => {
  const requiredInProduction = ['JWT_SECRET']
  const warnings: string[] = []

  if (process.env.NODE_ENV === 'production') {
    // 生产环境：必需的环境变量
    for (const key of requiredInProduction) {
      if (!process.env[key]) {
        throw new Error(`生产环境缺少必需的环境变量: ${key}`)
      }
    }
  } else {
    // 开发环境：检查并警告
    if (!process.env.JWT_SECRET) {
      warnings.push('警告: JWT_SECRET 未设置，使用默认值（仅限开发环境）')
    }
  }

  // 警告信息
  if (warnings.length > 0) {
    warnings.forEach((w) => console.warn(`⚠️  ${w}`))
  }
}

// 执行验证
validateEnv()

/**
 * 应用配置对象
 */
const config = {
  /** 服务端口 */
  port: parseInt(process.env.PORT || '3000', 10),

  /** 运行环境 */
  nodeEnv: process.env.NODE_ENV || 'development',

  /** 数据库配置 */
  database: {
    /** 数据库连接 URL */
    url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  },

  /** JWT 配置 */
  jwt: {
    /** JWT 密钥（生产环境必须通过环境变量设置） */
    secret: process.env.JWT_SECRET || 'stss-super-secret-jwt-key-2026-dev-only',
    /** Access Token 过期时间（短时效，提高安全性） */
    accessTokenExpiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '2h') as string,
    /** Refresh Token 过期时间（长时效，用于刷新 access token） */
    refreshTokenExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as string,
    /** @deprecated 使用 accessTokenExpiresIn 代替 */
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
  },

  /** CORS 配置 */
  cors: {
    /** 允许的来源（逗号分隔） */
    origin:
      process.env.CORS_ORIGIN ||
      'http://localhost:5173,http://localhost:5174,http://localhost:5175',
  },

  /** 密码安全配置 */
  password: {
    /** 最小密码长度 */
    minLength: 8,
    /** 是否需要数字 */
    requireNumber: true,
    /** 是否需要字母 */
    requireLetter: true,
    /** 是否需要特殊字符（生产环境建议开启） */
    requireSpecialChar: process.env.NODE_ENV === 'production',
  },

  /** 速率限制配置 */
  rateLimit: {
    /** 通用 API 窗口期（分钟） */
    windowMs: 15,
    /** 通用 API 最大请求数 */
    maxRequests: 100,
    /** 认证 API 最大请求数 */
    authMaxRequests: 10,
  },

  /** SMTP 邮件配置 */
  smtp: {
    /** SMTP 服务器地址 */
    host: process.env.SMTP_HOST || 'smtp.example.com',
    /** SMTP 端口 */
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    /** SMTP 用户名 */
    user: process.env.SMTP_USER || '',
    /** SMTP 密码 */
    pass: process.env.SMTP_PASS || '',
    /** 发件人邮箱 */
    from: process.env.SMTP_FROM || 'noreply@example.com',
  },

  /** 前端配置 */
  frontend: {
    /** 前端 URL（用于生成重置链接） */
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
}

export default config
