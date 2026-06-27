import prisma from '../../../shared/prisma/client.js'
import type {
  Equipment,
  ClassroomWithId,
  UpdateClassroomInput,
  ClassroomInput,
  PagedClassroomQueryInput,
  ClassroomIdInput,
  AvaliableQueryInput,
  ClassroomListResponse,
  ClassroomIdResponse,
  PagedClassroomListResponse,
  NullableClassroomResponse,
} from './classroom.types.js'
import type { Classroom, Prisma } from '@prisma/client'

function adaptToClassroomWithId(classroom: Classroom): ClassroomWithId {
  return {
    id: classroom.id,
    classroom: {
      status: classroom.status,
      building: classroom.building,
      roomNumber: classroom.roomNumber,
      campus: classroom.campus,
      capacity: classroom.capacity,
      roomType: classroom.roomType,
      equipment: classroom.equipment ? (classroom.equipment as Equipment) : undefined,
    },
  }
}

export class ClassroomService {
  async findAll(input: PagedClassroomQueryInput): Promise<PagedClassroomListResponse> {
    // 构建查询条件
    const where: Prisma.ClassroomWhereInput = {}
    if (input.campus) where.campus = input.campus
    if (input.building) where.building = input.building
    if (input.roomType) where.roomType = input.roomType
    if (input.status) where.status = input.status
    if (input.keyword) {
      where.OR = [
        { roomNumber: { contains: input.keyword } },
        { building: { contains: input.keyword } },
      ]
    }

    // 分页查询
    const [total, items] = await Promise.all([
      prisma.classroom.count({ where }),
      prisma.classroom.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { roomNumber: 'asc' },
      }),
    ])
    return {
      total,
      page: input.page,
      pageSize: input.pageSize,
      items: items.map(adaptToClassroomWithId),
    }
  }
  async create(input: ClassroomInput): Promise<ClassroomIdResponse> {
    // 1. 唯一性检查
    const existing = await prisma.classroom.findFirst({
      where: {
        campus: input.campus,
        building: input.building,
        roomNumber: input.roomNumber,
      },
    })

    if (existing) {
      throw new Error('该教室已存在')
    }

    // 2. 写入数据库
    const created = await prisma.classroom.create({
      data: input,
    })
    return { id: created.id }
  }

  async findById(input: ClassroomIdInput): Promise<NullableClassroomResponse> {
    const classroom = await prisma.classroom.findUnique({ where: { id: input.id } })
    return classroom ? adaptToClassroomWithId(classroom) : null
  }
  async update(input: UpdateClassroomInput): Promise<ClassroomIdResponse> {
    await prisma.classroom.update({
      where: { id: input.id },
      data: input.data,
    })
    return { id: input.id }
  }

  async findAvailable(input: AvaliableQueryInput): Promise<ClassroomListResponse> {
    // 1. 找出在该时间段已经有课的教室 ID
    const occupiedClassroomIds = await prisma.schedule.findMany({
      where: {
        dayOfWeek: input.dayOfWeek,
        AND: [
          { startWeek: { lte: input.startWeek } },
          { endWeek: { gte: input.endWeek } },
          { startPeriod: { lte: input.startPeriod } },
          { endPeriod: { gte: input.endPeriod } },
        ],
      },
      select: { classroomId: true },
    })

    const ids = occupiedClassroomIds.map((s) => s.classroomId)

    // 2. 查询满足硬件条件且不在上述 ID 列表中的教室
    const items = await prisma.classroom.findMany({
      where: {
        id: { notIn: ids },
        status: 'AVAILABLE', // 必须是可用状态
        capacity: input.capacity ? { gte: input.capacity } : undefined,
        roomType: input.roomType,
        campus: input.campus,
      },
    })
    return items.map(adaptToClassroomWithId)
  }
}
