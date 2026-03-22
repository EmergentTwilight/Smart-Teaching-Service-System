import { Request, Response } from 'express'
import { coursesService } from './courses.service.js'
import { success, error, paginated } from '../../shared/utils/response.js'
import type { GetCoursesQuery } from './courses.types.js'

export const coursesController = {
  async list(req: Request, res: Response) {
    try {
      const result = await coursesService.getCourses(req.query as GetCoursesQuery)
      paginated(res, result.items, result.pagination)
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取课程列表失败'
      error(res, message, 400)
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const course = await coursesService.getCourseById(id)
      success(res, course)
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取课程信息失败'
      error(res, message, 404)
    }
  },

  async create(req: Request, res: Response) {
    try {
      const course = await coursesService.createCourse(req.body)
      success(res, course, '创建成功', 201)
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建课程失败'
      error(res, message, 400)
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const course = await coursesService.updateCourse(id, req.body)
      success(res, course, '更新成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新课程失败'
      error(res, message, 400)
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await coursesService.deleteCourse(id)
      success(res, null, '删除成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除课程失败'
      error(res, message, 400)
    }
  },
}
