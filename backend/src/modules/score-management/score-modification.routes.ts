import { Router, type Router as RouterType } from 'express'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import {
  approveModificationRequestSchema,
  createScoreModificationRequestSchema,
  getPendingModificationRequestsQuerySchema,
  getScoreModificationLogsQuerySchema,
  rejectModificationRequestSchema,
  scoreIdParamSchema,
} from './score-modification.schemas.js'
import { scoreModificationController } from './score-modification.controller.js'

const router: RouterType = Router()

/**
 * Routes: 路由层，负责接口定义和中间件组合，根据传入的参数调用 controller。
 */

// 统一先认证，再做角色鉴权和参数校验，避免无效请求进入业务层。
router.use(authMiddleware)

// 教师/管理员发起修改申请：POST /api/v1/scores/:scoreId/modification-request
router.post(
  '/:scoreId/modification-request',
  // 发起申请允许教师与管理员，具体是否“本人可操作”由 service 做资源级校验。
  requireRoles('teacher', 'admin', 'super_admin'),
  validate(scoreIdParamSchema, 'params'),
  validate(createScoreModificationRequestSchema, 'body'),
  scoreModificationController.createRequest
)

// 获取待处理申请列表：GET /api/v1/scores/modification-requests
router.get(
  '/modification-requests',
  requireRoles('admin', 'super_admin'), // 角色限制，这里表示管理员才能查看待审批的改分申请
  validate(getPendingModificationRequestsQuerySchema, 'query'), // 参数校验
  scoreModificationController.getPendingRequests // 调用 controller 层工具
)

// 审批通过：POST /api/v1/scores/:scoreId/modification-request/approve
router.post(
  '/:scoreId/modification-request/approve',
  requireRoles('admin', 'super_admin'),
  validate(scoreIdParamSchema, 'params'),
  validate(approveModificationRequestSchema, 'body'),
  scoreModificationController.approveRequest
)

// 审批驳回：POST /api/v1/scores/:scoreId/modification-request/reject
router.post(
  '/:scoreId/modification-request/reject',
  requireRoles('admin', 'super_admin'),
  validate(scoreIdParamSchema, 'params'),
  validate(rejectModificationRequestSchema, 'body'),
  scoreModificationController.rejectRequest
)

// 查看修改日志：GET /api/v1/scores/:scoreId/modification-logs
router.get(
  '/:scoreId/modification-logs',
  // 日志查询允许 student/teacher/admin 进入，再由 service 校验是否“本人相关”。
  requireRoles('student', 'teacher', 'admin', 'super_admin'),
  validate(scoreIdParamSchema, 'params'),
  validate(getScoreModificationLogsQuerySchema, 'query'),
  scoreModificationController.getModificationLogs
)

export default router
