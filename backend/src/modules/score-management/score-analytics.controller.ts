import { Request, Response } from 'express'
import { error, success } from '../../shared/utils/response.js'
import { scoreAnalyticsService } from './score-analytics.service.js'

export const scoreAnalyticsController = {
  async getCourseScoreAnalytics(req: Request, res: Response) {
    const user = req.user
    if (!user) {
      return error(res, '未认证', 401)
    }

    const result = await scoreAnalyticsService.getCourseScoreAnalytics(
      user,
      req.params.courseOfferingId as string
    )
    success(res, result)
  },

  async getStudentScoreAnalytics(req: Request, res: Response) {
    const user = req.user
    if (!user) {
      return error(res, '未认证', 401)
    }

    const result = await scoreAnalyticsService.getStudentScoreAnalytics(
      user,
      req.params.studentId as string
    )
    success(res, result)
  },
}
