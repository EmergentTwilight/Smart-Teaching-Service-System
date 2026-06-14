import { Request, Response } from 'express'
import { error, paginated, success } from '../../shared/utils/response.js'
import { scoreQueryService } from './score-query.service.js'
import type { MyScoresQuery } from './score-query.types.js'

const toPaginationMeta = (pagination: {
  page: number
  pageSize: number
  total: number
  totalPages: number
}) => ({
  page: pagination.page,
  page_size: pagination.pageSize,
  total: pagination.total,
  total_pages: pagination.totalPages,
})

export const scoreQueryController = {
  async getMyScores(req: Request, res: Response) {
    const user = req.user
    if (!user) {
      return error(res, '未认证', 401)
    }

    const result = await scoreQueryService.getMyScores(user, req.query as unknown as MyScoresQuery)
    paginated(res, result.items, toPaginationMeta(result.pagination))
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
