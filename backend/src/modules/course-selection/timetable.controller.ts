import { Request, Response } from 'express'
import { success, error } from '../../shared/utils/response.js'
import { timetableService } from './timetable.service.js'
import { timetableQuerySchema } from './course-selection.schemas.js'

export const timetableController = {
  async getMyTimetable(req: Request, res: Response) {
    const studentId = req.user?.userId
    const query = timetableQuerySchema.parse(req.query)

    if (!studentId) {
      return error(res, '未认证', 401)
    }

    const result = await timetableService.getMyTimetable(studentId, query)
    return success(res, result)
  },
}
