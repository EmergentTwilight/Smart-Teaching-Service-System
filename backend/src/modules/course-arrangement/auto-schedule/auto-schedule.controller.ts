import { Request, Response } from 'express'
import { autoScheduleService } from './auto-schedule.service.js'

export const createAutoTask = async (req: Request, res: Response) => {
  const taskId = await autoScheduleService.createSchedulingTask(req.body)
  res.status(202).json({ code: 0, message: '任务已启动', data: { taskId } })
}

export const getTaskStatus = async (req: Request, res: Response) => {
  const { taskId } = req.params
  const status = autoScheduleService.getTaskStatus(taskId as string)
  res.json({ code: 0, message: '查询成功', data: status })
}

export const getTaskPreview = async (req: Request, res: Response) => {
  const { taskId } = req.params
  const preview = autoScheduleService.getTaskPreview(taskId as string)
  res.json({ code: 0, message: '查询成功', data: preview })
}

export const applyTask = async (req: Request, res: Response) => {
  const { taskId } = req.params
  const result = await autoScheduleService.applyResults(taskId as string)
  res.json({ code: 0, message: '排课结果已成功应用', data: result })
}
