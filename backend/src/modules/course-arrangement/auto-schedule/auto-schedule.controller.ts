// auto-schedule.controller.ts
import { Request, Response } from 'express'
import { autoScheduleService } from './auto-schedule.service.js'
import { success } from '../../../shared/utils/response.js'
import {
  createTaskSchema,
  taskIdSchema,
  autoScheduleTaskResponseSchema,
  applyTaskResponseSchema,
} from './auto-schedule.types.js'

// 修改：同一处理方式，验证请求的类型 => 交给 service => 验证 result => 封装 response，这样不会出现类型错误

// 6.4.1 创建排课任务
export const createAutoTask = async (req: Request, res: Response) => {
  const validatedInput = createTaskSchema.parse(req.body)
  const result = await autoScheduleService.createSchedulingTask(validatedInput)
  const validatedData = autoScheduleTaskResponseSchema.parse(result)
  success(res, validatedData, '任务已启动', 202)
}

// 6.4.2 查询任务状态
export const getTaskStatus = async (req: Request, res: Response) => {
  const validatedInput = taskIdSchema.parse(req.params)
  const result = await autoScheduleService.getTaskStatus(validatedInput)
  const validatedData = autoScheduleTaskResponseSchema.parse(result)
  success(res, validatedData)
}

// 6.4.3 获取排课预览结果
export const getTaskPreview = async (req: Request, res: Response) => {
  const validatedInput = taskIdSchema.parse(req.params)
  const result = await autoScheduleService.getTaskPreview(validatedInput)
  const validatedData = autoScheduleTaskResponseSchema.parse(result)
  success(res, validatedData)
}

// 6.4.4 应用排课结果
export const applyTask = async (req: Request, res: Response) => {
  const validatedInput = taskIdSchema.parse(req.params)
  const result = await autoScheduleService.applyResults(validatedInput)
  const validatedData = applyTaskResponseSchema.parse(result)
  success(res, validatedData, '排课结果已成功应用')
}
