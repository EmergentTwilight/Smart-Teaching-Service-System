import prisma from '../../../shared/prisma/client.js'

export class TimetableService {
  // 6.3.1 按课程开设查询
  async getByCourseOffering(courseOfferingId: string) {
    return await prisma.schedule.findMany({
      where: { courseOfferingId },
      include: {
        classroom: true,
        // courseOffering: true // 包含课程基础信息
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
    })
  }

  // 6.3.2 按教室查询
  async getByClassroom(classroomId: string) {
    return await prisma.schedule.findMany({
      where: { classroomId },
      include: {
        classroom: true,
        // courseOffering: true
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
    })
  }

  // 6.3.3 按学期/综合条件查询
  async getTimetables(query: any) {
    const { classroomId, courseOfferingId, dayOfWeek } = query

    // 构建动态过滤条件
    const where: any = {}
    if (classroomId) where.classroomId = classroomId
    if (courseOfferingId) where.courseOfferingId = courseOfferingId
    if (dayOfWeek) where.dayOfWeek = Number(dayOfWeek)

    // 实际项目中，这里通常还会关联 Semester 表，目前按基础字段过滤
    return await prisma.schedule.findMany({
      where,
      include: {
        classroom: true,
        // courseOffering: true
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
    })
  }
}
