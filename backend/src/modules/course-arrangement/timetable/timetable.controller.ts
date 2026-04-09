import { Request, Response } from 'express'
import { TimetableService } from './timetable.service.js'

const timetableService = new TimetableService()

export const getByCourseOffering = async (req: Request, res: Response) => {
  try {
    const { courseOfferingId } = req.params
    const result = await timetableService.getByCourseOffering(courseOfferingId as string)
    res.json({ code: 200, message: '查询成功', data: result })
  } catch (error) {
    res.status(500).json({ code: 500, message: '查询失败' })
  }
}

export const getByClassroom = async (req: Request, res: Response) => {
  try {
    const { classroomId } = req.params
    const result = await timetableService.getByClassroom(classroomId as string)
    res.json({ code: 200, message: '查询成功', data: result })
  } catch (error) {
    res.status(500).json({ code: 500, message: '查询失败' })
  }
}

export const getTimetables = async (req: Request, res: Response) => {
  try {
    const result = await timetableService.getTimetables(req.query)
    res.json({ code: 200, message: '查询成功', data: result })
  } catch (error) {
    res.status(500).json({ code: 500, message: '查询失败' })
  }
}
