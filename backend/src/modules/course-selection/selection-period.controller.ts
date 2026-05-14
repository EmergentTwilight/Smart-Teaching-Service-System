import { Request, Response } from 'express'
import { error, paginated, success } from '../../shared/utils/response.js'
import { selectionPeriodService } from './selection-period.service.js'
import {
  selectionPeriodQuerySchema,
  createSelectionPeriodBodySchema,
  updateSelectionPeriodBodySchema,
  selectionPeriodParamsSchema,
  manualEnrollmentBodySchema,
} from './course-selection.schemas.js'

export const selectionPeriodController = {
  async listPeriods(req: Request, res: Response) {
    const query = selectionPeriodQuerySchema.parse(req.query)
    const result = await selectionPeriodService.listPeriods(query)
    return paginated(res, result.items, result.pagination)
  },

  async createPeriod(req: Request, res: Response) {
    const body = createSelectionPeriodBodySchema.parse(req.body)
    const currentUser = req.user

    if (!currentUser?.userId) {
      return error(res, '未认证', 401)
    }

    const result = await selectionPeriodService.createPeriod(currentUser.userId, body)
    if (!result) {
      return error(res, '功能待实现：C5 FR-C-30~FR-C-32 NFR-C-14', 501)
    }
    return success(res, result, '选课阶段创建成功', 201)
  },

  async updatePeriod(req: Request, res: Response) {
    const { id } = selectionPeriodParamsSchema.parse(req.params)
    const body = updateSelectionPeriodBodySchema.parse(req.body)
    const currentUser = req.user

    if (!currentUser?.userId) {
      return error(res, '未认证', 401)
    }

    const result = await selectionPeriodService.updatePeriod(currentUser.userId, id, body)
    if (!result) {
      return error(res, '功能待实现：C5 FR-C-30~FR-C-32, NFR-C-01', 501)
    }

    return success(res, result, '选课阶段更新成功')
  },

  async manualEnroll(req: Request, res: Response) {
    const currentUser = req.user
    const body = manualEnrollmentBodySchema.parse(req.body)

    if (!currentUser?.userId) {
      return error(res, '未认证', 401)
    }

    const result = await selectionPeriodService.manualEnroll(currentUser.userId, body)
    if (!result) {
      return error(res, '功能待实现：C5 FR-C-33 FR-C-34 NFR-C-12', 501)
    }

    return success(res, result, '手动加课请求已受理', 201)
  },
}
