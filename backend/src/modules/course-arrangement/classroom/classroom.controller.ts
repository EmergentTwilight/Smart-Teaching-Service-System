import { Request, Response } from 'express'
import { ClassroomService } from './classroom.service.js'
import { createClassroomSchema } from './classroom.schemas.js'

const classroomService = new ClassroomService()
// 6.1.1 查询教室列表
export const getClassrooms = async (req: Request, res: Response) => {
  try {
    const query = req.query
    const result = await classroomService.findAll(query)

    // 遵循大组规范的统一返回格式
    res.json({
      code: 200,
      message: 'success',
      data: result,
    })
  } catch {
    res.status(500).json({
      code: 500,
      message: 'Internal Server Error',
      data: null,
    })
  }
}
// 6.1.2 查询教室详情
export const getClassroomById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string // 添加 as string
    const result = await classroomService.findById(id)
    if (!result) {
      return res.status(404).json({ code: 404, message: '教室不存在' })
    }
    res.json({ code: 200, message: 'success', data: result })
  } catch {
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
}
// 6.1.3 新增教室
export const createClassroom = async (req: Request, res: Response) => {
  try {
    // 1. Zod 校验
    const validatedData = createClassroomSchema.parse(req.body)

    // 2. 调用 Service
    const result = await classroomService.create(validatedData)

    // 3. 返回 201 Created (规范要求)
    res.status(201).json({
      code: 201,
      message: '教室创建成功',
      data: result,
    })
  } catch (error: any) {
    // 处理 Zod 校验错误或其他业务错误
    res.status(400).json({
      code: 400,
      message: error.errors ? '参数校验失败' : error.message || '创建失败',
      errors: error.errors, // 如果是 Zod 错误，会带上详细字段说明
    })
  }
}
// 6.1.4 更新教室
export const updateClassroom = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string // 添加 as string
    // 这里建议以后也加上 Zod 校验，现在先直接传
    const result = await classroomService.update(id, req.body)
    res.json({ code: 200, message: '更新成功', data: result })
  } catch (error: any) {
    res.status(400).json({ code: 400, message: error.message || '更新失败' })
  }
}

// 6.1.5 查询可用教室 Controller
export const getAvailableClassrooms = async (req: Request, res: Response) => {
  try {
    // 校验必要参数是否缺失（dayOfWeek, startWeek 等）
    const { dayOfWeek, startWeek, endWeek, startPeriod, endPeriod } = req.query
    if (!dayOfWeek || !startWeek || !endWeek || !startPeriod || !endPeriod) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要的时间范围查询参数',
      })
    }

    const result = await classroomService.findAvailable(req.query)
    res.json({
      code: 200,
      message: '查询成功',
      data: result,
    })
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || '查询可用教室失败',
    })
  }
}
