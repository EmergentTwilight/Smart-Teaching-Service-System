import { Request, Response } from 'express'
import { ScheduleService } from './schedule.service.js'
import {
  createScheduleSchema,
  pagedGetSchedulesSchema,
  idSchema,
  updateScheduleSchema,
  idResponseSchema,
  validateResponseSchema,
  pagedScheduleListResponseSchema,
  scheduleSchema,
} from './schedule.types.js'
import { success, error } from '../../../shared/utils/response.js'
import { ZodError } from 'zod'

const scheduleService = new ScheduleService()
// 6.2.4 新增排课
export const createSchedule = async (req: Request, res: Response) => {
  try {
    const validatedInput = createScheduleSchema.parse(req.body)
    const result = await scheduleService.create(validatedInput)
    const validatedData = idResponseSchema.parse(result)
    success(res, validatedData, '排课创建成功', 201)
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      error(res, '请求参数错误', 400, err.errors)
      return
    }
    error(res, err instanceof Error ? err.message : '排课失败', 409)
  }
}
// 6.2.3 预校验排课
export const validateSchedule = async (req: Request, res: Response) => {
  try {
    const validatedInput = createScheduleSchema.parse(req.body)
    const result = await scheduleService.validate(validatedInput)
    const validatedData = validateResponseSchema.parse(result)

    if (validatedData.valid) {
      success(res, validatedData, '校验通过')
    } else {
      success(res, validatedData, '校验失败')
    }
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      error(res, '请求参数错误', 400, err.errors)
      return
    }
    error(res, err instanceof Error ? err.message : '校验失败', 409)
  }
}
// 6.2.1 查询列表
export const getSchedules = async (req: Request, res: Response) => {
  try {
    const validatedInput = pagedGetSchedulesSchema.parse(req.query)
    const result = await scheduleService.findAll(validatedInput)
    const validatedData = pagedScheduleListResponseSchema.parse(result)
    success(res, validatedData)
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      error(res, '请求参数错误', 400, err.errors)
      return
    }
    error(res, err instanceof Error ? err.message : '获取排课列表失败', 500)
  }
}
// 6.2.2 查询详情
export const getScheduleById = async (req: Request, res: Response) => {
  try {
    const validatedInput = idSchema.parse(req.params)
    const result = await scheduleService.findById(validatedInput)
    if (!result) {
      error(res, '排课记录不存在', 404)
      return
    }
    const validatedData = scheduleSchema.parse(result)
    success(res, validatedData)
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      error(res, '请求参数错误', 400, err.errors)
      return
    }
    error(res, err instanceof Error ? err.message : '获取排课详情失败', 500)
  }
}

// 6.2.5 更新排课
export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const validatedInput = updateScheduleSchema.parse({ id: req.params.id, data: req.body })
    const result = await scheduleService.update(validatedInput)
    const validatedData = idResponseSchema.parse(result)
    success(res, validatedData, '更新成功')
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      error(res, '请求参数错误', 400, err.errors)
      return
    }
    error(res, err instanceof Error ? err.message : '更新排课失败', 409)
  }
}

// 6.2.6 删除排课
export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const validatedInput = idSchema.parse(req.params)
    await scheduleService.delete(validatedInput)
    const validatedData = idResponseSchema.parse(validatedInput)
    success(res, validatedData, '删除成功')
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      error(res, '请求参数错误', 400, err.errors)
      return
    }
    error(res, err instanceof Error ? err.message : '删除排课失败', 500)
  }
}
