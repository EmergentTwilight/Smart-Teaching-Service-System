// backend/src/modules/course-arrangement/timetable/timetable.controller.ts
import { Request, Response } from 'express'
import { TimetableService } from './timetable.service.js'
import {
  getByCourseOfferingSchema,
  getByClassroomSchema,
  pagedGetTimetablesSchema,
  pagedTimetableListResponseSchema,
  timetableListResponseSchema,
  exportTimetableSchema,
  exportResponseSchema,
} from './timetable.types.js'
import { success, error } from '../../../shared/utils/response.js'
import { ZodError } from 'zod'

const timetableService = new TimetableService()
// 6.3.1 按课程开设查询
export const getByCourseOffering = async (req: Request, res: Response) => {
  try {
    const validatedInput = getByCourseOfferingSchema.parse(req.params)
    const data = await timetableService.getByCourseOffering(validatedInput)
    const validatedData = timetableListResponseSchema.parse(data)
    success(res, validatedData, '查询成功')
  } catch {
    error(res, '服务器错误', 500)
  }
}
// 6.3.2 按教室查询
export const getByClassroom = async (req: Request, res: Response) => {
  try {
    const validatedInput = getByClassroomSchema.parse({ id: req.params, query: req.query })
    const data = await timetableService.getByClassroom(validatedInput)
    const validatedData = timetableListResponseSchema.parse(data)
    success(res, validatedData, '查询成功')
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      if (err.name === 'ZodError') {
        error(res, '请求参数错误', 400, err.errors)
      } else {
        error(res, '服务器错误', 500)
      }
    }
  }
}
// 6.3.3 按学期查询
export const getTimetables = async (req: Request, res: Response) => {
  try {
    // 这里的 req.user 视你们认证中间件的实现而定
    console.log({ query: req.query, user: req.user })
    const validatedInput = pagedGetTimetablesSchema.parse({ query: req.query, user: req.user })
    console.log(validatedInput)
    const data = await timetableService.getTimetables(validatedInput)
    const validatedData = pagedTimetableListResponseSchema.parse(data)
    success(res, validatedData, '查询成功')
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      if (err.name === 'ZodError') {
        error(res, '请求参数错误', 400, err.errors)
      } else {
        error(res, err.message || '查询失败', 500)
      }
    }
  }
}

// 6.3.4 导出/打印 (实现文件流返回)
export const exportTimetable = async (req: Request, res: Response) => {
  try {
    const validatedInput = exportTimetableSchema.parse(req.query)
    const data = await timetableService.getExportData(validatedInput)
    const validatedData = exportResponseSchema.parse(data)

    // 设置响应头，触发下载
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${validatedData.filename}"`)

    return res.status(200).send(validatedData.content)
  } catch {
    res.status(500).send('导出失败')
  }
}
