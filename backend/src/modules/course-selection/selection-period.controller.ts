/**
 * C5：选课阶段 CRUD 与教务手动加课（FR-C-30~FR-C-37）。
 * 路由层使用 admin 角色；服务层校验 ACADEMIC 教务类型。
 */
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
    return success(res, result, '选课阶段更新成功')
  },

  async manualEnroll(req: Request, res: Response) {
    const currentUser = req.user
    const body = manualEnrollmentBodySchema.parse(req.body)

    if (!currentUser?.userId) {
      return error(res, '未认证', 401)
    }

    const result = await selectionPeriodService.manualEnroll(currentUser.userId, body)
    return success(res, result, '手动加课成功', 201)
  },
}
