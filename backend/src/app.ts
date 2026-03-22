/**
 * Express 应用入口
 * 配置中间件、路由和错误处理
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { errorHandler } from './shared/middleware/error.js'
import authRoutes from './modules/info-management/auth.routes.js'
import usersRoutes from './modules/info-management/users.routes.js'
import departmentsRoutes from './modules/info-management/departments.routes.js'
import coursesRoutes from './modules/info-management/courses.routes.js'
import config from './config/index.js'

const app = express()
const PORT = config.port

// 中间件
app.use(cors({
  origin: config.cors.origin.split(','),
  credentials: true,
}))
app.use(helmet())
app.use(compression())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API 路由
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
