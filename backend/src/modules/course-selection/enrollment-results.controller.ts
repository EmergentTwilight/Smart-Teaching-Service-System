import { Request, Response } from 'express'
import { error, success } from '../../shared/utils/response.js'
import { enrollmentResultsService } from './enrollment-results.service.js'
import { enrollmentQuerySchema } from './course-selection.schemas.js'

/**
 * C4：GET /enrollments/me — 学生选课结果（FR-C-24~FR-C-26, FR-C-29）。
 */
export const enrollmentResultsController = {
  async listMyEnrollments(req: Request, res: Response) {
    const query = enrollmentQuerySchema.parse(req.query)
    const studentId = req.user?.userId

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await enrollmentResultsService.listMyEnrollments(studentId, query)
    return success(res, result)
  },
}
