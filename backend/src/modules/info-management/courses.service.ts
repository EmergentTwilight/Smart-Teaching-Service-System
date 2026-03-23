/**
 * 课程管理服务
 * 处理课程 CRUD 业务逻辑
 */
import prisma from '../../shared/prisma/client.js'
import type { GetCoursesQuery, CreateCourseInput, UpdateCourseInput } from './courses.types.js'
import type { Prisma } from '@prisma/client'

export const coursesService = {
  /**
   * 获取课程列表（分页）
   * @param query 查询参数
   * @returns 课程列表和分页信息
   */
  async getCourses(query: GetCoursesQuery) {
    const { page, pageSize, keyword, category, departmentId, status } = query
    const skip = (page - 1) * pageSize

    const where: Prisma.CourseWhereInput = {}

    if (keyword) {
      where.OR = [{ code: { contains: keyword } }, { name: { contains: keyword } }]
    }

    if (category) {
      where.category = category
    }

    if (departmentId) {
      where.departmentId = departmentId
    }

    if (status) {
      where.status = status
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          department: true,
          teacher: {
            include: {
              user: {
                select: {
                  realName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count({ where }),
    ])

    const items = courses.map((course) => ({
      id: course.id,
      code: course.code,
      name: course.name,
      credits: course.credits,
      hours: course.hours,
      category: course.category,
      description: course.description,
      department: course.department
        ? {
            id: course.department.id,
            name: course.department.name,
          }
        : null,
      teacher: course.teacher
        ? {
            id: course.teacher.userId,
            realName: course.teacher.user.realName,
            email: course.teacher.user.email,
          }
        : null,
      status: course.status,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }))

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  },

  /**
   * 根据 ID 获取课程详情
   * @param id 课程ID
   * @returns 课程详情
   */
  async getCourseById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        department: true,
        teacher: {
          include: {
            user: {
              select: {
                realName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    })

    if (!course) {
      throw new Error('课程不存在')
    }

    return {
      id: course.id,
      code: course.code,
      name: course.name,
      credits: course.credits,
      hours: course.hours,
      category: course.category,
      description: course.description,
      department: course.department,
      teacher: course.teacher
        ? {
            id: course.teacher.userId,
            realName: course.teacher.user.realName,
            email: course.teacher.user.email,
            phone: course.teacher.user.phone,
          }
        : null,
      status: course.status,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }
  },

  /**
   * 创建课程
   * @param data 课程数据
   * @returns 新创建的课程
   */
  async createCourse(data: CreateCourseInput) {
    // 使用事务确保数据一致性
    const course = await prisma.$transaction(async (tx) => {
      // 检查课程代码是否已存在
      const existingCourse = await tx.course.findUnique({
        where: { code: data.code },
      })

      if (existingCourse) {
        throw new Error('课程代码已存在')
      }

      // 创建课程
      const newCourse = await tx.course.create({
        data: {
          code: data.code,
          name: data.name,
          credits: data.credits,
          hours: data.hours,
          courseType: data.courseType ?? 'ELECTIVE',
          category: data.category,
          description: data.description,
          departmentId: data.departmentId ?? null,
          teacherId: data.teacherId ?? null,
        },
      })

      return newCourse
    })

    return this.getCourseById(course.id)
  },

  /**
   * 更新课程信息
   * @param id 课程ID
   * @param data 更新数据
   * @returns 更新后的课程
   */
  async updateCourse(id: string, data: UpdateCourseInput) {
    const course = await prisma.course.findUnique({
      where: { id },
    })

    if (!course) {
      throw new Error('课程不存在')
    }

    // 如果更新课程代码，检查是否与其他课程冲突
    if (data.code && data.code !== course.code) {
      const existingCourse = await prisma.course.findUnique({
        where: { code: data.code },
      })

      if (existingCourse) {
        throw new Error('课程代码已存在')
      }
    }

    await prisma.course.update({
      where: { id },
      data: {
        ...data,
        departmentId: data.departmentId === null ? null : data.departmentId,
        teacherId: data.teacherId === null ? null : data.teacherId,
      },
    })

    return this.getCourseById(id)
  },

  /**
   * 删除课程
   * @param id 课程ID
   */
  async deleteCourse(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
    })

    if (!course) {
      throw new Error('课程不存在')
    }

    await prisma.course.delete({
      where: { id },
    })
  },
}
