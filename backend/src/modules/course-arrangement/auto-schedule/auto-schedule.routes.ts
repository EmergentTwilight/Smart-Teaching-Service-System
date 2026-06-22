import { Router } from 'express'
import { authMiddleware, requireRoles } from '../../../shared/middleware/auth.js'
import {
  createAutoTask,
  getTaskStatus,
  getTaskPreview,
  applyTask,
} from './auto-schedule.controller.js'

const router: Router = Router()

// 所有自动排课接口需登录鉴权
router.use(authMiddleware)

router.post('/tasks', requireRoles('admin', 'super_admin'), createAutoTask)
router.get('/tasks/:taskId', getTaskStatus)
router.get('/tasks/:taskId/preview', getTaskPreview)
router.post('/tasks/:taskId/apply', requireRoles('admin', 'super_admin'), applyTask)

export default router
