import { Request, Response } from 'express'
import { success } from '../../shared/utils/response.js'
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
    return success(res, result)
  },

  async getMyCurriculumProgress(req: Request, res: Response) {
    const query = curriculumProgressQuerySchema.parse(req.query)
    const studentId = req.user?.userId

    if (!studentId) {
      return res.status(401).json({ code: 401, message: '未认证' })
    }

    const result = await curriculumService.getMyCurriculumProgress(studentId, query)
    return success(res, result)
  },
}
