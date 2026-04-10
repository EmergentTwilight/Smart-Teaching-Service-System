import { Request, Response } from 'express'
import { ScheduleService } from './schedule.service.js'
import { createScheduleSchema } from './schedule.schemas.js'

const scheduleService = new ScheduleService()
// 6.2.4 新增排课
export const createSchedule = async (req: Request, res: Response) => {
  try {
    const validatedData = createScheduleSchema.parse(req.body)
    const result = await scheduleService.create(validatedData)
    res.status(201).json({
      code: 201,
      message: '排课创建成功',
      data: result,
    })
  } catch (error: any) {
    res.status(error.name === 'ZodError' ? 400 : 409).json({
      code: error.name === 'ZodError' ? 400 : 409,
      message: error.message || '排课失败',
    })
  }
}
// 6.2.3 预校验排课
export const validateSchedule = async (req: Request, res: Response) => {
  try {
    const validatedData = createScheduleSchema.parse(req.body)
    const result = await scheduleService.validate(validatedData)

    // 即使 valid 为 false，这个接口通常也返回 200，内容里告知结果
    // 或者按照你文档写的，冲突时返回 409
    const status = result.valid ? 200 : 409
    res.status(status).json({
      code: result.valid ? 0 : 409,
      message: result.valid ? '校验通过' : '排课冲突',
      data: result,
    })
  } catch {
    res.status(400).json({ code: 400, message: '请求参数错误' })
  }
}
// 6.2.1 查询列表
export const getSchedules = async (req: Request, res: Response) => {
  try {
    const result = await scheduleService.findAll(req.query)
    res.json({
      code: 200,
      message: 'success',
      data: result,
    })
  } catch {
    res.status(500).json({ code: 500, message: 'Internal Server Error' })
  }
}
// 6.2.2 查询详情
export const getScheduleById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const result = await scheduleService.findById(id)
    if (!result) {
      return res.status(404).json({ code: 404, message: '排课记录不存在' })
    }
    res.json({ code: 200, message: 'success', data: result })
  } catch {
    res.status(500).json({ code: 500, message: 'Internal Server Error' })
  }
}

// 6.2.5 更新排课
export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const result = await scheduleService.update(id, req.body)
    res.json({ code: 200, message: '更新成功', data: result })
  } catch (error: any) {
    res.status(409).json({ code: 409, message: error.message })
  }
}

// 6.2.6 删除排课
export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    await scheduleService.delete(id)
    res.json({ code: 200, message: '删除成功', data: { id } })
  } catch {
    res.status(500).json({ code: 500, message: '删除失败' })
  }
}
