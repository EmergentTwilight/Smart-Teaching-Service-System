import { Request, Response } from 'express'
import { success, error } from '../../shared/utils/response.js'
import { timetableService } from './timetable.service.js'

export const timetableController = {
  async getMyTimetable(req: Request, res: Response) {
    const studentId = req.user?.userId
    const semesterId = typeof req.query.semesterId === 'string' ? req.query.semesterId : undefined

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await timetableService.getMyTimetable(studentId, { semesterId })
    return success(res, result)
  },
}
