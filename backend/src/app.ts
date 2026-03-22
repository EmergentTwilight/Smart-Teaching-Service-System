/**
 * Express 应用入口
 * 配置中间件、路由和错误处理
 */
import 'dotenv/config'
import express, { type Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { errorHandler } from './shared/middleware/error.js'
import authRoutes from './modules/info-management/auth.routes.js'
import usersRoutes from './modules/info-management/users.routes.js'
import departmentsRoutes from './modules/info-management/departments.routes.js'
import coursesRoutes from './modules/info-management/courses.routes.js'
import config from './config/index.js'
import { swaggerSpec } from './config/swagger.js'
import swaggerUi from 'swagger-ui-express'

const app: Application = express()
const PORT = config.port

// ==================== 中间件配置 ====================

// CORS 跨域配置
app.use(
  cors({
    origin: config.cors.origin.split(','),
    credentials: true,
  })
)

// 安全头部
app.use(helmet())

// 响应压缩
app.use(compression())

// 请求日志
app.use(morgan('dev'))

// JSON 解析
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 请求速率限制 - 防止暴力攻击
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 次请求
  message: {
    code: 429,
    message: '请求过于频繁，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// 认证接口单独限流 - 更严格的限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 10, // 每个 IP 最多 10 次登录尝试
  message: {
    code: 429,
    message: '登录尝试次数过多，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/v1/auth/login', authLimiter)
app.use('/api/v1/auth/register', authLimiter)

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
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ==================== API 路由 ====================
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', usersRoutes)
app.use('/api/v1/departments', departmentsRoutes)
app.use('/api/v1/courses', coursesRoutes)

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: 'Not Found',
  })
})

// 错误处理
app.use(errorHandler)

// 启动服务器 - 监听 0.0.0.0 以便 Docker 容器访问
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`)
})

export default app
