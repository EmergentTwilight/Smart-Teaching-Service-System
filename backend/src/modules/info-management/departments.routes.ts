/**
 * 部门管理路由
 * 定义部门查询相关的 API 端点
 */
import { Router } from 'express'
import { authMiddleware } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import prisma from '../../shared/prisma/client.js'
import { success } from '../../shared/utils/response.js'
import type { AppError } from '../../shared/middleware/error.js'
import { departmentIdSchema } from './departments.types.js'

const router = Router()

router.use(authMiddleware)

router.get('/', async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        majors: true,
      },
    })
    success(res, departments)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/:id',
  validate(departmentIdSchema, 'params'),
  async (req, res, next) => {
  try {
    const { id } = req.params
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        majors: true,
      },
    })
    if (!department) {
      const error: AppError = new Error('院系不存在')
      error.statusCode = 404
      throw error
    }
    success(res, department)
  } catch (err) {
    next(err)
  }
})

export default router
