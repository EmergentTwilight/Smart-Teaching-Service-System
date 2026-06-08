/**
 * C4：按学期展开已选课程的排课时段；无排课记录写入 missingScheduleItems。
 */
import { EnrollmentStatus } from '@prisma/client'
import type { TimetablePayload, TimetableQuery } from './course-selection.types.js'
import {
  decimalToNumber,
  formatClassroomLabel,
  resolveSemesterId,
} from './course-selection.support.js'
import prisma from '../../shared/prisma/client.js'

export const timetableService = {
  async getMyTimetable(studentId: string, query: TimetableQuery): Promise<TimetablePayload> {
    const semester = await resolveSemesterId(query.semesterId)
    void query.format

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: EnrollmentStatus.ENROLLED,
        courseOffering: { semesterId: semester.id },
      },
      include: {
        courseOffering: {
          include: {
            course: {
              select: {
                code: true,
                name: true,
                credits: true,
              },
            },
            teacher: {
              select: {
                user: { select: { realName: true } },
              },
            },
            schedules: {
              include: {
                classroom: {
                  select: {
                    campus: true,
                    building: true,
                    roomNumber: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'asc' },
    })

    const items: TimetablePayload['items'] = []
    const missingScheduleItems: TimetablePayload['missingScheduleItems'] = []
    const seenMissingOfferings = new Set<string>()

    for (const enrollment of enrollments) {
      const offering = enrollment.courseOffering
      if (offering.schedules.length === 0) {
        if (!seenMissingOfferings.has(offering.id)) {
          seenMissingOfferings.add(offering.id)
          missingScheduleItems.push({
            courseOfferingId: offering.id,
            courseName: offering.course.name,
            message: '该课程暂无排课信息',
          })
        }
        continue
      }

      for (const schedule of offering.schedules) {
        items.push({
          enrollmentId: enrollment.id,
          courseOfferingId: offering.id,
          courseCode: offering.course.code,
          courseName: offering.course.name,
          teacherName: offering.teacher.user.realName,
          credits: decimalToNumber(offering.course.credits),
          dayOfWeek: schedule.dayOfWeek,
          startWeek: schedule.startWeek,
          endWeek: schedule.endWeek,
          startPeriod: schedule.startPeriod,
          endPeriod: schedule.endPeriod,
          classroom: formatClassroomLabel(schedule),
        })
      }
    }

    return {
      semester,
      printable: true,
      items,
      missingScheduleItems,
    }
  },
}
