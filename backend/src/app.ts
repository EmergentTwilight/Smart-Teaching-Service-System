/**
 * Express 应用入口
 * 配置中间件、路由和错误处理
 */
import 'dotenv/config'
// Express 5 已内置 async 错误处理支持，无需 express-async-errors
import express, { type Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'

import { errorHandler } from './shared/middleware/error.js'
import { requestLogger } from './shared/middleware/requestLogger.js'
import authRoutes from './modules/info-management/auth.routes.js'
import usersRoutes from './modules/info-management/users.routes.js'
import departmentsRoutes from './modules/info-management/departments.routes.js'
import maorRoutes from './modules/info-management/major.routes.js'
import config from './config/index.js'
import { swaggerSpec } from './config/swagger.js'
import swaggerUi from 'swagger-ui-express'
import prisma from './shared/prisma/client.js'

const app: Application = express()
const PORT = config.port

// ==================== 中间件配置 ====================

// CORS 跨域配置
//
// 【CSRF 安全说明】
// 当前架构使用 JWT Bearer Token 进行身份认证，Token 通过 Authorization header 传递，
// 而非通过 Cookie 传递。因此：
//
// 1. CSRF 攻击原理：攻击者诱导用户在已登录状态下向目标站点发送伪造请求，
//    浏览器会自动携带 Cookie，导致服务器误认为是合法请求。
//
// 2. 为什么当前架构不需要 CSRF 保护：
//    - JWT 存储在客户端（localStorage/sessionStorage），不使用 Cookie
//    - 每次请求需要前端主动在 Authorization header 中添加 Bearer Token
//    - 浏览器的同源策略会阻止恶意站点读取或设置 localStorage
//    - 攻击者无法获取 Token，因此无法构造有效的伪造请求
//
// 3. 如果未来改用 Cookie 存储 JWT，则需要：
//    - 设置 httpOnly: true（防止 XSS 读取）
//    - 设置 sameSite: 'strict' 或 'lax'（防止 CSRF）
//    - 添加 CSRF Token 验证（双重提交 Cookie 模式）
//
// 参考资料：
// - https://owasp.org/www-community/attacks/csrf
// - https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = config.cors.origin.split(',')
      // 允许没有 origin 的请求（如 Postman、服务器到服务器）
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.warn(`CORS: Origin ${origin} not in allowed list:`, allowedOrigins)
        callback(null, false) // 拒绝不在白名单的 origin
      }
    },
    credentials: true,
  })
)

// 安全头部
app.use(helmet())

// 响应压缩
app.use(compression())

// 请求日志
app.use(requestLogger)

// HTTP 请求日志
app.use(morgan('dev'))

// JSON 解析
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ==================== API 文档 (Swagger) ====================
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'STSS API 文档',
  })
)

// Swagger JSON 导出
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

// ==================== 健康检查 ====================
app.get('/api/health', async (req, res) => {
  const startTime = Date.now()
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {}

  // 检查数据库连接
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    checks.database = {
      status: 'connected',
      latency: Date.now() - dbStart,
    }
  } catch (error) {
    checks.database = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
  }

  // 检查 Redis 连接（使用 set + del 验证读写正常）
  try {
    const redisStart = Date.now()
    const { redisClient } = await import('./config/redis.js')
    const testKey = `health:check:${Date.now()}`
    await redisClient.set(testKey, 'ok', { ex: 10 })
    await redisClient.del(testKey)
    checks.redis = {
      status: 'connected',
      latency: Date.now() - redisStart,
    }
  } catch (error) {
    checks.redis = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown redis error',
    }
  }

  // 检查服务器状态
  checks.server = {
    status: 'running',
  }

  // 确定整体状态
  const allHealthy = Object.values(checks).every(
    (check) => check.status === 'connected' || check.status === 'running'
  )
  const status = allHealthy ? 'ok' : 'degraded'

  const health = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: Date.now() - startTime,
    checks,
  }

  // 如果状态为 degraded，返回 503 状态码
  res.status(status === 'ok' ? 200 : 503).json(health)
})

// ==================== API 路由 ====================
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', usersRoutes)
app.use('/api/v1/departments', departmentsRoutes)
app.use('/api/v1/majors', maorRoutes)

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: 'Not Found',
  })
})

// 错误处理
app.use(errorHandler)

// 确保数据库连接已建立后再接受请求
await prisma.$connect()

// 启动服务器 - 监听 0.0.0.0 以便 Docker 容器访问
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`)
})

export default app
