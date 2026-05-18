import { Request, Response } from 'express'
import { error, success } from '../../shared/utils/response.js'
import { courseSearchService } from './course-search.service.js'
import {
  availableOfferingsQuerySchema,
  courseOfferingDetailQuerySchema,
  courseOfferingParamsSchema,
  courseSearchQuerySchema,
} from './course-selection.schemas.js'

/**
 * 课程搜索与课程详情控制器
 */
export const courseSearchController = {
  async searchCourses(req: Request, res: Response) {
    const query = courseSearchQuerySchema.parse(req.query)
    const result = await courseSearchService.searchCourses(query)
    if (!result) {
      return error(res, '功能待实现：C2 FR-C-08 FR-C-09 FR-C-10 FR-C-12 NFR-C-13', 501)
    }

    return success(res, result)
  },

  async listOfferings(req: Request, res: Response) {
    const query = courseSearchQuerySchema.parse(req.query)
    const result = await courseSearchService.listOfferings(query)
    if (!result) {
      return error(res, '功能待实现：C2 FR-C-08 FR-C-12 FR-C-15', 501)
    }

    return success(res, result)
  },

  async listAvailableOfferings(req: Request, res: Response) {
    const query = availableOfferingsQuerySchema.parse(req.query)
    const studentId = req.user?.userId

    if (!studentId) {
      return res.status(401).json({ code: 401, message: '未认证' })
    }

    const result = await courseSearchService.listAvailableOfferings(studentId, query)
    if (!result) {
      return error(res, '功能待实现：C2 FR-C-13 FR-C-15 NFR-C-07 NFR-C-08', 501)
    }

    return success(res, result)
  },

  async getOfferingDetail(req: Request, res: Response) {
    const { id } = courseOfferingParamsSchema.parse(req.params)
    const query = courseOfferingDetailQuerySchema.parse(req.query)
    const requesterUserId = req.user?.userId

    if (!requesterUserId) {
      return res.status(401).json({ code: 401, message: '未认证' })
    }

    const result = await courseSearchService.getOfferingDetail(id, requesterUserId, query.includeEligibility)
    if (!result) {
      return error(res, '功能待实现：C2 FR-C-11 FR-C-18 FR-C-19 NFR-C-07', 501)
    }

    return success(res, result)
  },
}
