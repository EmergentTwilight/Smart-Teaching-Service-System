import { Request, Response } from 'express'
import { error, success } from '../../shared/utils/response.js'
import { curriculumService } from './curriculum.service.js'
import {
  curriculumQuerySchema,
  curriculumProgressQuerySchema,
  type CurriculumConfirmationBody,
} from './course-selection.schemas.js'

/**
 * 培养方案控制器
 * 提供当前学生培养方案与学分进展
 */
export const curriculumController = {
  async getMyCurriculum(req: Request, res: Response) {
    const query = curriculumQuerySchema.parse(req.query)
    const studentId = req.user?.userId

    if (!studentId) {
      return res.status(401).json({ code: 401, message: '未认证' })
    }

    const result = await curriculumService.getMyCurriculum(studentId, query)
    if (typeof result === 'string') {
      return error(res, result , 422)
    }

    return success(res, result)
  },

  async confirmMyCurriculum(req: Request, res: Response) {
    const body = req.body as CurriculumConfirmationBody
    const studentId = req.user?.userId

    if (!studentId) {
      return res.status(401).json({ code: 401, message: '未认证' })
    }

    const result = await curriculumService.confirmMyCurriculum(studentId, body)
    if (typeof result === 'string') {
      return error(res, result, 422)
    }

    return success(res, result, '培养方案确认成功')
  },

  async getMyCurriculumProgress(req: Request, res: Response) {
    const query = curriculumProgressQuerySchema.parse(req.query)
    const studentId = req.user?.userId

    if (!studentId) {
      return res.status(401).json({ code: 401, message: '未认证' })
    }

    const result = await curriculumService.getMyCurriculumProgress(studentId, query)
    if (typeof result === 'string') {
      return error(res, result , 422)
    }

    return success(res, result)
  },
}
