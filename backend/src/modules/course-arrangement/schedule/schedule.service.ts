import prisma from '../../../shared/prisma/client.js'
import {
  ScheduleInPrisma,
  CreateScheduleInput,
  UpdateScheduleInput,
  IdInput,
  PagedGetSchedulesInput,
  ScheduleResponse,
  PagedScheduleListResponse,
  ValidateResponse,
  IdResponse,
  Schedule,
  NullableScheduleResponse,
} from './schedule.types.js'
import { Prisma } from '@prisma/client'

export const scheduleInclude = Prisma.validator<Prisma.ScheduleInclude>()({
  classroom: {
    select: {
      building: true,
      roomNumber: true,
      campus: true,
      status: true,
      roomType: true,
      capacity: true,
    },
  },
  courseOffering: {
    include: {
      course: { select: { id: true, name: true, code: true } },
      teacher: { include: { user: { select: { realName: true } } } },
    },
  },
})
export type ScheduleWithRelations = Prisma.ScheduleGetPayload<{ include: typeof scheduleInclude }>

export function adaptToSchedule(schedule: ScheduleWithRelations): Schedule {
  return {
    id: schedule.id,
    schedule: {
      courseOfferingId: schedule.courseOfferingId,
      classroomId: schedule.classroomId,
      dayOfWeek: schedule.dayOfWeek,
      startWeek: schedule.startWeek,
      endWeek: schedule.endWeek,
      startPeriod: schedule.startPeriod,
      endPeriod: schedule.endPeriod,
      notes: schedule.notes,
    },
    courseName: schedule.courseOffering.course.name,
    teacherId: schedule.courseOffering.teacherId,
    teacherName: schedule.courseOffering.teacher.user?.realName || '未知教师',
    classroom: {
      id: schedule.classroomId,
      classroom: schedule.classroom,
    },
  }
}

export class ScheduleService {
  /**
   * 检测时间冲突
   * 返回值：如果有冲突返回冲突记录，没冲突返回 null
   */
  async checkConflict(
    data: CreateScheduleInput,
    excludeId?: string
  ): Promise<ScheduleInPrisma | null> {
    return prisma.schedule.findFirst({
      where: {
        classroomId: data.classroomId,
        dayOfWeek: data.dayOfWeek,
        // 逻辑：周次有交集 且 节次有交集
        AND: [
          {
            // 周次交集判定：max(start1, start2) <= min(end1, end2)
            startWeek: { lte: data.endWeek },
            endWeek: { gte: data.startWeek },
          },
          {
            // 节次交集判定
            startPeriod: { lte: data.endPeriod },
            endPeriod: { gte: data.startPeriod },
          },
          // 如果是更新操作，排除掉自己本身
          excludeId ? { id: { not: excludeId } } : {},
        ],
      },
    })
  }

  async create(input: CreateScheduleInput): Promise<IdResponse> {
    // 1. 检查教室是否存在且可用
    const classroom = await prisma.classroom.findUnique({
      where: { id: input.classroomId },
    })
    if (!classroom || classroom.status !== 'AVAILABLE') {
      throw new Error('教室不存在或当前不可用')
    }

    // 2. 检查时间冲突
    const conflict = await this.checkConflict(input)
    if (conflict) {
      throw new Error('排课冲突：该教室内已有课程安排')
    }

    // 3. 写入排课
    const result = await prisma.schedule.create({ data: input })

    return { id: result.id }
  }
  async validate(input: CreateScheduleInput): Promise<ValidateResponse> {
    const conflict = await this.checkConflict(input)
    if (conflict) {
      return {
        valid: false,
        conflicts: [{ type: 'classroom_conflict', message: '教室在该时间段已被占用' }],
      }
    }
    return { valid: true, conflicts: [] }
  }
  async findAll(input: PagedGetSchedulesInput): Promise<PagedScheduleListResponse> {
    const where: Prisma.ScheduleWhereInput = {}
    if (input.classroomId) where.classroomId = input.classroomId
    if (input.courseOfferingId) where.courseOfferingId = input.courseOfferingId

    const [total, rawItems] = await Promise.all([
      prisma.schedule.count({ where }),
      prisma.schedule.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: scheduleInclude,
      }),
    ])
    const items: ScheduleResponse[] = rawItems.map(adaptToSchedule)
    return { items, page: input.page, pageSize: input.pageSize, total }
  }
  async findById(input: IdInput): Promise<NullableScheduleResponse> {
    const schedule = await prisma.schedule.findUnique({
      where: { id: input.id },
      include: scheduleInclude,
    })
    if (!schedule) return null
    return adaptToSchedule(schedule)
  }
  async update(input: UpdateScheduleInput): Promise<IdResponse> {
    // 1. 先查出原记录，获取当前信息
    const current = await prisma.schedule.findUnique({ where: { id: input.id } })
    if (!current) throw new Error('未找到排课记录')

    // 2. 构造完整的待校验数据（用新数据覆盖旧数据）
    const checkData: ScheduleInPrisma = { ...current, ...input.data }

    // 3. 执行冲突检测（传入 excludeId: id，避免和自己冲突）
    const conflict = await this.checkConflict(checkData, input.id)
    if (conflict) throw new Error('更新失败：该时段已有其他排课')

    // 4. 执行更新
    await prisma.schedule.update({
      where: { id: input.id },
      data: input.data,
    })
    return { id: input.id }
  }
  async delete(input: IdInput): Promise<IdResponse> {
    // 按照文档建议，如果之后要做逻辑删除可以在这改，目前先物理删除
    await prisma.schedule.delete({
      where: { id: input.id },
    })
    return { id: input.id }
  }
}
