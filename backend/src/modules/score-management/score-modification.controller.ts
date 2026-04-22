import { Request, Response } from 'express'
import { AppError } from '../../shared/errors/AppError.js'
import { error, paginated, success } from '../../shared/utils/response.js'
import { scoreModificationService } from './score-modification.service.js'
import type {
  ApproveModificationRequestInput,
  CreateScoreModificationRequestInput,
  GetPendingModificationRequestsQuery,
  GetScoreModificationLogsQuery,
  RejectModificationRequestInput,
} from './score-modification.types.js'

/**
 * Controller: 做参数编排和响应格式统一
 * 负责从 Route 传入的信息中传入提取参数
 * 调用 Service 层的函数，并根据返回值提供统一格式的响应
 */

// 所有 error 的统一处理，区分正常业务和非预期错误，避免重复代码。
const handleControllerError = (res: Response, err: unknown, fallbackMessage: string) => {
  if (err instanceof AppError) {
    return error(res, err.message, err.statusCode)
  }

  const message = err instanceof Error ? err.message : fallbackMessage // #Todo: fallbackMessage 应该是个常量，或者直接写成 '操作失败' 之类的
  return error(res, message, 400)
}

// 统一对外接口，功能上区分于 Service 层
// 只基于参数和调用结果来判断响应内容和状态码，仅对 userId 检查来做基本兜底
export const scoreModificationController = {
  // 教师/管理员发起修改申请：POST /api/v1/scores/:scoreId/modification-request
  async createRequest(req: Request, res: Response) {
    try {
      const scoreId = req.params.scoreId as string
      const userId = req.user?.userId
      const roles = req.user?.roles ?? []
      if (!userId) {
        return error(res, '未认证', 401)
      }

      const input = req.body as CreateScoreModificationRequestInput
      const result = await scoreModificationService.createModificationRequest(
        scoreId,
        userId,
        roles,
        input
      )
      return success(res, result, '修改申请提交成功', 201)
    } catch (err) {
      return handleControllerError(res, err, '提交修改申请失败')
    }
  },
  // 管理员获取待审批申请列表：GET /api/v1/scores/modification-requests
  async getPendingRequests(req: Request, res: Response) {
    try {
      const query = req.query as unknown as GetPendingModificationRequestsQuery
      const result = await scoreModificationService.getPendingModificationRequests(query)
      return paginated(res, result.items, result.pagination)
    } catch (err) {
      return handleControllerError(res, err, '获取待处理申请失败')
    }
  },
  // 管理员审批通过：POST /api/v1/scores/:scoreId/modification-request/approve
  async approveRequest(req: Request, res: Response) {
    try {
      const scoreId = req.params.scoreId as string
      const userId = req.user?.userId
      if (!userId) {
        return error(res, '未认证', 401)
      }

      const input = req.body as ApproveModificationRequestInput
      const result = await scoreModificationService.approveModificationRequest(
        scoreId,
        userId,
        input
      )
      return success(res, result, '审批通过')
    } catch (err) {
      return handleControllerError(res, err, '审批通过失败')
    }
  },
  // 管理员审批驳回：POST /api/v1/scores/:scoreId/modification-request/reject
  async rejectRequest(req: Request, res: Response) {
    try {
      const scoreId = req.params.scoreId as string
      const userId = req.user?.userId
      if (!userId) {
        return error(res, '未认证', 401)
      }

      const input = req.body as RejectModificationRequestInput
      const result = await scoreModificationService.rejectModificationRequest(
        scoreId,
        userId,
        input
      )
      return success(res, result, '审批驳回成功')
    } catch (err) {
      return handleControllerError(res, err, '审批驳回失败')
    }
  },
  // 查看修改日志：GET /api/v1/scores/:scoreId/modification-logs
  async getModificationLogs(req: Request, res: Response) {
    try {
      const scoreId = req.params.scoreId as string
      const userId = req.user?.userId
      const roles = req.user?.roles ?? []
      if (!userId) {
        return error(res, '未认证', 401)
      }

      const query = req.query as unknown as GetScoreModificationLogsQuery
      const result = await scoreModificationService.getScoreModificationLogs(
        scoreId,
        userId,
        roles,
        query
      )
      return paginated(res, result.items, result.pagination)
    } catch (err) {
      return handleControllerError(res, err, '获取修改日志失败')
    }
  },
}
