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
  batchCreateUsersSchema,
  batchUpdateStatusSchema,
  changePasswordSchema,
  resetPasswordSchema,
  updateStatusSchema,
  assignRolesSchema,
} from './users.types.js'

const router: RouterType = Router()

// 所有路由需要认证
router.use(authMiddleware)

/**
 * @swagger
 * /api/v1/users/logs:
 *   get:
 *     summary: 获取系统日志
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', usersController.getById)

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: 创建用户
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', validate(updateUserSchema, 'body'), usersController.update)

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: 删除用户
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', requireRoles('super_admin'), usersController.delete)

// ==================== 新增路由 ====================

/**
 * @swagger
 * /api/v1/users/batch:
 *   post:
 *     summary: 批量创建用户
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/batch',
  validate(batchCreateUsersSchema, 'body'),
  requireRoles('admin', 'super_admin'),
  usersController.batchCreate
)

/**
 * @swagger
 * /api/v1/users/batch/status:
 *   patch:
 *     summary: 批量修改用户状态
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/batch/status',
  validate(batchUpdateStatusSchema, 'body'),
  requireRoles('admin', 'super_admin'),
  usersController.batchUpdateStatus
)

/**
 * @swagger
 * /api/v1/users/{id}/password:
 *   patch:
 *     summary: 修改密码
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id/password',
  validate(changePasswordSchema, 'body'),
  usersController.changePassword
)

/**
 * @swagger
 * /api/v1/users/{id}/password/reset:
 *   post:
 *     summary: 重置密码（管理员操作）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/password/reset',
  validate(resetPasswordSchema, 'body'),
  requireRoles('admin', 'super_admin'),
  usersController.resetPassword
)

/**
 * @swagger
 * /api/v1/users/{id}/status:
 *   patch:
 *     summary: 修改用户状态
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id/status',
  validate(updateStatusSchema, 'body'),
  requireRoles('admin', 'super_admin'),
  usersController.updateStatus
)

/**
 * @swagger
 * /api/v1/users/{id}/roles:
 *   post:
 *     summary: 分配角色
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/roles',
  validate(assignRolesSchema, 'body'),
  requireRoles('admin', 'super_admin'),
  usersController.assignRoles
)

/**
 * @swagger
 * /api/v1/users/{id}/roles/{role_id}:
 *   delete:
 *     summary: 撤销角色
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id/roles/:role_id',
  requireRoles('admin', 'super_admin'),
  usersController.revokeRole
)

/**
 * @swagger
 * /api/v1/users/{id}/permissions:
 *   get:
 *     summary: 获取用户权限列表
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/permissions', requireRoles('admin', 'super_admin'), usersController.getPermissions)

export default router
