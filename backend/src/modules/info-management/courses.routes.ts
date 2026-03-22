/**
 * 课程管理路由
 * 定义课程 CRUD 相关的 API 端点
 */
import { Router, type Router as RouterType } from 'express'
import { coursesController } from './courses.controller.js'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import { getCoursesQuerySchema, createCourseSchema, updateCourseSchema } from './courses.types.js'

const router: RouterType = Router()

// 所有路由需要认证
router.use(authMiddleware)

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: 获取课程列表
 *     description: 分页查询课程列表（管理员和教师可访问）
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词（课程代码、名称）
 *       - in: query
 *         name: courseType
 *         schema:
 *           type: string
 *           enum: [REQUIRED, ELECTIVE, GENERAL]
 *         description: 课程类型筛选
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 院系ID筛选
 *     responses:
 *       200:
 *         description: 成功获取课程列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 */
router.get(
  '/',
  validate(getCoursesQuerySchema, 'query'),
  requireRoles('admin', 'super_admin', 'teacher'),
  coursesController.list
)

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   get:
 *     summary: 获取课程详情
 *     description: 根据ID获取课程详细信息
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 课程ID
 *     responses:
 *       200:
 *         description: 成功获取课程信息
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
 *                   $ref: '#/components/schemas/Course'
 *       401:
 *         description: 未授权
 *       404:
 *         description: 课程不存在
 */
router.get('/:id', coursesController.getById)

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: 创建课程
 *     description: 创建新课程（仅管理员可访问）
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - credits
 *               - courseType
 *             properties:
 *               code:
 *                 type: string
 *                 maxLength: 20
 *                 example: CS101
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: 计算机科学导论
 *               credits:
 *                 type: number
 *                 example: 3.0
 *               hours:
 *                 type: integer
 *                 example: 48
 *               courseType:
 *                 type: string
 *                 enum: [REQUIRED, ELECTIVE, GENERAL]
 *                 example: REQUIRED
 *               category:
 *                 type: string
 *                 example: 专业必修
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               teacherId:
 *                 type: string
 *                 format: uuid
 *               description:
 *                 type: string
 *               assessmentMethod:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: 创建成功
 *                 data:
 *                   $ref: '#/components/schemas/Course'
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 */
router.post(
  '/',
  validate(createCourseSchema, 'body'),
  requireRoles('admin', 'super_admin'),
  coursesController.create
)

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   put:
 *     summary: 更新课程信息
 *     description: 更新指定课程的信息（仅管理员可访问）
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 课程ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               credits:
 *                 type: number
 *               hours:
 *                 type: integer
 *               courseType:
 *                 type: string
 *                 enum: [REQUIRED, ELECTIVE, GENERAL]
 *               category:
 *                 type: string
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               teacherId:
 *                 type: string
 *                 format: uuid
 *               description:
 *                 type: string
 *               assessmentMethod:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, ARCHIVED]
 *     responses:
 *       200:
 *         description: 更新成功
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
 *                   example: 更新成功
 *                 data:
 *                   $ref: '#/components/schemas/Course'
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 课程不存在
 */
router.put(
  '/:id',
  validate(updateCourseSchema, 'body'),
  requireRoles('admin', 'super_admin'),
  coursesController.update
)

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   delete:
 *     summary: 删除课程
 *     description: 删除指定课程（仅超级管理员可访问）
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 课程ID
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 课程不存在
 */
router.delete('/:id', requireRoles('super_admin'), coursesController.delete)

export default router
