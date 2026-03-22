import { Router } from 'express'
import { coursesController } from './courses.controller.js'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import { getCoursesQuerySchema, createCourseSchema, updateCourseSchema } from './courses.types.js'

const router = Router()

// 所有路由需要认证
router.use(authMiddleware)

// 获取课程列表 - 管理员和教师可访问
router.get(
  '/',
  validate(getCoursesQuerySchema, 'query'),
  requireRoles('admin', 'super_admin', 'teacher'),
  coursesController.list
)

// 获取课程详情 - 所有认证用户可访问
router.get('/:id', coursesController.getById)

// 创建课程 - 仅管理员可访问
router.post(
  '/',
  validate(createCourseSchema, 'body'),
  requireRoles('admin', 'super_admin'),
  coursesController.create
)

// 更新课程 - 仅管理员可访问
router.put(
  '/:id',
  validate(updateCourseSchema, 'body'),
  requireRoles('admin', 'super_admin'),
  coursesController.update
)

// 删除课程 - 仅超级管理员可访问
router.delete(
  '/:id',
  requireRoles('super_admin'),
  coursesController.delete
)

export default router
