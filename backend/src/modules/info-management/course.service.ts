/**
 * 课程管理服务
 */
import prisma from '../../shared/prisma/client.js'
import { Request } from 'express'
import { NotFoundError } from '@stss/shared'
import type { Prisma } from '@prisma/client'
import type { CreateCourseInput, GetCoursesListInput, UpdateCourseInput } from './course.types.js'

export const courseService = {
  async getCourseList(params: GetCoursesListInput) {
    const { page, page_size, keyword, department_id, course_type, status } = params
    const where: Prisma.CourseWhereInput = {}
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
      ]
    }
    if (department_id) {
      where.departmentId = department_id
    }
    if (course_type) {
      where.courseType = course_type
    }
    if (status) {
      where.status = status
    }
    const { items, total } = await prisma.$transaction(async (tx) => {
      const items = await tx.course.findMany({
        where,
        skip: (page - 1) * page_size,
        take: page_size,
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  realName: true,
                },
              },
            },
          },
        },
      })
      const total = await tx.course.count({ where })
      return { items, total }
    })
    const totalPage = Math.ceil(total / page_size)
    const result = {
      items: items.map((course) => ({
        id: course.id,
        code: course.code,
        name: course.name,
        credits: course.credits,
        hours: course.hours,
        courseType: course.courseType,
        category: course.category,
        department_id: course.departmentId,
        department_name: course.department?.name || null,
        teacher_id: course.teacherId,
        teacherName: course.teacher?.user?.realName || null,
        status: course.status,
        created_at: course.createdAt,
      })),
      pagination: {
        page,
        page_size,
        total,
        total_page: totalPage,
      },
    }
    return result
  },

  async getCourseDetail(course_id: string) {
    const course = await prisma.course.findUnique({
      where: { id: course_id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                realName: true,
              },
            },
          },
        },
        prerequisites: {
          select: {
            prerequisite: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    })
    if (!course) {
      throw new NotFoundError('课程不存在')
    }
    const result = {
      id: course.id,
      code: course.code,
      name: course.name,
      credits: course.credits.toNumber(),
      hours: course.hours,
      courseType: course.courseType,
      category: course.category,
      department_id: course.departmentId,
      department_name: course.department?.name || null,
      teacher_id: course.teacherId,
      teacher_name: course.teacher?.user?.realName || null,
      description: course.description,
      assessment_method: course.assessmentMethod,
      status: course.status,
      prerequisites: course.prerequisites.map((p) => ({
        id: p.prerequisite.id,
        code: p.prerequisite.code,
        name: p.prerequisite.name,
      })),
      created_at: course.createdAt,
      update_at: course.updatedAt,
    }
    return result
  },

  async createCourse(data: CreateCourseInput, req: Request) {
    const course = await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          code: data.code,
          name: data.name,
          credits: data.credits,
          hours: data.hours,
          courseType: data.course_type,
          category: data.category,
          departmentId: data.department_id,
          teacherId: data.teacher_id,
          description: data.description,
          assessmentMethod: data.assessment_method,
        },
      })
      await tx.coursePrerequisite.createMany({
        data: (data.prerequisite_ids || []).map((id) => ({
          courseId: course.id,
          prerequisiteId: id,
        })),
      })
      await tx.systemLog.create({
        data: {
          userId: req.user?.userId || null,
          action: 'create',
          resourceType: 'course',
          resourceId: course.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `创建了课程 ${data.name} (ID: ${course.id})`,
        },
      })
      return course
    })
    const result = {
      id: course.id,
      code: course.code,
      name: course.name,
    }
    return result
  },

  async updateCourse(course_id: string, data: UpdateCourseInput, req: Request) {
    const course = await prisma.course.findUnique({ where: { id: course_id } })
    if (!course) {
      throw new NotFoundError('课程不存在')
    }
    const updated = await prisma.$transaction(async (tx) => {
      if (data.prerequisite_ids) {
        await tx.coursePrerequisite.deleteMany({
          where: { courseId: course_id },
        })
      }

      const updated = await tx.course.update({
        where: { id: course_id },
        data: {
          name: data.name,
          credits: data.credits,
          description: data.description,
          updatedAt: new Date(),
        },
      })

      if (data.prerequisite_ids) {
        await tx.coursePrerequisite.createMany({
          data: data.prerequisite_ids.map((id) => ({
            courseId: course_id,
            prerequisiteId: id,
          })),
        })
      }

      await tx.systemLog.create({
        data: {
          userId: req.user?.userId || null,
          action: 'update',
          resourceType: 'course',
          resourceId: course_id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `修改了课程 \n课程ID:${course_id} \n修改前： name:${course.name} credits:${course.credits} description:${course.description}\n 修改后： name:${data.name} credits:${data.credits} description:${data.description}`,
        },
      })
      return updated
    })
    return updated
  },

  async deleteCourse(course_id: string, req: Request) {
    await prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({ where: { id: course_id } })
      if (!course) {
        throw new NotFoundError('课程不存在')
      }
      await tx.course.delete({ where: { id: course_id } })
      await tx.systemLog.create({
        data: {
          userId: req.user?.userId || null,
          action: 'delete',
          resourceType: 'course',
          resourceId: course_id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `删除了课程 ${course.name} (ID: ${course_id})`,
        },
      })
    })
  },

  async batchCreateCourses(coursesData: CreateCourseInput[], req: Request) {
    const createResults = []
    let failedCount = 0
    for (const dataInd in coursesData) {
      const data = coursesData[dataInd]
      try {
        const course = await prisma.$transaction(async (tx) => {
          const course = await tx.course.create({
            data: {
              code: data.code,
              name: data.name,
              credits: data.credits,
              hours: data.hours,
              courseType: data.course_type,
              category: data.category,
              departmentId: data.department_id,
              teacherId: data.teacher_id,
              description: data.description,
              assessmentMethod: data.assessment_method,
              prerequisites: data.prerequisite_ids
                ? {
                    createMany: {
                      data: data.prerequisite_ids.map((id) => ({
                        prerequisiteId: id,
                      })),
                    },
                  }
                : {},
            },
          })
          await tx.systemLog.create({
            data: {
              userId: req.user?.userId || null,
              action: 'create',
              resourceType: 'course',
              resourceId: course.id,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              details: `批量创建了课程 ${data.name} (ID: ${course.id})`,
            },
          })
          return course
        })
        createResults.push({ index: dataInd, id: course.id, status: 'success' })
      } catch (error) {
        failedCount++
        createResults.push({
          index: dataInd,
          error: error instanceof Error ? error.message.split('\n').pop() : '未知错误',
          status: 'failed',
        })
      }
    }
    const result = {
      total: coursesData.length,
      success_count: coursesData.length - failedCount,
      failed_count: failedCount,
      results: createResults,
    }
    return result
  },
}
