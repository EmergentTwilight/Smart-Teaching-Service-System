/**
 * 培养方案路由
 * 定义培养方案相关的 API 端点
 */

import { Router, type Router as RouterType } from 'express'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import { curriculumController } from './curriculums.controller.js'
import {
  getCurriculumListSchema,
  curriculumIdSchema,
  createCurriculumSchema,
  updateCurriculumSchema,
  addCourseToCurriculumSchema,
  batchAddCoursesSchema,
  updateCurriculumCourseSchema,
} from './curriculums.types.js'

const router: RouterType = Router()

router.use(authMiddleware)

/**
 * @swagger
 * /api/v1/curriculums:
 *   get:
 *     summary: 获取培养方案列表
 *     tags: [Curriculums]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', validate(getCurriculumListSchema, 'params'), curriculumController.list)

/**
 * @swagger
 * /api/v1/curriculums/{id}:
 *   get:
 *     summary: 获取培养方案详情
 *     tags: [Curriculums]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', validate(curriculumIdSchema, 'params'), curriculumController.detail)

/**
 * @swagger
 * /api/v1/curriculums:
 *   post:
 *     summary: 创建培养方案
 *     tags: [Curriculums]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  requireRoles('admin', 'super_admin'),
  validate(createCurriculumSchema),
  curriculumController.create
)

/**
 * @swagger
 * /api/v1/curriculums/{id}:
 *   put:
 *     summary: 更新培养方案
 *     tags: [Curriculums]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  requireRoles('admin', 'super_admin'),
  validate(updateCurriculumSchema),
  curriculumController.update
)

/**
 * @swagger
 * /api/v1/curriculums/{id}:
 *   delete:
 *     summary: 删除培养方案
 *     tags: [Curriculums]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', requireRoles('super_admin'), curriculumController.delete)

/**
 * @swagger
 * /api/v1/curriculums/{id}/courses:
 *   post:
 *     summary: 添加课程到培养方案
 *     tags: [Curriculums]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/courses',
  requireRoles('admin', 'super_admin'),
  validate(addCourseToCurriculumSchema),
  curriculumController.addCourse
)

/**
 * @swagger
 * /api/v1/curriculums/{id}/courses/batch:
 *   post:
 *     summary: 批量添加课程到培养方案
 *     tags: [Curriculums]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/courses/batch',
  requireRoles('admin', 'super_admin'),
  validate(batchAddCoursesSchema),
  curriculumController.batchAddCourses
)

/**
 * @swagger
 * /api/v1/curriculums/{id}/courses/{course_id}:
 *   delete:
 *     summary: 从培养方案移除课程
 *     tags: [Curriculums]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id/courses/:course_id',
  requireRoles('admin', 'super_admin'),
  curriculumController.removeCourse
)

/**
 * @swagger
 * /api/v1/curriculums/{id}/courses/{course_id}:
 *   put:
 *     summary: 更新培养方案中的课程
 *     tags: [Curriculums]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id/courses/:course_id',
  requireRoles('admin', 'super_admin'),
  validate(updateCurriculumCourseSchema),
  curriculumController.updateCourse
)

export default router
