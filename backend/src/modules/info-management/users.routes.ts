/**
 * 用户管理路由
 * 定义用户 CRUD 相关的 API 端点
 */
import { Router, type Router as RouterType } from 'express'
import { usersController } from './users.controller.js'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import {
  getUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  getLogsQuerySchema,
} from './users.types.js'

const router: RouterType = Router()

// 所有路由需要认证
router.use(authMiddleware)

/**
 * @swagger
 * /api/v1/users/logs:
 *   get:
 *     summary: 获取系统日志
 *     description: 查询系统操作日志（仅管理员可访问）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID筛选
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: 操作类型筛选
 *     responses:
 *       200:
 *         description: 成功获取日志列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 */
router.get(
  '/logs',
  validate(getLogsQuerySchema, 'query'),
  requireRoles('admin', 'super_admin'),
  usersController.getLogs
)

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: 获取用户列表
 *     description: 分页查询用户列表（仅管理员可访问）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词（用户名、姓名、邮箱）
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, BANNED]
 *         description: 用户状态筛选
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: 角色筛选
 *     responses:
 *       200:
 *         description: 成功获取用户列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 */
router.get(
  '/',
  validate(getUsersQuerySchema, 'query'),
  requireRoles('admin', 'super_admin'),
  usersController.list
)

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: 获取用户详情
 *     description: 根据ID获取用户详细信息
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 用户ID
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
 *       404:
 *         description: 用户不存在
 */
router.get('/:id', usersController.getById)

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: 创建用户
 *     description: 创建新用户（仅管理员可访问）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *               password:
 *                 type: string
 *                 minLength: 6
 *               email:
 *                 type: string
 *                 format: email
 *               realName:
 *                 type: string
 *                 maxLength: 50
 *               phone:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, BANNED]
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 创建成功
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
 *                   example: 创建成功
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 */
router.post(
  '/',
  validate(createUserSchema, 'body'),
  requireRoles('admin', 'super_admin'),
  usersController.create
)

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: 更新用户信息
 *     description: 更新指定用户的信息
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               realName:
 *                 type: string
 *                 maxLength: 50
 *               phone:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, BANNED]
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 更新成功
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
 *                   example: 更新成功
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 用户不存在
 */
router.put('/:id', validate(updateUserSchema, 'body'), usersController.update)

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: 删除用户
 *     description: 删除指定用户（仅超级管理员可访问）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 */
router.delete('/:id', requireRoles('super_admin'), usersController.delete)

export default router
