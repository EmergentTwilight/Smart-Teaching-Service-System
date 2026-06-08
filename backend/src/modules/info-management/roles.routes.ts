/**
 * 角色权限管理路由
 * 定义角色 CRUD、权限查询、角色-权限关系维护等 API 端点
 */
import { Router, type Router as RouterType } from 'express'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import { rolesController } from './roles.controller.js'
import {
  roleIdSchema,
  rolePermissionParamsSchema,
  getRoleListSchema,
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
  getPermissionListSchema,
} from './roles.types.js'

const router: RouterType = Router()

// 所有路由需要认证
router.use(authMiddleware)

// ==================== 角色 CRUD ====================

/**
 * @swagger
 * /api/v1/roles:
 *   get:
 *     summary: 获取角色列表（管理端）
 *     description: 获取所有角色及其关联的权限、用户数量
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 按角色名称/代码搜索
 *       - in: query
 *         name: builtin
 *         schema:
 *           type: boolean
 *         description: 是否筛选系统内置角色
 *     responses:
 *       200:
 *         description: 成功获取角色列表
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 */
router.get(
  '/',
  requireRoles('admin', 'super_admin'),
  validate(getRoleListSchema, 'query'),
  rolesController.list
)

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   get:
 *     summary: 获取角色详情
 *     description: 根据ID获取角色详细信息及其权限和用户列表
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 角色ID
 *     responses:
 *       200:
 *         description: 成功获取角色信息
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 *       404:
 *         description: 角色不存在
 */
router.get(
  '/:id',
  requireRoles('admin', 'super_admin'),
  validate(roleIdSchema, 'params'),
  rolesController.detail
)

/**
 * @swagger
 * /api/v1/roles:
 *   post:
 *     summary: 创建角色
 *     description: 创建一个新的角色，可同时分配权限
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permission_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       201:
 *         description: 角色创建成功
 *       400:
 *         description: 无效的请求数据
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 *       409:
 *         description: 角色代码或名称已存在
 */
router.post(
  '/',
  requireRoles('super_admin'),
  validate(createRoleSchema, 'body'),
  rolesController.create
)

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   put:
 *     summary: 更新角色
 *     description: 更新角色名称和描述，系统内置角色的code不可修改
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 角色ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: 角色更新成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 *       404:
 *         description: 角色不存在
 */
router.put(
  '/:id',
  requireRoles('super_admin'),
  validate(roleIdSchema, 'params'),
  validate(updateRoleSchema, 'body'),
  rolesController.update
)

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   delete:
 *     summary: 删除角色
 *     description: 删除角色，要求角色未被任何用户引用且不是系统内置角色
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 角色ID
 *     responses:
 *       200:
 *         description: 角色已删除
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 *       404:
 *         description: 角色不存在
 *       409:
 *         description: 角色正在被使用或为系统内置角色
 */
router.delete(
  '/:id',
  requireRoles('super_admin'),
  validate(roleIdSchema, 'params'),
  rolesController.delete
)

// ==================== 角色-权限管理 ====================

/**
 * @swagger
 * /api/v1/roles/{id}/permissions:
 *   post:
 *     summary: 为角色分配权限
 *     description: 批量为角色分配权限，已存在的权限将被跳过
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 角色ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permission_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: 权限分配成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 *       404:
 *         description: 角色或权限不存在
 */
router.post(
  '/:id/permissions',
  requireRoles('super_admin'),
  validate(roleIdSchema, 'params'),
  validate(assignPermissionsSchema, 'body'),
  rolesController.assignPermissions
)

/**
 * @swagger
 * /api/v1/roles/{id}/permissions/{permission_id}:
 *   delete:
 *     summary: 撤销角色权限
 *     description: 撤销角色的某个权限
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 角色ID
 *       - in: path
 *         name: permission_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 权限ID
 *     responses:
 *       200:
 *         description: 权限已撤销
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 *       404:
 *         description: 角色或权限不存在
 */
router.delete(
  '/:id/permissions/:permission_id',
  requireRoles('super_admin'),
  validate(rolePermissionParamsSchema, 'params'),
  rolesController.revokePermission
)

export default router

/**
 * 权限列表路由（独立挂载在 /api/v1/permissions）
 */
export const permissionsRouter: RouterType = Router()

permissionsRouter.use(authMiddleware)

/**
 * @swagger
 * /api/v1/permissions:
 *   get:
 *     summary: 获取权限列表
 *     description: 获取所有可用权限，支持按资源、操作、关键词筛选
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: 按资源筛选
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: 按操作筛选
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 成功获取权限列表
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 */
permissionsRouter.get(
  '/',
  requireRoles('admin', 'super_admin'),
  validate(getPermissionListSchema, 'query'),
  rolesController.listPermissions
)
