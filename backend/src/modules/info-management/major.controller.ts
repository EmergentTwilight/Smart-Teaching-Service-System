/**
 * 专业控制器
 * 处理专业相关的HTTP请求，调用majorService进行业务逻辑处理
 */
import { Request, Response } from 'express'
import { majorService } from './major.service.js'
import { success } from '../../shared/utils/response.js'
import {
  getMajorIdSchema,
  getMajorListSchema,
  createMajorSchema,
  updateMajorSchema,
} from './major.types.js'

export const majorController = {
  async list(req: Request, res: Response) {
    const params = getMajorListSchema.parse(req.query)
    const result = await majorService.getMajorList(params)
    success(res, result)
  },

  async detail(req: Request, res: Response) {
    const id = getMajorIdSchema.parse(req.params).id
    const major = await majorService.getMajorDetail(id)
    success(res, major)
  },

  async create(req: Request, res: Response) {
    const data = createMajorSchema.parse(req.body)
    const major = await majorService.createMajor(data, req)
    success(res, major, '专业创建成功', 201)
  },

  async update(req: Request, res: Response) {
    const id = getMajorIdSchema.parse(req.params).id
    console.log('[majorController.update] raw body', req.body)
    const data = updateMajorSchema.parse(req.body)
    console.log('[majorController.update] parsed data', data)
    const major = await majorService.updateMajor(id, data, req)
    success(res, major, '专业更新成功')
  },

  async delete(req: Request, res: Response) {
    const id = getMajorIdSchema.parse(req.params).id
    await majorService.deleteMajor(id, req)
    success(res, null, '专业已删除')
  },
}
