import { Request, Response } from 'express'
import { error, success } from '../../shared/utils/response.js'
import { curriculumService } from './curriculum.service.js'
import {
  curriculumQuerySchema,
  curriculumProgressQuerySchema,
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
    if (!result) {
      return error(res, '功能待实现：C1 FR-C-01~FR-C-06 NFR-C-13', 501)
    }

    return success(res, result)
  },

  async getMyCurriculumProgress(req: Request, res: Response) {
    const query = curriculumProgressQuerySchema.parse(req.query)
    const studentId = req.user?.userId

    if (!studentId) {
      return res.status(401).json({ code: 401, message: '未认证' })
    }

    const result = await curriculumService.getMyCurriculumProgress(studentId, query)
    if (!result) {
      return error(res, '功能待实现：C1 FR-C-05 NFR-C-07 NFR-C-12', 501)
    }

    return success(res, result)
  },
}
