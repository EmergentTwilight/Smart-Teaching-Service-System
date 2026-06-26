import { Request, Response } from 'express'
import { error, success } from '../../shared/utils/response.js'
import { admissionService } from './admission.service.js'
import type { AdmissionEnterBody, AdmissionLeaseBody } from './course-selection.types.js'

export const admissionController = {
  async enter(req: Request, res: Response) {
    const studentId = req.user?.userId
    const body = req.body as AdmissionEnterBody

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await admissionService.enter(studentId, body)
    return success(res, result, '选课准入成功')
  },

  async heartbeat(req: Request, res: Response) {
    const studentId = req.user?.userId
    const body = req.body as AdmissionLeaseBody

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await admissionService.heartbeat(studentId, body)
    return success(res, result, '选课准入已刷新')
  },

  async leave(req: Request, res: Response) {
    const studentId = req.user?.userId
    const body = req.body as AdmissionLeaseBody

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await admissionService.leave(studentId, body)
    return success(res, result, '选课准入已释放')
  },
}
