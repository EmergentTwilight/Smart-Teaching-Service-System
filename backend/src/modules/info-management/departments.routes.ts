/**
 * 部门管理路由
 * 定义部门查询相关的 API 端点
 */
import { Router, type Router as RouterType } from 'express'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import prisma from '../../shared/prisma/client.js'
import { success } from '../../shared/utils/response.js'
import { ConflictError, NotFoundError } from '@stss/shared'
import {
  departmentIdSchema,
  getDepartmentListSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
} from './departments.types.js'

const router: RouterType = Router()

// 所有路由需要认证
router.use(authMiddleware)

type DepartmentListRecord = {
  id: string
  name: string
  code: string | null
  description: string | null
  createdAt: Date
  majors: Array<{ _count: { students: number } }>
  _count: {
    majors: number
    teachers: number
    admins: number
    courses: number
  }
}

type DepartmentDetailRecord = {
  id: string
  name: string
  code: string | null
  description: string | null
  createdAt: Date
  updatedAt: Date
  majors: Array<{
    id: string
    name: string
    code: string | null
    degreeType: string | null
    _count: { students: number }
  }>
  teachers: Array<{
    userId: string
    teacherNumber: string
    title: string | null
    user: { realName: string }
  }>
  _count: {
    majors: number
    teachers: number
    admins: number
    courses: number
  }
}

function serializeDepartmentListItem(department: DepartmentListRecord) {
  return {
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description,
    teacher_count: department._count.teachers,
    student_count: department.majors.reduce((sum, major) => sum + major._count.students, 0),
    major_count: department._count.majors,
    admin_count: department._count.admins,
    course_count: department._count.courses,
    created_at: department.createdAt,
  }
}

function serializeDepartmentDetail(department: DepartmentDetailRecord) {
  return {
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description,
    teacher_count: department._count.teachers,
    student_count: department.majors.reduce((sum, major) => sum + major._count.students, 0),
    major_count: department._count.majors,
    admin_count: department._count.admins,
    course_count: department._count.courses,
    majors: department.majors.map((major) => ({
      id: major.id,
      name: major.name,
      code: major.code,
      degree_type: major.degreeType,
      student_count: major._count.students,
    })),
    teachers: department.teachers.map((teacher) => ({
      id: teacher.userId,
      teacher_number: teacher.teacherNumber,
      real_name: teacher.user.realName,
      title: teacher.title,
    })),
    created_at: department.createdAt,
    updated_at: department.updatedAt,
  }
}

function getRequestUserId(req: unknown): string | undefined {
  return (req as { user?: { userId: string } }).user?.userId
}

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
router.get('/', validate(getDepartmentListSchema, 'query'), async (req, res, next) => {
  try {
    const query = getDepartmentListSchema.parse(req.query)
    const { page, pageSize, keyword } = query
    const where = keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' as const } },
            { code: { contains: keyword, mode: 'insensitive' as const } },
          ],
        }
      : undefined

    const [departments, total] = await prisma.$transaction([
      prisma.department.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          majors: {
            select: {
              _count: {
                select: { students: true },
              },
            },
          },
          _count: {
            select: {
              majors: true,
              teachers: true,
              admins: true,
              courses: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.department.count({ where }),
    ])

    success(res, {
      items: departments.map((department) => serializeDepartmentListItem(department)),
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    })
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
        majors: {
          select: {
            id: true,
            name: true,
            code: true,
            degreeType: true,
            _count: {
              select: { students: true },
            },
          },
        },
        teachers: {
          include: {
            user: {
              select: {
                realName: true,
              },
            },
          },
        },
        _count: {
          select: {
            majors: true,
            teachers: true,
            admins: true,
            courses: true,
          },
        },
      },
    })
    if (!department) {
      throw new NotFoundError('院系不存在')
    }
    success(res, serializeDepartmentDetail(department))
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
      const description = req.body.description as string | undefined

      const existingByCode = await prisma.department.findUnique({
        where: { code },
        select: { id: true },
      })
      if (existingByCode) {
        throw new ConflictError('部门代码已存在')
      }

      const existingByName = await prisma.department.findFirst({
        where: { name },
        select: { id: true },
      })
      if (existingByName) {
        throw new ConflictError('部门名称已存在')
      }

      const newDepartment = await prisma.$transaction(async (tx) => {
        const department = await tx.department.create({
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

        await tx.systemLog.create({
          data: {
            userId: getRequestUserId(req),
            action: 'department:create',
            resourceType: 'department',
            resourceId: department.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
              name,
              code,
            },
          },
        })

        return department
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
 *     responses:
 *       200:
 *         description: 成功更新院系信息
 */
router.put(
  '/:id',
  requireRoles('admin', 'super_admin'),
  validate(departmentIdSchema, 'params'),
  validate(updateDepartmentSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.params.id as string
      const name = req.body.name as string | undefined
      const description = req.body.description as string | undefined

      const existing = await prisma.department.findUnique({
        where: { id },
        select: { id: true, name: true, description: true },
      })
      if (!existing) {
        throw new NotFoundError('院系不存在')
      }

      if (name && name !== existing.name) {
        const existingByName = await prisma.department.findFirst({
          where: {
            name,
            id: { not: id },
          },
          select: { id: true },
        })

        if (existingByName) {
          throw new ConflictError('部门名称已存在')
        }
      }

      const updatedDepartment = await prisma.$transaction(async (tx) => {
        const department = await tx.department.update({
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

        await tx.systemLog.create({
          data: {
            userId: getRequestUserId(req),
            action: 'department:update',
            resourceType: 'department',
            resourceId: id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
              before: {
                name: existing.name,
                description: existing.description,
              },
              after: {
                name: name ?? existing.name,
                description: description ?? existing.description,
              },
            },
          },
        })

        return department
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
      const department = await prisma.department.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              majors: true,
              teachers: true,
              admins: true,
              courses: true,
            },
          },
        },
      })

      if (!department) {
        throw new NotFoundError('院系不存在')
      }

      const hasRelations =
        department._count.majors > 0 ||
        department._count.teachers > 0 ||
        department._count.admins > 0 ||
        department._count.courses > 0
      if (hasRelations) {
        throw new ConflictError('院系存在关联数据，无法删除')
      }

      await prisma.$transaction(async (tx) => {
        await tx.department.delete({
          where: { id },
        })
        await tx.systemLog.create({
          data: {
            userId: getRequestUserId(req),
            action: 'department:delete',
            resourceType: 'department',
            resourceId: id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
              name: department.name,
              code: department.code,
            },
          },
        })
      })
      success(res, null, '院系删除成功', 200)
    } catch (err) {
      next(err)
    }
  }
)

export default router
