import prisma from '../../shared/prisma/client.js'
import type { GetCoursesQuery, CreateCourseInput, UpdateCourseInput } from './courses.types.js'
import type { Prisma } from '@prisma/client'

export const coursesService = {
  async getCourses(query: GetCoursesQuery) {
    const { page, pageSize, keyword, category, departmentId, status } = query
    const skip = (page - 1) * pageSize

    const where: Prisma.CourseWhereInput = {}

    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
      ]
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
            select: {
              id: true,
              realName: true,
              email: true,
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
      department: course.department ? {
        id: course.department.id,
        name: course.department.name,
      } : null,
      teacher: course.teacher,
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

  async getCourseById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        department: true,
        teacher: {
          select: {
            id: true,
            realName: true,
            email: true,
            phone: true,
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
      teacher: course.teacher,
      status: course.status,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }
  },

  async createCourse(data: CreateCourseInput) {
    // 检查课程代码是否已存在
    const existingCourse = await prisma.course.findUnique({
      where: { code: data.code },
    })

    if (existingCourse) {
      throw new Error('课程代码已存在')
    }

    const course = await prisma.course.create({
      data: {
        code: data.code,
        name: data.name,
        credits: data.credits,
        hours: data.hours,
        category: data.category,
        description: data.description,
        departmentId: data.departmentId,
        teacherId: data.teacherId,
      },
      include: {
        department: true,
        teacher: {
          select: {
            id: true,
            realName: true,
            email: true,
          },
        },
      },
    })

    return this.getCourseById(course.id)
  },

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
