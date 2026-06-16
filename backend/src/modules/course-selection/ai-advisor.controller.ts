import { Request, Response } from 'express'
import { error, success } from '../../shared/utils/response.js'
import { aiAdvisorService } from './ai-advisor.service.js'
import { aiRecommendBodySchema, aiExplainBodySchema } from './course-selection.schemas.js'

export const aiAdvisorController = {
  async recommend(req: Request, res: Response) {
    const studentId = req.user?.userId
    const body = aiRecommendBodySchema.parse(req.body)

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await aiAdvisorService.recommend(studentId, body)
    if (!result) {
      return error(res, '功能待实现：C6 FR-C-38~FR-C-43 NFR-C-09~NFR-C-11', 501)
    }

    return success(res, result)
  },

  async explain(req: Request, res: Response) {
    const studentId = req.user?.userId
    const body = aiExplainBodySchema.parse(req.body)

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await aiAdvisorService.explain(studentId, body.offeringId, body.question)
    if (!result) {
      return error(res, '功能待实现：C6 FR-C-38~FR-C-43 NFR-C-09~NFR-C-11', 501)
    }

    return success(res, result)
  },
}
