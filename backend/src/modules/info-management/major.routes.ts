/**
 * 专业管理路由
 * 定义专业相关的 API 端点
 *
 */

import { Router, type Router as RouterType } from 'express'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import { majorController } from './major.controller.js'
import {
  getMajorIdSchema,
  getMajorListSchema,
  createMajorSchema,
  updateMajorSchema,
} from './major.types.js'

const router: RouterType = Router()

// 所有路由需要认证
router.use(authMiddleware)

/**
 * @swagger
 * /api/v1/majors/:
 *   get:
 *     summary: 获取专业列表
 *     tags: [Majors]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', validate(getMajorListSchema, 'params'), majorController.list)

/**
 * @swagger
 * /api/v1/majors/{id}:
 *   get:
 *     summary: 获取专业详情
 *     tags: [Majors]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', validate(getMajorIdSchema, 'params'), majorController.detail)

/**
 * @swagger
 * /api/v1/majors/:
 *   post:
 *     summary: 创建专业
 *     tags: [Majors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 */
router.post('/', requireRoles('super_admin'), validate(createMajorSchema), majorController.create)

/**
 * @swagger
 * /api/v1/majors/{id}:
 *   put:
 *     summary: 更新专业
 *     tags: [Majors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 */
router.put(
  '/:id',
  requireRoles('super_admin', 'admin'),
  validate(updateMajorSchema),
  majorController.update
)

/**
 * @swagger
 * /api/v1/majors/{id}:
 *   delete:
 *     summary: 删除专业
 *     tags: [Majors]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', requireRoles('super_admin'), majorController.delete)

export default router
