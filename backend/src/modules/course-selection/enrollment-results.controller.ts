import { Request, Response } from 'express'
import { error, success } from '../../shared/utils/response.js'
import { enrollmentResultsService } from './enrollment-results.service.js'
import { enrollmentQuerySchema } from './course-selection.schemas.js'

const todoResponse = (res: Response, todo: string) =>
  error(res, '功能待实现：C 组需补充完整实现', 501, { todo })

/**
 * C4: 学生选课结果查询控制器
 */
export const enrollmentResultsController = {
  async listMyEnrollments(req: Request, res: Response) {
    const query = enrollmentQuerySchema.parse(req.query)
    const studentId = req.user?.userId

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await enrollmentResultsService.listMyEnrollments(studentId, query)
    if (!result) {
      return todoResponse(res, 'C4, FR-C-24, FR-C-26, FR-C-29: 本人选课记录查询未实现')
    }

    return success(res, result)
  },
}
