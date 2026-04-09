/**
 * 专业管理服务
 * 处理专业 CRUD 操作的业务逻辑，包括查询专业列表、获取专业详情、创建/更新/删除专业。
 */
import prisma from '../../shared/prisma/client.js'
import { Request } from 'express'
import { NotFoundError } from '@stss/shared'
import type { Prisma } from '@prisma/client'
import type { CreateMajorSchema, GetMajorListSchema, UpdateMajorSchema } from './major.types.js'

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
      /**
       * 先查询专业列表，然后根据专业ID列表查询创建日志，最后在内存中合并数据返回。
       */
      // 查询专业列表
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
      })

      const total = await tx.major.count({ where })

      const majorIds = majors.map((m) => m.id)
      //查询对应专业ID的创建日志
      const creationLogs = await tx.systemLog.findMany({
        where: {
          resourceType: 'major',
          resourceId: { in: majorIds },
          action: 'create',
        },
        select: {
          createdAt: true,
          resourceId: true,
        },
      })
      // 将日志转换为Map，方便后续根据专业ID获取创建时间
      const logMap = new Map<string, Date>()
      creationLogs.forEach((log) => {
        //因为前面有限制：resourceId in majorIds，所以这里的log.resourceId一定不为null
        logMap.set(log.resourceId!, log.createdAt)
      })
      // 在内存中合并专业数据和创建时间，构造最终返回的列表项
      const items = majors.map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        department_id: m.department.id,
        department_name: m.department.name,
        degree_type: m.degreeType,
        total_credits: m.totalCredits?.toNumber() || 0,
        student_count: m._count.students,
        created_at: logMap.get(m.id) || new Date(0), // 如果没有日志记录，默认时间为1970-01-01
      }))
      return { items, total }
    })
    return {
      items: items,
      pagination: {
        page,
        page_size,
        total_page: Math.ceil(total / page_size),
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
              description: true,
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
        },
      })
      if (!major) throw new NotFoundError('专业')
      //查找SystemLog中更新该专业信息的日志，获取最近一次更新时间
      const updateLog = await tx.systemLog.findFirst({
        where: {
          resourceType: 'major',
          resourceId: id,
          action: 'update',
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
        },
      })
      const createLog = await tx.systemLog.findFirst({
        where: {
          resourceType: 'major',
          resourceId: id,
          action: 'create',
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
        },
      })
      return {
        id: major.id,
        name: major.name,
        code: major.code,
        department_id: major.department.id,
        department_name: major.department.name,
        degree_type: major.degreeType,
        total_credits: major.totalCredits?.toNumber() || 0,
        description: major.department.description,
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
        created_at: createLog?.createdAt || new Date(0),
        updated_at: updateLog?.createdAt || new Date(0),
      }
    })
  },

  async createMajor(data: CreateMajorSchema, req: Request) {
    const { department_id, code, name, degree_type, total_credits } = data
    const major = await prisma.$transaction(async (tx) => {
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
      return major
    })
    return major
  },

  async updateMajor(id: string, data: UpdateMajorSchema, req: Request) {
    const updated = await prisma.$transaction(async (tx) => {
      const major = await tx.major.findUnique({ where: { id } })
      if (!major) {
        throw new NotFoundError('专业不存在')
      }
      await tx.major.update({
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
    })
    return updated
  },

  async deleteMajor(id: string, req: Request) {
    await prisma.$transaction(async (tx) => {
      const major = await tx.major.findUnique({ where: { id } })
      if (!major) {
        throw new NotFoundError('专业不存在')
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
