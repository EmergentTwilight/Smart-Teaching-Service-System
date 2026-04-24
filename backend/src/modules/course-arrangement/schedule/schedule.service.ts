import prisma from '../../../shared/prisma/client.js'
import { CreateScheduleDTO } from './schedule.schemas.js'

export class ScheduleService {
  /**
   * 检测时间冲突
   * 返回值：如果有冲突返回冲突记录，没冲突返回 null
   */
  async checkConflict(data: CreateScheduleDTO, excludeId?: string) {
    return await prisma.schedule.findFirst({
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

  async create(data: CreateScheduleDTO) {
    // 1. 检查教室是否存在且可用
    const classroom = await prisma.classroom.findUnique({
      where: { id: data.classroomId },
    })
    if (!classroom || classroom.status !== 'AVAILABLE') {
      throw new Error('教室不存在或当前不可用')
    }

    // 2. 检查时间冲突
    const conflict = await this.checkConflict(data)
    if (conflict) {
      throw new Error('排课冲突：该教室内已有课程安排')
    }

    // 3. 写入排课
    return await prisma.schedule.create({ data })
  }
  async validate(data: CreateScheduleDTO) {
    const conflict = await this.checkConflict(data)
    if (conflict) {
      return {
        valid: false,
        conflicts: [{ type: 'classroom_conflict', message: '教室在该时间段已被占用' }],
      }
    }
    return { valid: true, conflicts: [] }
  }
  async findAll(query: any) {
    const { page = 1, pageSize = 20, classroomId, courseOfferingId } = query
    const where: any = {}
    if (classroomId) where.classroomId = classroomId
    if (courseOfferingId) where.courseOfferingId = courseOfferingId

    const [total, items] = await Promise.all([
      prisma.schedule.count({ where }),
      prisma.schedule.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        include: {
          classroom: { select: { building: true, roomNumber: true, campus: true, } },
          courseOffering: {
            include: {
              course: { select: { id: true, name: true, code: true } },
              teacher: { include: { user: { select: { realName: true } } } }
            }
          }
        }
      }),
    ])
    return { total, page: Number(page), pageSize: Number(pageSize), items }
  }
  async findById(id: string) {
    return await prisma.schedule.findUnique({
      where: { id },
      include: { classroom: true },
    })
  }
  async update(id: string, data: Partial<CreateScheduleDTO>) {
    // 1. 先查出原记录，获取当前信息
    const current = await prisma.schedule.findUnique({ where: { id } })
    if (!current) throw new Error('未找到排课记录')

    // 2. 构造完整的待校验数据（用新数据覆盖旧数据）
    const checkData: any = { ...current, ...data }

    // 3. 执行冲突检测（传入 excludeId: id，避免和自己冲突）
    const conflict = await this.checkConflict(checkData, id)
    if (conflict) throw new Error('更新失败：该时段已有其他排课')

    // 4. 执行更新
    return await prisma.schedule.update({
      where: { id },
      data,
    })
  }
  async delete(id: string) {
    // 按照文档建议，如果之后要做逻辑删除可以在这改，目前先物理删除
    return await prisma.schedule.delete({
      where: { id },
    })
  }
}
