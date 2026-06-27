import { Request, Response } from 'express'
import { error, success } from '../../shared/utils/response.js'
import { aiAdvisorService } from './ai-advisor.service.js'
import {
  aiExplainBodySchema,
  aiRecommendBodySchema,
  aiSavedRecordParamsSchema,
  aiSavedRecordQuerySchema,
  aiSaveRecordBodySchema,
} from './course-selection.schemas.js'

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

  async saveRecord(req: Request, res: Response) {
    const studentId = req.user?.userId
    const body = aiSaveRecordBodySchema.parse(req.body)

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await aiAdvisorService.saveRecord(studentId, body)
    return success(res, result, 'AI 建议已保存', 201)
  },

  async listSavedRecords(req: Request, res: Response) {
    const studentId = req.user?.userId
    const query = aiSavedRecordQuerySchema.parse(req.query)

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await aiAdvisorService.listSavedRecords(studentId, query)
    return success(res, result)
  },

  async getSavedRecord(req: Request, res: Response) {
    const studentId = req.user?.userId
    const { id } = aiSavedRecordParamsSchema.parse(req.params)

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await aiAdvisorService.getSavedRecord(studentId, id)
    return success(res, result)
  },

  async deleteSavedRecord(req: Request, res: Response) {
    const studentId = req.user?.userId
    const { id } = aiSavedRecordParamsSchema.parse(req.params)

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await aiAdvisorService.deleteSavedRecord(studentId, id)
    return success(res, result, 'AI 建议已删除')
  },
}
