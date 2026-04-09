import prisma from '../../../shared/prisma/client.js'
import { ClassroomQuery, ClassroomListResponse } from './classroom.types.js'
import { CreateClassroomDTO } from './classroom.schemas.js'

export class ClassroomService {
  async findAll(query: ClassroomQuery): Promise<ClassroomListResponse> {
    const { page = 1, pageSize = 20, campus, building, roomType, status, keyword } = query

    // 构建查询条件
    const where: any = {}
    if (campus) where.campus = campus
    if (building) where.building = building
    if (roomType) where.roomType = roomType
    if (status) where.status = status
    if (keyword) {
      where.OR = [{ roomNumber: { contains: keyword } }, { building: { contains: keyword } }]
    }

    // 分页查询
    const [total, items] = await Promise.all([
      prisma.classroom.count({ where }),
      prisma.classroom.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { roomNumber: 'asc' },
      }),
    ])

    return {
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      items,
    }
  }
  async create(data: CreateClassroomDTO) {
    // 1. 唯一性检查
    const existing = await prisma.classroom.findFirst({
      where: {
        campus: data.campus,
        building: data.building,
        roomNumber: data.roomNumber,
      },
    })

    if (existing) {
      throw new Error('该教室已存在')
    }

    // 2. 写入数据库
    return await prisma.classroom.create({
      data,
    })
  }

  async findById(id: string) {
    return await prisma.classroom.findUnique({ where: { id } })
  }
  async update(id: string, data: any) {
    return await prisma.classroom.update({
      where: { id },
      data,
    })
  }
  async findAvailable(query: any) {
    const { dayOfWeek, startWeek, endWeek, startPeriod, endPeriod, capacity, roomType, campus } =
      query

    // 1. 找出在该时间段已经有课的教室 ID
    const occupiedClassroomIds = await prisma.schedule.findMany({
      where: {
        dayOfWeek: Number(dayOfWeek),
        AND: [
          { startWeek: { lte: Number(endWeek) } },
          { endWeek: { gte: Number(startWeek) } },
          { startPeriod: { lte: Number(endPeriod) } },
          { endPeriod: { gte: Number(startPeriod) } },
        ],
      },
      select: { classroomId: true },
    })

    const ids = occupiedClassroomIds.map((s) => s.classroomId)

    // 2. 查询满足硬件条件且不在上述 ID 列表中的教室
    return await prisma.classroom.findMany({
      where: {
        id: { notIn: ids },
        status: 'AVAILABLE', // 必须是可用状态
        capacity: capacity ? { gte: Number(capacity) } : undefined,
        roomType: roomType || undefined,
        campus: campus || undefined,
      },
    })
  }
}
