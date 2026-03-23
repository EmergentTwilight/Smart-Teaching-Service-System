/**
 * 课程管理控制器
 * 处理课程 CRUD 相关的 HTTP 请求
 */
import { Request, Response } from 'express'
import { coursesService } from './courses.service.js'
import { success, error, paginated } from '../../shared/utils/response.js'
import { getCoursesQuerySchema, createCourseSchema, updateCourseSchema } from './courses.types.js'

export const coursesController = {
  /**
   * 获取课程列表
   */
  async list(req: Request, res: Response) {
    try {
      // 使用 Zod 解析查询参数
      const query = getCoursesQuerySchema.parse(req.query)
      const result = await coursesService.getCourses(query)
      paginated(res, result.items, result.pagination)
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取课程列表失败'
      error(res, message, 400)
    }
  },

  /**
   * 获取单个课程详情
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      if (!id || typeof id !== 'string') {
        throw new Error('无效的课程ID')
      }
      const course = await coursesService.getCourseById(id)
      success(res, course)
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取课程信息失败'
      error(res, message, 404)
    }
  },

  /**
   * 创建课程
   */
  async create(req: Request, res: Response) {
    try {
      // 使用 Zod 验证请求体
      const data = createCourseSchema.parse(req.body)
      const course = await coursesService.createCourse(data)
      success(res, course, '创建成功', 201)
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建课程失败'
      error(res, message, 400)
    }
  },

  /**
   * 更新课程信息
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      if (!id || typeof id !== 'string') {
        throw new Error('无效的课程ID')
      }
      // 使用 Zod 验证请求体
      const data = updateCourseSchema.parse(req.body)
      const course = await coursesService.updateCourse(id, data)
      success(res, course, '更新成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新课程失败'
      error(res, message, 400)
    }
  },

  /**
   * 删除课程
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      if (!id || typeof id !== 'string') {
        throw new Error('无效的课程ID')
      }
      await coursesService.deleteCourse(id)
      success(res, null, '删除成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除课程失败'
      error(res, message, 400)
    }
  },
}
