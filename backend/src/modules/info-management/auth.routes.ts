/**
 * 认证路由
 * 定义认证相关的 API 端点
 */
import { Router, type Router as RouterType } from 'express'
import { authController } from './auth.controller.js'
import { authMiddleware } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  refreshTokenSchema,
  activateAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.types.js'

const router: RouterType = Router()

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 使用用户名和密码进行登录，返回访问令牌和刷新令牌
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 example: admin
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 登录成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: 访问令牌（有效期15分钟）
 *                     refreshToken:
 *                       type: string
 *                       description: 刷新令牌（有效期7天）
 *                     expiresIn:
 *                       type: integer
 *                       description: 访问令牌有效期（秒）
 *                       example: 900
 *                     tokenType:
 *                       type: string
 *                       example: Bearer
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: 用户名或密码错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', validate(loginSchema, 'body'), authController.login)

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: 刷新访问令牌
 *     description: 使用刷新令牌获取新的访问令牌和刷新令牌（令牌轮换机制）
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 登录时获取的刷新令牌
 *     responses:
 *       200:
 *         description: 令牌刷新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 令牌刷新成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: 新的访问令牌
 *                     refreshToken:
 *                       type: string
 *                       description: 新的刷新令牌（旧的刷新令牌将失效）
 *                     expiresIn:
 *                       type: integer
 *                       description: 访问令牌有效期（秒）
 *                       example: 900
 *                     tokenType:
 *                       type: string
 *                       example: Bearer
 *       401:
 *         description: 刷新令牌无效或已过期
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', validate(refreshTokenSchema, 'body'), authController.refreshToken)

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 注册新用户账户
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - realName
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 example: newuser
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "123456"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               realName:
 *                 type: string
 *                 maxLength: 50
 *                 example: 张三
 *               phone:
 *                 type: string
 *                 example: "13800138000"
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *                 example: MALE
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: 注册成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     realName:
 *                       type: string
 *       400:
 *         description: 注册失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', validate(registerSchema, 'body'), authController.register)

router.post('/activate', validate(activateAccountSchema, 'body'), authController.activate)

router.post(
  '/password/forgot',
  validate(forgotPasswordSchema, 'body'),
  authController.forgotPassword
)

router.post(
  '/password/reset/confirm',
  validate(resetPasswordSchema, 'body'),
  authController.resetPassword
)

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: 用户登出
 *     description: 退出登录状态，可选传入 refreshToken 使其失效
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 可选，传入后将使该刷新令牌失效
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', authMiddleware, validate(refreshTokenSchema, 'body'), authController.logout)

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: 修改密码
 *     description: 修改当前用户的密码
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 minLength: 1
 *                 example: oldpassword
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: newpassword
 *     responses:
 *       200:
 *         description: 密码修改成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: 修改失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema, 'body'),
  authController.changePassword
)

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     description: 获取已登录用户的详细信息
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取用户信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', authMiddleware, authController.me)

export default router
