import { Router } from 'express'
import {
  createAutoTask,
  getTaskStatus,
  getTaskPreview,
  applyTask,
} from './auto-schedule.controller.js'

const router: Router = Router()

router.post('/tasks', createAutoTask)
router.get('/tasks/:taskId', getTaskStatus)
router.get('/tasks/:taskId/preview', getTaskPreview)
router.post('/tasks/:taskId/apply', applyTask)

export default router
