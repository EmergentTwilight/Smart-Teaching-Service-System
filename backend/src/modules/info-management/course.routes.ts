/**
 * 课程路由
 */

import { Router, type Router as RouterType } from 'express'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import { courseController } from './course.controller.js'
import {
  getCoursesListSchema,
  courseIdSchema,
  createCourseSchema,
  updateCourseSchema,
  batchCreateCoursesSchema,
} from './course.types.js'

const router: RouterType = Router()

// 所有路由需要认证
router.use(authMiddleware)

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: 获取课程列表
 */
router.get('/', validate(getCoursesListSchema, 'query'), courseController.list)

/**
 * @swagger
 * /api/v1/courses/{course_id}:
 *   get:
 *     summary: 获取课程详情
 */
router.get('/:course_id', validate(courseIdSchema, 'params'), courseController.detail)

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: 创建课程
 */
router.post(
  '/',
  requireRoles('admin', 'super_admin'),
  validate(createCourseSchema),
  courseController.create
)

/**
 * @swagger
 * /api/v1/courses/{course_id}:
 *   put:
 *     summary: 更新课程
 */
router.put(
  '/:course_id',
  requireRoles('admin', 'super_admin'),
  validate(courseIdSchema, 'params'),
  validate(updateCourseSchema),
  courseController.update
)

/**
 * @swagger
 * /api/v1/courses/{course_id}:
 *   delete:
 *     summary: 删除课程
 */
router.delete(
  '/:course_id',
  requireRoles('super_admin'),
  validate(courseIdSchema, 'params'),
  courseController.delete
)

/**
 * @swagger
 * /api/v1/courses/batch:
 *   post:
 *     summary: 批量创建课程
 */
router.post(
  '/batch',
  requireRoles('admin', 'super_admin'),
  validate(batchCreateCoursesSchema),
  courseController.batchCreate
)

export default router
