import { Request, Response } from 'express'
import { error, success } from '../../shared/utils/response.js'
import { enrollmentService } from './enrollment.service.js'
import type { CreateEnrollmentBody, DropEnrollmentBody } from './course-selection.types.js'

/**
 * 选课与退选控制器
 */
export const enrollmentController = {
  async createEnrollment(req: Request, res: Response) {
    const studentId = req.user?.userId
    const { courseOfferingId, clientRequestId } = req.body as CreateEnrollmentBody

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await enrollmentService.createEnrollment(studentId, {
      courseOfferingId,
      clientRequestId,
    })
    return success(res, result, '选课成功', 201)
  },

  async dropEnrollment(req: Request, res: Response) {
    const studentId = req.user?.userId
    const { id } = req.params as { id: string }
    const { reason, clientRequestId } = req.body as DropEnrollmentBody

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await enrollmentService.dropEnrollment(studentId, id, {
      reason,
      clientRequestId,
    })
    return success(res, result, '退选成功')
  },
}
