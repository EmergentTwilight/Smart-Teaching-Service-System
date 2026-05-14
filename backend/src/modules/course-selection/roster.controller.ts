import { Request, Response } from 'express'
import { error, success } from '../../shared/utils/response.js'
import { rosterService } from './roster.service.js'
import { rosterOfferingParamsSchema, rosterQuerySchema } from './course-selection.schemas.js'

/**
 * 老师名单控制器
 */
export const rosterController = {
  async getOfferingRoster(req: Request, res: Response) {
    const user = req.user
    const { id } = rosterOfferingParamsSchema.parse(req.params)
    const query = rosterQuerySchema.parse(req.query)

    if (!user?.userId) {
      return error(res, '未认证', 401)
    }

    const result = await rosterService.getOfferingRoster(user.userId, user.roles || [], id, query)
    return success(res, result)
  },

  async exportOfferingRoster(req: Request, res: Response) {
    const user = req.user
    const { id } = rosterOfferingParamsSchema.parse(req.params)

    if (!user?.userId) {
      return error(res, '未认证', 401)
    }

    const result = await rosterService.exportOfferingRoster(user.userId, user.roles || [], id)
    return success(res, result)
  },
}
