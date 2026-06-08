/**
 * 培养方案控制器
 * 处理培养方案相关的 HTTP 请求
 */
import { Request, Response } from 'express'
import { curriculumService } from './curriculums.service.js'
import { success } from '../../shared/utils/response.js'
import {
  getCurriculumListSchema,
  curriculumIdSchema,
  createCurriculumSchema,
  updateCurriculumSchema,
  addCourseToCurriculumSchema,
  batchAddCoursesSchema,
  updateCurriculumCourseSchema,
} from './curriculums.types.js'

export const curriculumController = {
  async list(req: Request, res: Response) {
    const params = getCurriculumListSchema.parse(req.query)
    const result = await curriculumService.getCurriculumList(params)
    success(res, result)
  },

  async detail(req: Request, res: Response) {
    const id = curriculumIdSchema.parse(req.params).id
    const curriculum = await curriculumService.getCurriculumDetail(id)
    success(res, curriculum)
  },

  async create(req: Request, res: Response) {
    const data = createCurriculumSchema.parse(req.body)
    const curriculum = await curriculumService.createCurriculum(data, req)
    success(res, curriculum, '培养方案创建成功', 201)
  },

  async update(req: Request, res: Response) {
    const id = req.params.id as string
    const data = updateCurriculumSchema.parse(req.body)
    const curriculum = await curriculumService.updateCurriculum(id, data, req)
    success(res, curriculum, '培养方案更新成功')
  },

  async delete(req: Request, res: Response) {
    const id = req.params.id as string
    await curriculumService.deleteCurriculum(id, req)
    success(res, null, '培养方案已删除')
  },

  async addCourse(req: Request, res: Response) {
    const curriculumId = req.params.id as string
    const data = addCourseToCurriculumSchema.parse(req.body)
    await curriculumService.addCourseToCurriculum(curriculumId, data, req)
    success(res, null, '课程已添加到培养方案')
  },

  async batchAddCourses(req: Request, res: Response) {
    const curriculumId = req.params.id as string
    const data = batchAddCoursesSchema.parse(req.body)
    const result = await curriculumService.batchAddCourses(curriculumId, data, req)
    success(res, result, '批量添加完成')
  },

  async removeCourse(req: Request, res: Response) {
    const curriculumId = req.params.id as string
    const courseId = req.params.course_id as string
    await curriculumService.removeCourseFromCurriculum(curriculumId, courseId, req)
    success(res, null, '课程已从培养方案移除')
  },

  async updateCourse(req: Request, res: Response) {
    const curriculumId = req.params.id as string
    const courseId = req.params.course_id as string
    const data = updateCurriculumCourseSchema.parse(req.body)
    await curriculumService.updateCurriculumCourse(curriculumId, courseId, data, req)
    success(res, null, '课程信息已更新')
  },
}
