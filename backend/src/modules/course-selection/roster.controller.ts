import { Request, Response } from 'express'
import { error, success } from '../../shared/utils/response.js'
import { rosterService } from './roster.service.js'
import { buildContentDispositionAttachment } from './roster-export.util.js'
import {
  rosterExportQuerySchema,
  rosterOfferingParamsSchema,
  rosterQuerySchema,
} from './course-selection.schemas.js'

/**
 * C4：教师名单查询与 Excel 导出（FR-C-27, FR-C-28, NFR-C-06）。
 * 仅允许任课教师访问本人 courseOfferingId。
 */
export const rosterController = {
  async getOfferingRoster(req: Request, res: Response) {
    const user = req.user
    const { id } = rosterOfferingParamsSchema.parse(req.params)
    const query = rosterQuerySchema.parse(req.query)

    if (!user?.userId) {
      return error(res, '未认证', 401)
    }

    const result = await rosterService.getOfferingRoster(user.userId, id, query)
    return success(res, result)
  },

  async exportOfferingRoster(req: Request, res: Response) {
    const user = req.user
    const { id } = rosterOfferingParamsSchema.parse(req.params)
    const query = rosterExportQuerySchema.parse(req.query)

    if (!user?.userId) {
      return error(res, '未认证', 401)
    }

    const result = await rosterService.exportOfferingRoster(user.userId, id, query)
    res.setHeader('Content-Type', result.contentType)
    res.setHeader('Content-Disposition', buildContentDispositionAttachment(result.fileName))
    return res.status(200).send(result.content)
  },
}
