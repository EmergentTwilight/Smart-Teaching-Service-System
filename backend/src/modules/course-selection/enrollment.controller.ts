import { Request, Response } from 'express'
import { error, paginated, success } from '../../shared/utils/response.js'
import { enrollmentService } from './enrollment.service.js'
import {
  createEnrollmentBodySchema,
  dropEnrollmentBodySchema,
  dropEnrollmentParamsSchema,
  enrollmentQuerySchema,
} from './course-selection.schemas.js'

const todoResponse = (res: Response, todo: string) =>
  error(res, '功能待实现：C 组需补充完整实现', 501, { todo })

/**
 * 选课与退选控制器
 */
export const enrollmentController = {
  async listMyEnrollments(req: Request, res: Response) {
    const query = enrollmentQuerySchema.parse(req.query)
    const studentId = req.user?.userId

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await enrollmentService.listMyEnrollments(studentId, query)
    return paginated(res, result.items, result.pagination)
  },

  async createEnrollment(req: Request, res: Response) {
    const studentId = req.user?.userId
    const body = createEnrollmentBodySchema.parse(req.body)

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await enrollmentService.createEnrollment(studentId, body)
    if (!result) {
      return todoResponse(res, 'C3, FR-C-16, NFR-C-04: 选课事务未实现')
    }

    return success(res, result, '选课请求已受理', 201)
  },

  async dropEnrollment(req: Request, res: Response) {
    const studentId = req.user?.userId
    const { id } = dropEnrollmentParamsSchema.parse(req.params)
    const body = dropEnrollmentBodySchema.parse(req.body)

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await enrollmentService.dropEnrollment(studentId, id, body)
    if (!result) {
      return todoResponse(res, 'C3, FR-C-21, NFR-C-04: 退选事务未实现')
    }

    return success(res, result, '退选请求已受理')
  },
}
