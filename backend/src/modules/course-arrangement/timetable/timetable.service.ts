import { Prisma } from '@prisma/client'
import prisma from '../../../shared/prisma/client.js'
import { adaptToSchedule, scheduleInclude } from '../schedule/schedule.service.js'
import {
  ExportTimetableInput,
  GetByClassroomInput,
  GetByCourseOfferingInput,
  PagedGetTimetablesInput,
  PagedTimetableListResponse,
  TimetableListResponse,
  ExportResponse,
} from './timetable.types.js'

export class TimetableService {
  // 6.3.1 按课程开设查询 (包含课程和教师信息)
  async getByCourseOffering(input: GetByCourseOfferingInput): Promise<TimetableListResponse> {
    const schedules = await prisma.schedule.findMany({
      where: { courseOfferingId: input.courseOfferingId },
      include: scheduleInclude,
      orderBy: [{ startWeek: 'asc' }, { dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
    })
    return schedules.map(adaptToSchedule)
  }

  // 6.3.2 按教室查询 (过滤学期)
  async getByClassroom(input: GetByClassroomInput): Promise<TimetableListResponse> {
    const schedules = await prisma.schedule.findMany({
      where: {
        classroomId: input.classroomId,
        courseOffering: input.query.semesterId ? { semesterId: input.query.semesterId } : {},
      },
      include: scheduleInclude,
      orderBy: [{ startWeek: 'asc' }, { dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
    })
    return schedules.map(adaptToSchedule)
  }

  // 6.3.3 综合查询 (处理分页、学期过滤、多维度筛选)
  async getTimetables(input: PagedGetTimetablesInput): Promise<PagedTimetableListResponse> {
    const skip = (input.query.page - 1) * input.query.pageSize
    const take = input.query.pageSize

    // 核心过滤器
    const where: Prisma.ScheduleWhereInput = {
      courseOffering: { semesterId: input.query.semesterId },
    }

    if (input.query.classroomId) where.classroomId = input.query.classroomId
    if (input.query.courseOfferingId) where.courseOfferingId = input.query.courseOfferingId

    // --- 权限过滤逻辑 ---
    // 如果是学生，强制限制只能查询自己选过的课程排课
    if ('student' in input.user.roles) {
      where.courseOffering!.enrollments = {
        some: {
          studentId: input.user.userId,
          status: 'ENROLLED',
        },
      }
    }
    // 如果是教师，可以看自己教的课（可选逻辑）
    else if ('teacher' in input.user.roles) {
      // 如果 query 没指定，默认看自己教的
      if (!input.query.courseOfferingId && !input.query.classroomId) {
        where.courseOffering!.teacherId = input.user.userId
      }
    }
    // 如果是管理员，那么就没有限制

    const [raw_items, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        skip,
        take,
        include: scheduleInclude,
        orderBy: [{ startWeek: 'asc' }, { dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
      }),
      prisma.schedule.count({ where }),
    ])
    const items = raw_items.map(adaptToSchedule)
    console.log('here')
    return { items, total, page: input.query.page, pageSize: input.query.pageSize }
  }

  // 6.3.4 导出逻辑 (核心数据抓取)
  async getExportData(input: ExportTimetableInput): Promise<ExportResponse> {
    const where: Prisma.ScheduleWhereInput = {
      courseOffering: { semesterId: input.semesterId },
    }

    // 根据维度注入过滤条件
    if (input.targetType === 'classroom') {
      where.classroomId = input.targetId
    } else if (input.targetType === 'teacher') {
      where.courseOffering!.teacherId = input.targetId
    } else if (input.targetType === 'student') {
      // 这里的逻辑：查该学生 Enrollment 里的所有 CourseOffering 的 Schedule
      where.courseOffering!.enrollments = {
        some: { studentId: input.targetId },
      }
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: scheduleInclude,
      orderBy: [{ dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
    })

    // 生成简单的 CSV 字符串 (实际项目可用 exceljs)
    let csvContent = '\uFEFF周次,星期,节次,课程,教室\n'
    schedules.forEach((s) => {
      const courseName = s.courseOffering.course.name
      const teacherName = s.courseOffering.teacher.user.realName || '未指定'
      const location = `${s.classroom.building}${s.classroom.roomNumber}`

      csvContent += `${s.startWeek}-${s.endWeek},${s.dayOfWeek},${s.startPeriod}-${s.endPeriod},${courseName},${teacherName},${location}\n`
    })

    const filename = `timetable_${input.targetType}_${Date.now()}.csv`
    return { filename, content: csvContent }
  }
}
