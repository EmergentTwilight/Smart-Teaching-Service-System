import { Router, type Router as RouterType } from 'express'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import { scoreQueryController } from './score-query.controller.js'
import { myScoresQuerySchema, studentIdParamsSchema } from './score-query.types.js'

const router: RouterType = Router()

router.use(authMiddleware)

router.get(
  '/students/me/scores',
  requireRoles('student'),
  validate(myScoresQuerySchema, 'query'),
  scoreQueryController.getMyScores
)

router.get(
  '/students/me/score-summary',
  requireRoles('student'),
  scoreQueryController.getMyScoreSummary
)

router.get(
  '/students/:studentId/score-summary',
  requireRoles('student', 'admin', 'super_admin'),
  validate(studentIdParamsSchema, 'params'),
  scoreQueryController.getStudentScoreSummary
)

export default router
