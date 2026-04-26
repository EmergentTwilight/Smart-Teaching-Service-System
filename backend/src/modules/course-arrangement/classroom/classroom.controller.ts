import { Request, Response } from 'express'
import { ClassroomService } from './classroom.service.js'
import {
  pagedClassroomQuerySchema,
  classroomIdSchema,
  classroomInPrismaSchema,
  nullableClassroomResponseSchema,
  classroomListResponseSchema,
  availableQuerySchema,
  pagedClassroomListResponseSchema,
  classroomIdResponseSchema,
  updateClassroomSchema,
} from './classroom.types.js'
import { success, error } from '../../../shared/utils/response.js'
import { ZodError } from 'zod'

const classroomService = new ClassroomService()
// 6.1.1 查询教室列表
export const getClassrooms = async (req: Request, res: Response) => {
  try {
    const validatedInput = pagedClassroomQuerySchema.parse(req.query)
    const result = await classroomService.findAll(validatedInput)
    const validatedData = pagedClassroomListResponseSchema.parse(result)
    success(res, validatedData)
    // 遵循大组规范的统一返回格式
  } catch {
    error(res, 'Internal Server Error', 500)
  }
}
// 6.1.2 查询教室详情
export const getClassroomById = async (req: Request, res: Response) => {
  try {
    const validatedInput = classroomIdSchema.parse(req.params)
    const result = await classroomService.findById(validatedInput)
    const validatedData = nullableClassroomResponseSchema.parse(result)
    if (!validatedData) {
      error(res, '教室不存在', 404)
    } else {
      success(res, validatedData)
    }
  } catch {
    error(res, '服务器内部错误', 500)
  }
}
// 6.1.3 新增教室
export const createClassroom = async (req: Request, res: Response) => {
  try {
    const validatedInput = classroomInPrismaSchema.parse(req.body)
    const result = await classroomService.create(validatedInput)
    const validatedData = classroomIdResponseSchema.parse(result)
    // 3. 返回 201 Created (规范要求)
    success(res, validatedData, '教室创建成功', 201)
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      // 处理 Zod 校验错误或其他业务错误
      if (err.name === 'ZodError') {
        error(res, '请求参数错误', 400, err.errors)
      } else {
        error(res, err.message || '创建教室失败', 409)
      }
    }
  }
}
// 6.1.4 更新教室
export const updateClassroom = async (req: Request, res: Response) => {
  try {
    const validatedInput = updateClassroomSchema.parse({ id: req.params.id, data: req.body })
    const result = await classroomService.update(validatedInput)
    const validatedData = classroomIdResponseSchema.parse(result)
    success(res, validatedData, '更新成功')
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      if (err.name === 'ZodError') {
        error(res, '请求参数错误', 400, err.errors)
      } else {
        error(res, err.message || '更新教室失败', 409)
      }
    }
  }
}

// 6.1.5 查询可用教室 Controller
export const getAvailableClassrooms = async (req: Request, res: Response) => {
  try {
    const validatedInput = availableQuerySchema.parse(req.query)
    const result = await classroomService.findAvailable(validatedInput)
    const validatedData = classroomListResponseSchema.parse(result)
    success(res, validatedData)
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      if (err.name === 'ZodError') {
        error(res, '缺少必要的时间范围查询参数', 400, err.errors)
      } else {
        error(res, err.message || '查询可用教室失败', 500)
      }
    }
  }
}
