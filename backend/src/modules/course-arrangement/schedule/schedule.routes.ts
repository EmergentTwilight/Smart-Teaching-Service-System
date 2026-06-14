import { Router } from 'express'
import { authMiddleware } from '../../../shared/middleware/auth.js'
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
router.post('/', createSchedule)
router.post('/validate', validateSchedule) // 6.2.3 预校验
router.get('/:id', getScheduleById)
router.patch('/:id', updateSchedule)
router.delete('/:id', deleteSchedule)

export default router
