/**
 * 部门管理路由
 * 定义部门查询相关的 API 端点
 *
 * TODO(@dev/A): 院系专业管理模块尚未完成
 *  - 缺少 POST /departments (创建院系)
 *  - 缺少 PATCH /departments/:id (更新院系)
 *  - 缺少 DELETE /departments/:id (删除院系)
 *  - 缺少专业 CRUD API
 *  - 缺少单元测试
 */
import { Router, type Router as RouterType } from 'express'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import prisma from '../../shared/prisma/client.js'
import { success } from '../../shared/utils/response.js'
import { NotFoundError } from '@stss/shared'
import {
  departmentIdSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
} from './departments.types.js'

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
    const id = req.params.id as string
    // validate 中间件已验证 id 参数，无需重复检查
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        majors: true,
      },
    })
    if (!department) {
      throw new NotFoundError('院系不存在')
    }
    success(res, department)
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/departments:
 *   post:
 *     summary: 创建院系
 *     description: 创建一个新的院系
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: 成功创建院系
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *               code:
 *                 type: string
 *               message:
 *                 type: string
 *               data:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   code:
 *                     type: string
 *       400:
 *         description: 无效的请求数据
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 */
router.post(
  '/',
  requireRoles('super_admin'),
  validate(createDepartmentSchema, 'body'),
  async (req, res, next) => {
    try {
      const name = req.body.name as string
      const code = req.body.code as string
      const description = req.body.description as string
      const newDepartment = await prisma.department.create({
        data: {
          name,
          code,
          description,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      })

      success(res, newDepartment, '院系创建成功', 201)
    } catch (err) {
      next(err)
    }
  }
)

/**
 * @swagger
 * /api/v1/departments/{id}:
 *   put:
 *     summary: 更新院系信息
 *     description: 根据ID更新院系的名称和描述
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *    responses:
 *      200:
 *       description: 成功更新院系信息
 */
router.put(
  '/:id',
  requireRoles('admin', 'super_admin'),
  validate(updateDepartmentSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.params.id as string
      const name = req.body.name as string
      const description = req.body.description as string
      const updatedDepartment = await prisma.department.update({
        where: { id },
        data: {
          name,
          description,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      })
      success(res, updatedDepartment, '院系更新成功', 200)
    } catch (err) {
      next(err)
    }
  }
)

/**
 * @swagger
 * /api/v1/departments/{id}:
 *   delete:
 *     summary: 删除院系
 *     description: 根据ID删除院系
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
 *         description: 成功删除院系
 */
router.delete(
  '/:id',
  requireRoles('super_admin'),
  validate(departmentIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id as string
      await prisma.department.delete({
        where: { id },
      })
      success(res, null, '院系删除成功', 200)
    } catch (err) {
      next(err)
    }
  }
)

export default router
