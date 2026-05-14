import { Request, Response } from 'express'
import { success } from '../../shared/utils/response.js'
import { courseSearchService } from './course-search.service.js'
import {
  availableOfferingsQuerySchema,
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
    return success(res, result)
  },

  async listOfferings(req: Request, res: Response) {
    const query = courseSearchQuerySchema.parse(req.query)
    const result = await courseSearchService.listOfferings(query)
    return success(res, result)
  },

  async listAvailableOfferings(req: Request, res: Response) {
    const query = availableOfferingsQuerySchema.parse(req.query)
    const studentId = req.user?.userId

    if (!studentId) {
      return res.status(401).json({ code: 401, message: '未认证' })
    }

    const result = await courseSearchService.listAvailableOfferings(studentId, query)
    return success(res, result)
  },

  async getOfferingDetail(req: Request, res: Response) {
    const { id } = courseOfferingParamsSchema.parse(req.params)
    const studentId = req.user?.userId

    if (!studentId) {
      return res.status(401).json({ code: 401, message: '未认证' })
    }

    const result = await courseSearchService.getOfferingDetail(id, studentId)
    return success(res, result)
  },
}
