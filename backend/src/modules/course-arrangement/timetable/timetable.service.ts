import prisma from '../../../shared/prisma/client.js'

export class TimetableService {
  // 6.3.1 按课程开设查询 (包含课程和教师信息)
  async getByCourseOffering(courseOfferingId: string) {
    return await prisma.schedule.findMany({
      where: { courseOfferingId },
      include: {
        classroom: true,
        courseOffering: {
          include: {
            course: true,
            teacher: { include: { user: true } },
          },
        },
      },
      orderBy: [{ startWeek: 'asc' }, { dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
    })
  }

  // 6.3.2 按教室查询 (过滤学期)
  async getByClassroom(classroomId: string, semesterId?: string) {
    return await prisma.schedule.findMany({
      where: {
        classroomId,
        courseOffering: semesterId ? { semesterId } : {},
      },
      include: {
        courseOffering: { include: { course: true } },
      },
      orderBy: [{ startWeek: 'asc' }, { dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
    })
  }

  // 6.3.3 综合查询 (处理分页、学期过滤、多维度筛选)
  async getTimetables(query: any, userInfo: { id: string; role: string }) {
    const { page = 1, pageSize = 10, semesterId, classroomId, courseOfferingId } = query
    const skip = (Number(page) - 1) * Number(pageSize)
    const take = Number(pageSize)

    // 核心过滤器
    const where: any = {
      courseOffering: semesterId ? { semesterId } : {},
    }

    if (classroomId) where.classroomId = classroomId
    if (courseOfferingId) where.courseOfferingId = courseOfferingId

    // --- 权限过滤逻辑 ---
    // 如果是学生，强制限制只能查询自己选过的课程排课
    if (userInfo.role === 'student') {
      where.courseOffering.enrollments = {
        some: {
          studentId: userInfo.id,
          status: 'enrolled',
        },
      }
    }
    // 如果是教师，可以看自己教的课（可选逻辑）
    else if (userInfo.role === 'teacher') {
      // 如果 query 没指定，默认看自己教的
      if (!courseOfferingId && !classroomId) {
        where.courseOffering.teacherId = userInfo.id
      }
    }

    const [items, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        skip,
        take,
        include: {
          classroom: true,
          courseOffering: {
            include: { course: true, teacher: { include: { user: true } } },
          },
        },
        orderBy: [{ startWeek: 'asc' }, { dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
      }),
      prisma.schedule.count({ where }),
    ])

    return { items, total, page, pageSize }
  }

  // 6.3.4 导出逻辑 (核心数据抓取)
  async getExportData(query: any) {
    const { semesterId, targetType, targetId } = query

    const where: any = {
      courseOffering: { semesterId },
    }

    // 根据维度注入过滤条件
    if (targetType === 'classroom') {
      where.classroomId = targetId
    } else if (targetType === 'teacher') {
      where.courseOffering.teacherId = targetId
    } else if (targetType === 'student') {
      // 这里的逻辑：查该学生 Enrollment 里的所有 CourseOffering 的 Schedule
      where.courseOffering.enrollments = {
        some: { studentId: targetId },
      }
    }

    return await prisma.schedule.findMany({
      where,
      include: {
        classroom: true,
        courseOffering: { include: { course: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
    })
  }
}
