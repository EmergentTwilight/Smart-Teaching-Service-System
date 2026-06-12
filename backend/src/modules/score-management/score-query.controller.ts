import { Request, Response } from 'express'
import { error, paginated, success } from '../../shared/utils/response.js'
import { scoreQueryService } from './score-query.service.js'
import type { MyScoresQuery } from './score-query.types.js'

export const scoreQueryController = {
  async getMyScores(req: Request, res: Response) {
    const user = req.user
    if (!user) {
      return error(res, '未认证', 401)
    }

    const result = await scoreQueryService.getMyScores(user, req.query as unknown as MyScoresQuery)
    paginated(res, result.items, result.pagination)
  },

  async getMyScoreSummary(req: Request, res: Response) {
    const user = req.user
    if (!user) {
      return error(res, '未认证', 401)
    }

    const result = await scoreQueryService.getStudentScoreSummary(user)
    success(res, result)
  },

  async getStudentScoreSummary(req: Request, res: Response) {
    const user = req.user
    if (!user) {
      return error(res, '未认证', 401)
    }

    const result = await scoreQueryService.getStudentScoreSummary(
      user,
      req.params.studentId as string
    )
    success(res, result)
  },
}
