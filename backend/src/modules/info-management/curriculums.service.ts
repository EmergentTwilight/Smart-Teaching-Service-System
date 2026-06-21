/**
 * 培养方案管理服务
 * 处理培养方案 CRUD 操作的业务逻辑
 */
import prisma from '../../shared/prisma/client.js'
import { Request } from 'express'
import { ConflictError, NotFoundError } from '@stss/shared'
import type { Prisma } from '@prisma/client'
import type {
  GetCurriculumListSchema,
  CreateCurriculumSchema,
  UpdateCurriculumSchema,
  AddCourseToCurriculumSchema,
  BatchAddCoursesSchema,
  UpdateCurriculumCourseSchema,
} from './curriculums.types.js'

export const curriculumService = {
  async getCurriculumList(params: GetCurriculumListSchema) {
    const { page, page_size, major_id, year } = params
    const where: Prisma.CurriculumWhereInput = {}
    if (major_id) {
      where.majorId = major_id
    }
    if (year) {
      where.year = year
    }

    const { items, total } = await prisma.$transaction(async (tx) => {
      const curriculums = await tx.curriculum.findMany({
        where,
        skip: (page - 1) * page_size,
        take: page_size,
        include: {
          major: {
            select: {
              id: true,
              name: true,
            },
          },
          courses: {
            select: {
              courseId: true,
              courseType: true,
            },
          },
        },
      })

      const total = await tx.curriculum.count({ where })

      const items = curriculums.map((c) => ({
        id: c.id,
        name: c.name,
        major_id: c.major.id,
        major_name: c.major.name,
        year: c.year,
        total_credits: c.totalCredits?.toNumber() || 0,
        required_credits: c.requiredCredits?.toNumber() || 0,
        elective_credits: c.electiveCredits?.toNumber() || 0,
        course_count: c.courses.length,
        created_at: c.createdAt,
      }))

      return { items, total }
    })

    return {
      items,
      pagination: {
        page,
        page_size,
        total_pages: Math.ceil(total / page_size),
        total,
      },
    }
  },

  async getCurriculumDetail(id: string) {
    return await prisma.$transaction(async (tx) => {
      const curriculum = await tx.curriculum.findUnique({
        where: { id },
        include: {
          major: {
            select: {
              id: true,
              name: true,
            },
          },
          courses: {
            include: {
              course: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  credits: true,
                  courseType: true,
                },
              },
            },
          },
        },
      })

      if (!curriculum) {
        throw new NotFoundError('培养方案')
      }

      return {
        id: curriculum.id,
        name: curriculum.name,
        major_id: curriculum.major.id,
        major_name: curriculum.major.name,
        year: curriculum.year,
        total_credits: curriculum.totalCredits?.toNumber() || 0,
        required_credits: curriculum.requiredCredits?.toNumber() || 0,
        elective_credits: curriculum.electiveCredits?.toNumber() || 0,
        courses: curriculum.courses.map((cc) => ({
          course_id: cc.course.id,
          course_code: cc.course.code,
          course_name: cc.course.name,
          credits: cc.course.credits.toNumber(),
          course_type: cc.course.courseType,
          semester_suggestion: cc.semesterSuggestion,
        })),
        created_at: curriculum.createdAt,
        updated_at: curriculum.updatedAt,
      }
    })
  },

  async createCurriculum(data: CreateCurriculumSchema, req: Request) {
    const curriculum = await prisma.$transaction(async (tx) => {
      const major = await tx.major.findUnique({
        where: { id: data.major_id },
        select: { id: true },
      })
      if (!major) {
        throw new NotFoundError('专业不存在')
      }

      const duplicate = await tx.curriculum.findFirst({
        where: {
          majorId: data.major_id,
          year: data.year,
          name: data.name,
        },
        select: { id: true },
      })
      if (duplicate) {
        throw new ConflictError('培养方案已存在')
      }

      const curriculum = await tx.curriculum.create({
        data: {
          major: {
            connect: { id: data.major_id },
          },
          name: data.name,
          year: data.year,
          totalCredits: data.total_credits,
          requiredCredits: data.required_credits,
          electiveCredits: data.elective_credits,
        },
      })

      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'create',
          resourceType: 'curriculum',
          resourceId: curriculum.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `创建了培养方案 ${data.name} (ID: ${curriculum.id})`,
        },
      })

      return curriculum
    })

    return {
      id: curriculum.id,
      name: curriculum.name,
    }
  },

  async updateCurriculum(id: string, data: UpdateCurriculumSchema, req: Request) {
    const updated = await prisma.$transaction(async (tx) => {
      const curriculum = await tx.curriculum.findUnique({ where: { id } })
      if (!curriculum) {
        throw new NotFoundError('培养方案不存在')
      }
      if (data.name && data.name !== curriculum.name) {
        const duplicate = await tx.curriculum.findFirst({
          where: {
            id: { not: id },
            majorId: curriculum.majorId,
            year: curriculum.year,
            name: data.name,
          },
          select: { id: true },
        })
        if (duplicate) {
          throw new ConflictError('培养方案已存在')
        }
      }

      const updatedCurriculum = await tx.curriculum.update({
        where: { id },
        data: {
          name: data.name,
          totalCredits: data.total_credits ?? undefined,
          requiredCredits: data.required_credits ?? undefined,
          electiveCredits: data.elective_credits ?? undefined,
        },
      })

      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'update',
          resourceType: 'curriculum',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `修改了培养方案 ${curriculum.name} (ID: ${id})`,
        },
      })

      return updatedCurriculum
    })

    return {
      id: updated.id,
      name: updated.name,
      total_credits: updated.totalCredits?.toNumber() || 0,
      required_credits: updated.requiredCredits?.toNumber() || 0,
      elective_credits: updated.electiveCredits?.toNumber() || 0,
    }
  },

  async deleteCurriculum(id: string, req: Request) {
    await prisma.$transaction(async (tx) => {
      const curriculum = await tx.curriculum.findUnique({ where: { id } })
      if (!curriculum) {
        throw new NotFoundError('培养方案不存在')
      }

      await tx.curriculum.delete({ where: { id } })

      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'delete',
          resourceType: 'curriculum',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `删除了培养方案 ${curriculum.name} (ID: ${id})`,
        },
      })
    })
  },

  async addCourseToCurriculum(
    curriculumId: string,
    data: AddCourseToCurriculumSchema,
    req: Request
  ) {
    await prisma.$transaction(async (tx) => {
      const curriculum = await tx.curriculum.findUnique({ where: { id: curriculumId } })
      if (!curriculum) {
        throw new NotFoundError('培养方案不存在')
      }

      const course = await tx.course.findUnique({ where: { id: data.course_id } })
      if (!course) {
        throw new NotFoundError('课程不存在')
      }
      const existing = await tx.curriculumCourse.findUnique({
        where: {
          curriculumId_courseId: {
            curriculumId,
            courseId: data.course_id,
          },
        },
      })
      if (existing) {
        throw new ConflictError('课程已在培养方案中')
      }

      await tx.curriculumCourse.create({
        data: {
          curriculumId,
          courseId: data.course_id,
          courseType: data.course_type,
          semesterSuggestion: data.semester_suggestion,
        },
      })

      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'update',
          resourceType: 'curriculum',
          resourceId: curriculumId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `向培养方案 ${curriculum.name} 添加了课程 ${course.name}`,
        },
      })
    })
  },

  async batchAddCourses(curriculumId: string, data: BatchAddCoursesSchema, req: Request) {
    let successCount = 0
    let failCount = 0

    await prisma.$transaction(async (tx) => {
      const curriculum = await tx.curriculum.findUnique({ where: { id: curriculumId } })
      if (!curriculum) {
        throw new NotFoundError('培养方案不存在')
      }

      for (const item of data.courses) {
        const course = await tx.course.findUnique({ where: { id: item.course_id } })
        if (!course) {
          failCount++
          continue
        }

        try {
          await tx.curriculumCourse.create({
            data: {
              curriculumId,
              courseId: item.course_id,
              courseType: item.course_type,
              semesterSuggestion: item.semester_suggestion,
            },
          })
          successCount++
        } catch {
          failCount++
        }
      }

      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'update',
          resourceType: 'curriculum',
          resourceId: curriculumId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `向培养方案 ${curriculum.name} 批量添加了 ${successCount} 门课程`,
        },
      })
    })

    return {
      success_count: successCount,
      fail_count: failCount,
    }
  },

  async removeCourseFromCurriculum(curriculumId: string, courseId: string, req: Request) {
    await prisma.$transaction(async (tx) => {
      const curriculum = await tx.curriculum.findUnique({ where: { id: curriculumId } })
      if (!curriculum) {
        throw new NotFoundError('培养方案不存在')
      }

      const course = await tx.course.findUnique({ where: { id: courseId } })
      if (!course) {
        throw new NotFoundError('课程不存在')
      }

      const relation = await tx.curriculumCourse.findUnique({
        where: {
          curriculumId_courseId: {
            curriculumId,
            courseId,
          },
        },
      })
      if (!relation) {
        throw new NotFoundError('培养方案课程不存在')
      }

      await tx.curriculumCourse.delete({
        where: {
          curriculumId_courseId: {
            curriculumId,
            courseId,
          },
        },
      })

      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'update',
          resourceType: 'curriculum',
          resourceId: curriculumId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `从培养方案 ${curriculum.name} 移除了课程 ${course.name}`,
        },
      })
    })
  },

  async updateCurriculumCourse(
    curriculumId: string,
    courseId: string,
    data: UpdateCurriculumCourseSchema,
    req: Request
  ) {
    console.log('[curriculumService.updateCurriculumCourse] input', {
      curriculumId,
      courseId,
      data,
    })
    await prisma.$transaction(async (tx) => {
      const curriculum = await tx.curriculum.findUnique({ where: { id: curriculumId } })
      if (!curriculum) {
        throw new NotFoundError('培养方案不存在')
      }

      const course = await tx.course.findUnique({ where: { id: courseId } })
      if (!course) {
        throw new NotFoundError('课程不存在')
      }

      const relation = await tx.curriculumCourse.findUnique({
        where: {
          curriculumId_courseId: {
            curriculumId,
            courseId,
          },
        },
      })
      if (!relation) {
        throw new NotFoundError('培养方案课程不存在')
      }

      const updatedRelation = await tx.curriculumCourse.update({
        where: {
          curriculumId_courseId: {
            curriculumId,
            courseId,
          },
        },
        data: {
          courseType: data.course_type,
          semesterSuggestion: data.semester_suggestion,
        },
      })
      console.log('[curriculumService.updateCurriculumCourse] updated relation', updatedRelation)

      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'update',
          resourceType: 'curriculum',
          resourceId: curriculumId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `更新了培养方案 ${curriculum.name} 中课程 ${course.name} 的信息`,
        },
      })
    })
  },
}
