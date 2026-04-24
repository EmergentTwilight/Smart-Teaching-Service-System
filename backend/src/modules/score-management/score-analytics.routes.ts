import { Router, type Router as RouterType } from 'express'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import { scoreAnalyticsController } from './score-analytics.controller.js'
import { courseOfferingIdParamsSchema, studentIdParamsSchema } from './score-analytics.types.js'

const router: RouterType = Router()

router.use(authMiddleware)

router.get(
  '/course-offerings/:courseOfferingId/score-analytics',
  requireRoles('teacher', 'admin', 'super_admin'),
  validate(courseOfferingIdParamsSchema, 'params'),
  scoreAnalyticsController.getCourseScoreAnalytics
)

router.get(
  '/students/:studentId/score-analytics',
  requireRoles('student', 'admin', 'super_admin'),
  validate(studentIdParamsSchema, 'params'),
  scoreAnalyticsController.getStudentScoreAnalytics
)

export default router
