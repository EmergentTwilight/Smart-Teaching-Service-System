/**
 * 认证路由
 * 定义认证相关的 API 端点
 */
import { Router } from 'express'
import { authController } from './auth.controller.js'
import { authMiddleware } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import { loginSchema, registerSchema, changePasswordSchema } from './auth.types.js'

const router = Router()

router.post('/login', validate(loginSchema, 'body'), authController.login)
router.post('/register', validate(registerSchema, 'body'), authController.register)
router.post('/logout', authMiddleware, authController.logout)
router.post('/change-password', authMiddleware, validate(changePasswordSchema, 'body'), authController.changePassword)
router.get('/me', authMiddleware, authController.me)

export default router
