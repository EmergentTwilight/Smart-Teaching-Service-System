import { Router } from 'express'
import { authMiddleware, requireRoles } from '../../../shared/middleware/auth.js'
import {
  createSchedule,
  validateSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
} from './schedule.controller.js'

const router: Router = Router()

// 所有排课管理接口需登录鉴权
router.use(authMiddleware)

router.get('/', getSchedules)
router.post('/', requireRoles('admin', 'super_admin'), createSchedule)
router.post('/validate', requireRoles('admin', 'super_admin'), validateSchedule) // 6.2.3 预校验
router.get('/:id', getScheduleById)
router.patch('/:id', requireRoles('admin', 'super_admin'), updateSchedule)
router.delete('/:id', requireRoles('admin', 'super_admin'), deleteSchedule)

export default router
