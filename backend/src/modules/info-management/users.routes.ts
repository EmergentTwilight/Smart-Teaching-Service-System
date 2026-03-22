import { Router } from 'express'
import { usersController } from './users.controller.js'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import { getUsersQuerySchema, createUserSchema, updateUserSchema, getLogsQuerySchema } from './users.types.js'

const router = Router()

// 所有路由需要认证
router.use(authMiddleware)

// 系统日志查询 - 仅管理员可访问 (必须在 /:id 之前)
router.get(
  '/logs',
  validate(getLogsQuerySchema, 'query'),
  requireRoles('admin', 'super_admin'),
  usersController.getLogs
)

router.get(
  '/',
  validate(getUsersQuerySchema, 'query'),
  requireRoles('admin', 'super_admin'),
  usersController.list
)

router.get('/:id', usersController.getById)

router.post(
  '/',
  validate(createUserSchema, 'body'),
  requireRoles('admin', 'super_admin'),
  usersController.create
)

router.put(
  '/:id',
  validate(updateUserSchema, 'body'),
  usersController.update
)

router.delete(
  '/:id',
  requireRoles('super_admin'),
  usersController.delete
)

export default router
