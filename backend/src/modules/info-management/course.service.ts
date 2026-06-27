/**
 * 课程管理服务
 */
import prisma from '../../shared/prisma/client.js'
import { Request } from 'express'
import { ConflictError, NotFoundError } from '@stss/shared'
import type { Prisma } from '@prisma/client'
import type { CreateCourseInput, GetCoursesListInput, UpdateCourseInput } from './course.types.js'

function serializeCourseSummary(course: { id: string; code: string; name: string }) {
  return {
    id: course.id,
    code: course.code,
    name: course.name,
  }
}

async function ensureCourseRelations(
  tx: Prisma.TransactionClient,
  data: {
    code?: string
    department_id?: string
    teacher_id?: string
    prerequisite_ids?: string[]
  },
  currentCourseId?: string
) {
  if (data.code) {
    const duplicateCourse = await tx.course.findUnique({
      where: { code: data.code },
      select: { id: true },
    })
    if (duplicateCourse && duplicateCourse.id !== currentCourseId) {
      throw new ConflictError('课程代码已存在')
    }
  }

  if (data.department_id) {
    const department = await tx.department.findUnique({
      where: { id: data.department_id },
      select: { id: true },
    })
    if (!department) {
      throw new NotFoundError('院系不存在')
    }
  }

  if (data.teacher_id) {
    const teacher = await tx.teacher.findUnique({
      where: { userId: data.teacher_id },
      select: { userId: true },
    })
    if (!teacher) {
      throw new NotFoundError('教师不存在')
    }
  }

  if (data.prerequisite_ids && data.prerequisite_ids.length > 0) {
    if (currentCourseId && data.prerequisite_ids.includes(currentCourseId)) {
      throw new ConflictError('课程不能将自身设为先修课程')
    }

    const uniqueIds = [...new Set(data.prerequisite_ids)]
    const existingCount = await tx.course.count({
      where: { id: { in: uniqueIds } },
    })
    if (existingCount !== uniqueIds.length) {
      throw new NotFoundError('先修课程不存在')
    }
  }
}

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
        total_pages: totalPage,
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
      updated_at: course.updatedAt,
    }
    return result
  },

  async createCourse(data: CreateCourseInput, req: Request) {
    const course = await prisma.$transaction(async (tx) => {
      await ensureCourseRelations(tx, data)

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
      if (data.prerequisite_ids && data.prerequisite_ids.length > 0) {
        await tx.coursePrerequisite.createMany({
          data: data.prerequisite_ids.map((id) => ({
            courseId: course.id,
            prerequisiteId: id,
          })),
        })
      }
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
    return serializeCourseSummary(course)
  },

  async updateCourse(course_id: string, data: UpdateCourseInput, req: Request) {
    const course = await prisma.course.findUnique({ where: { id: course_id } })
    if (!course) {
      throw new NotFoundError('课程不存在')
    }
    const updated = await prisma.$transaction(async (tx) => {
      await ensureCourseRelations(tx, { prerequisite_ids: data.prerequisite_ids }, course_id)

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
    return serializeCourseSummary(updated)
  },

  async deleteCourse(course_id: string, req: Request) {
    await prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({ where: { id: course_id } })
      if (!course) {
        throw new NotFoundError('课程不存在')
      }
      const [
        curriculumCourseCount,
        courseOfferingCount,
        scheduleCount,
        enrollmentCount,
        questionBankCount,
        prerequisiteCount,
        requiredForCount,
      ] = await Promise.all([
        tx.curriculumCourse.count({ where: { courseId: course_id } }),
        tx.courseOffering.count({ where: { courseId: course_id } }),
        tx.schedule.count({ where: { courseOffering: { courseId: course_id } } }),
        tx.enrollment.count({ where: { courseOffering: { courseId: course_id } } }),
        tx.questionBank.count({ where: { courseId: course_id } }),
        tx.coursePrerequisite.count({ where: { courseId: course_id } }),
        tx.coursePrerequisite.count({ where: { prerequisiteId: course_id } }),
      ])
      const references = [
        curriculumCourseCount > 0 ? `培养方案引用 ${curriculumCourseCount} 条` : null,
        courseOfferingCount > 0 ? `开课记录 ${courseOfferingCount} 条` : null,
        scheduleCount > 0 ? `排课记录 ${scheduleCount} 条` : null,
        enrollmentCount > 0 ? `选课记录 ${enrollmentCount} 条` : null,
        questionBankCount > 0 ? `题库记录 ${questionBankCount} 条` : null,
        prerequisiteCount > 0 ? `该课程设置的先修关系 ${prerequisiteCount} 条` : null,
        requiredForCount > 0 ? `其他课程依赖它作为先修课 ${requiredForCount} 条` : null,
      ].filter(Boolean)

      if (references.length > 0) {
        throw new ConflictError(
          `课程「${course.name}」已被引用，无法删除。请先解除：${references.join('、')}`
        )
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
    for (const [index, data] of coursesData.entries()) {
      try {
        const course = await prisma.$transaction(async (tx) => {
          await ensureCourseRelations(tx, data)

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
        createResults.push({ index, id: course.id, status: 'created' })
      } catch (error) {
        failedCount++
        createResults.push({
          index,
          error: error instanceof Error ? error.message.split('\n').pop() : '未知错误',
          status: 'failed',
        })
      }
    }
    const result = {
      total: coursesData.length,
      success_count: coursesData.length - failedCount,
      fail_count: failedCount,
      results: createResults,
    }
    return result
  },
}
