/**
 * 专业管理服务
 * 处理专业 CRUD 操作的业务逻辑，包括查询专业列表、获取专业详情、创建/更新/删除专业。
 */
import prisma from '../../shared/prisma/client.js'
import { Request } from 'express'
import { ConflictError, NotFoundError } from '@stss/shared'
import type { Prisma } from '@prisma/client'
import type { CreateMajorSchema, GetMajorListSchema, UpdateMajorSchema } from './major.types.js'

function serializeMajorSummary(major: { id: string; name: string; code: string | null }) {
  return {
    id: major.id,
    name: major.name,
    code: major.code,
  }
}

export const majorService = {
  async getMajorList(params: GetMajorListSchema) {
    const { page, page_size, department_id, keyword } = params
    const where: Prisma.MajorWhereInput = {}
    if (department_id) {
      where.departmentId = department_id
    }
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
      ]
    }
    const { items, total } = await prisma.$transaction(async (tx) => {
      const majors = await tx.major.findMany({
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
          _count: {
            select: {
              students: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      })

      const total = await tx.major.count({ where })

      const items = majors.map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        department_id: m.department.id,
        department_name: m.department.name,
        degree_type: m.degreeType,
        total_credits: m.totalCredits?.toNumber() || 0,
        student_count: m._count.students,
        created_at: m.createdAt,
      }))
      return { items, total }
    })
    return {
      items: items,
      pagination: {
        page,
        page_size,
        total_pages: Math.ceil(total / page_size),
        total: total,
      },
    }
  },

  async getMajorDetail(id: string) {
    return await prisma.$transaction(async (tx) => {
      const major = await tx.major.findUnique({
        where: { id },
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          students: {
            include: {
              user: {
                select: {
                  realName: true,
                },
              },
            },
          },
          curriculums: {
            select: {
              id: true,
              name: true,
              year: true,
              totalCredits: true,
            },
          },
          _count: {
            select: {
              students: true,
            },
          },
        },
      })
      if (!major) throw new NotFoundError('专业')
      return {
        id: major.id,
        name: major.name,
        code: major.code,
        department_id: major.department.id,
        department_name: major.department.name,
        degree_type: major.degreeType,
        total_credits: major.totalCredits?.toNumber() || 0,
        student_count: major._count.students,
        description: major.description,
        curriculums: major.curriculums.map((c) => ({
          id: c.id,
          name: c.name,
          year: c.year,
          total_credits: c.totalCredits?.toNumber() || 0,
        })),
        students: major.students.map((s) => ({
          user_id: s.userId,
          student_number: s.studentNumber,
          real_name: s.user.realName,
          grade: s.grade,
        })),
        created_at: major.createdAt,
        updated_at: major.updatedAt,
      }
    })
  },

  async createMajor(data: CreateMajorSchema, req: Request) {
    const { department_id, code, name, degree_type, total_credits } = data
    const major = await prisma.$transaction(async (tx) => {
      const department = await tx.department.findUnique({
        where: { id: department_id },
        select: { id: true },
      })
      if (!department) {
        throw new NotFoundError('院系不存在')
      }

      const duplicateName = await tx.major.findFirst({
        where: { name },
        select: { id: true },
      })
      if (duplicateName) {
        throw new ConflictError('专业名称已存在')
      }

      if (code) {
        const duplicateCode = await tx.major.findUnique({
          where: { code },
          select: { id: true },
        })
        if (duplicateCode) {
          throw new ConflictError('专业代码已存在')
        }
      }

      const major = await tx.major.create({
        data: {
          department: {
            connect: { id: department_id },
          },
          name: name,
          code: code,
          degreeType: degree_type,
          totalCredits: total_credits,
        },
      })
      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'create',
          resourceType: 'major',
          resourceId: major.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `创建了专业 ${name} (ID: ${major.id})`,
        },
      })
      return serializeMajorSummary(major)
    })
    return major
  },

  async updateMajor(id: string, data: UpdateMajorSchema, req: Request) {
    const updated = await prisma.$transaction(async (tx) => {
      const major = await tx.major.findUnique({ where: { id } })
      if (!major) {
        throw new NotFoundError('专业不存在')
      }
      if (data.name && data.name !== major.name) {
        const duplicateName = await tx.major.findFirst({
          where: {
            name: data.name,
            id: { not: id },
          },
          select: { id: true },
        })
        if (duplicateName) {
          throw new ConflictError('专业名称已存在')
        }
      }
      const updatedMajor = await tx.major.update({
        where: { id },
        data: {
          name: data.name,
          totalCredits: data.total_credits,
        },
      })
      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'update',
          resourceType: 'major',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `修改了专业 \n专业ID:${id} \n修改前： name:${major.name} totalCredits:${major.totalCredits}\n 修改后： name:${data.name} totalCredits:${data.total_credits}`,
        },
      })

      return updatedMajor
    })
    return serializeMajorSummary(updated)
  },

  async deleteMajor(id: string, req: Request) {
    await prisma.$transaction(async (tx) => {
      const major = await tx.major.findUnique({ where: { id } })
      if (!major) {
        throw new NotFoundError('专业不存在')
      }
      const studentCount = await tx.student.count({ where: { majorId: id } })
      if (studentCount > 0) {
        throw new ConflictError('专业下存在关联学生，无法删除')
      }
      await tx.major.delete({ where: { id } })
      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'delete',
          resourceType: 'major',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: `删除了专业 ${major.name} (ID: ${id})`,
        },
      })
    })
  },
}
