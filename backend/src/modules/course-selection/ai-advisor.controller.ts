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
    return success(res, result)
  },

  async explain(req: Request, res: Response) {
    const studentId = req.user?.userId
    const body = aiExplainBodySchema.parse(req.body)

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await aiAdvisorService.explain(studentId, body.offeringId, body.question)
    return success(res, result)
  },
}
