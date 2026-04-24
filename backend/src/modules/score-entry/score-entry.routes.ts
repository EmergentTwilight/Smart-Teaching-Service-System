/**
 * F1 成绩录入路由
 * 挂载在 /api/v1/course-offerings/:courseOfferingId 下
 */
import { Router, type Router as RouterType } from 'express'
import { scoreEntryController } from './score-entry.controller.js'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import {
  courseOfferingParamsSchema,
  getScoreListQuerySchema,
  saveDraftBodySchema,
  submitScoresBodySchema,
} from './score-entry.types.js'

const router: RouterType = Router({ mergeParams: true })

// 所有路由需要认证
router.use(authMiddleware)

/**
 * @swagger
 * /api/v1/course-offerings/{courseOfferingId}/scores:
 *   get:
 *     summary: 获取成绩录入列表
 *     tags: [ScoreEntry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseOfferingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: studentNumber
 *         schema:
 *           type: string
 *       - in: query
 *         name: studentName
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, EMPTY]
 */
router.get(
  '/',
  validate(courseOfferingParamsSchema, 'params'),
  validate(getScoreListQuerySchema, 'query'),
  requireRoles('teacher', 'admin', 'super_admin'),
  scoreEntryController.getScoreList
)

/**
 * @swagger
 * /api/v1/course-offerings/{courseOfferingId}/scores/draft:
 *   put:
 *     summary: 批量保存成绩草稿
 *     tags: [ScoreEntry]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/draft',
  validate(courseOfferingParamsSchema, 'params'),
  validate(saveDraftBodySchema, 'body'),
  requireRoles('teacher', 'admin', 'super_admin'),
  scoreEntryController.saveDraft
)

/**
 * @swagger
 * /api/v1/course-offerings/{courseOfferingId}/scores/submit:
 *   post:
 *     summary: 批量提交成绩
 *     tags: [ScoreEntry]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/submit',
  validate(courseOfferingParamsSchema, 'params'),
  validate(submitScoresBodySchema, 'body'),
  requireRoles('teacher', 'admin', 'super_admin'),
  scoreEntryController.submitScores
)

export default router
