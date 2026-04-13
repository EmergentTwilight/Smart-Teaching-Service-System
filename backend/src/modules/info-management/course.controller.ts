/**
 * 课程控制器
 */
import { Request, Response } from 'express'
import { courseService } from './course.service.js'
import { success } from '../../shared/utils/response.js'
import {
  getCoursesListSchema,
  courseIdSchema,
  createCourseSchema,
  updateCourseSchema,
  batchCreateCoursesSchema,
} from './course.types.js'

export const courseController = {
  async list(req: Request, res: Response) {
    const params = getCoursesListSchema.parse(req.query)
    const result = await courseService.getCourseList(params)
    success(res, result)
  },

  async detail(req: Request, res: Response) {
    const course_id = courseIdSchema.parse(req.params).course_id
    const course = await courseService.getCourseDetail(course_id)
    success(res, course)
  },

  async create(req: Request, res: Response) {
    const data = createCourseSchema.parse(req.body)
    const course = await courseService.createCourse(data, req)
    success(res, course, '创建成功', 201)
  },

  async update(req: Request, res: Response) {
    const course_id = req.params.course_id as string
    const data = updateCourseSchema.parse(req.body)
    const course = await courseService.updateCourse(course_id, data, req)
    success(res, course, '更新成功')
  },

  async delete(req: Request, res: Response) {
    const course_id = req.params.course_id as string
    await courseService.deleteCourse(course_id, req)
    success(res, null, '删除成功')
  },

  async batchCreate(req: Request, res: Response) {
    const data = batchCreateCoursesSchema.parse(req.body)
    const courses = await courseService.batchCreateCourses(data.courses, req)
    success(res, courses, '批量创建完成', 201)
  },
}
