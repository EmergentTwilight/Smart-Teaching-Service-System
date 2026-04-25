/**
 * F1 成绩录入控制器
 * 处理 HTTP 请求，调用 service 层
 */
import { Request, Response } from 'express'
import { scoreEntryService } from './score-entry.service.js'
import { success, paginated } from '../../shared/utils/response.js'
import {
  getScoreListQuerySchema,
  saveDraftBodySchema,
  submitScoresBodySchema,
} from './score-entry.types.js'

export const scoreEntryController = {
  /**
   * GET /api/v1/course-offerings/:courseOfferingId/scores
   * 获取某开课下的成绩录入列表
   */
  async getScoreList(req: Request, res: Response) {
    const { courseOfferingId } = req.params
    const query = getScoreListQuerySchema.parse(req.query)
    const userId = req.user!.userId
    const roles = (req.user!.roles as string[]).join(',')

    const result = await scoreEntryService.getScoreList(courseOfferingId, query, userId, roles)

    paginated(res, result.items, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    })
  },

  /**
   * PUT /api/v1/course-offerings/:courseOfferingId/scores/draft
   * 批量保存成绩草稿
   */
  async saveDraft(req: Request, res: Response) {
    const { courseOfferingId } = req.params
    const body = saveDraftBodySchema.parse(req.body)
    const userId = req.user!.userId
    const roles = (req.user!.roles as string[]).join(',')

    const result = await scoreEntryService.saveDraft(courseOfferingId, body, userId, roles)
    success(res, result, '草稿保存成功')
  },

  /**
   * POST /api/v1/course-offerings/:courseOfferingId/scores/submit
   * 批量提交成绩
   */
  async submitScores(req: Request, res: Response) {
    const { courseOfferingId } = req.params
    const body = submitScoresBodySchema.parse(req.body)
    const userId = req.user!.userId
    const roles = (req.user!.roles as string[]).join(',')

    const result = await scoreEntryService.submitScores(courseOfferingId, body, userId, roles)
    success(res, result, '成绩提交成功')
  },
}
