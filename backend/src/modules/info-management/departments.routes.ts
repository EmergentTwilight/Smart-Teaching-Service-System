/**
 * 部门管理路由
 * 定义部门查询相关的 API 端点
 */
import { Router, type Router as RouterType } from 'express'
import { authMiddleware } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import prisma from '../../shared/prisma/client.js'
import { success } from '../../shared/utils/response.js'
import type { AppError } from '../../shared/middleware/error.js'
import { departmentIdSchema } from './departments.types.js'

const router: RouterType = Router()

// 所有路由需要认证
router.use(authMiddleware)

/**
 * @swagger
 * /api/v1/departments:
 *   get:
 *     summary: 获取院系列表
 *     description: 获取所有院系及其专业信息
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取院系列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Department'
 *                       - type: object
 *                         properties:
 *                           majors:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 name:
 *                                   type: string
 *                                 code:
 *                                   type: string
 *       401:
 *         description: 未授权
 */
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

/**
 * @swagger
 * /api/v1/departments/{id}:
 *   get:
 *     summary: 获取院系详情
 *     description: 根据ID获取院系详细信息及其专业列表
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 院系ID
 *     responses:
 *       200:
 *         description: 成功获取院系信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Department'
 *                     - type: object
 *                       properties:
 *                         majors:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                               code:
 *                                 type: string
 *       400:
 *         description: 无效的院系ID
 *       401:
 *         description: 未授权
 *       404:
 *         description: 院系不存在
 */
router.get('/:id', validate(departmentIdSchema, 'params'), async (req, res, next) => {
  try {
    const id = req.params.id
    if (!id || typeof id !== 'string') {
      const error: AppError = new Error('无效的院系ID')
      error.statusCode = 400
      throw error
    }
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
