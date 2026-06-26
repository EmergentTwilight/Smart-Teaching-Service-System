/**
 * C4：按学期展开已选课程的排课时段；无排课记录写入 missingScheduleItems。
 */
import { EnrollmentStatus } from '@prisma/client'
import type {
  TimetablePayload,
  TimetableQuery,
  TimetableSemesterItem,
  TimetableSemesterListPayload,
} from './course-selection.types.js'
import {
  decimalToNumber,
  formatClassroomLabel,
  resolveSemesterId,
} from './course-selection.support.js'
import prisma from '../../shared/prisma/client.js'
import { SUBMITTED_SCORE_STATUSES } from '../score-management/score-statistics.js'

export const timetableService = {
  async listMyTimetableSemesters(studentId: string): Promise<TimetableSemesterListPayload> {
    const defaultSemester = await resolveSemesterId()
    const semesters = await prisma.semester.findMany({
      where: {
        OR: [
          { id: defaultSemester.id },
          {
            courseOfferings: {
              some: {
                OR: [
                  {
                    enrollments: {
                      some: { studentId },
                    },
                  },
                  {
                    scores: {
                      some: {
                        studentId,
                        status: {
                          in: [...SUBMITTED_SCORE_STATUSES],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
      },
      orderBy: [
        { startDate: 'desc' },
        { name: 'desc' },
      ],
    })

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: EnrollmentStatus.ENROLLED,
        courseOffering: {
          semesterId: {
            in: semesters.map((semester) => semester.id),
          },
        },
      },
      select: {
        courseOffering: {
          select: {
            semesterId: true,
            schedules: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    })

    const stats = new Map<string, {
      enrolledCount: number
      scheduledItemCount: number
      missingScheduleCount: number
    }>()

    for(const semester of semesters) {
      stats.set(semester.id, {
        enrolledCount: 0,
        scheduledItemCount: 0,
        missingScheduleCount: 0,
      })
    }

    for(const enrollment of enrollments) {
      const semesterId = enrollment.courseOffering.semesterId
      const semesterStats = stats.get(semesterId)
      if(!semesterStats) {
        continue
      }

      semesterStats.enrolledCount += 1
      const scheduleCount = enrollment.courseOffering.schedules.length
      if(scheduleCount > 0) {
        semesterStats.scheduledItemCount += scheduleCount
      }
      else {
        semesterStats.missingScheduleCount += 1
      }
    }

    const items: TimetableSemesterItem[] = semesters.map((semester) => {
      const semesterStats = stats.get(semester.id) ?? {
        enrolledCount: 0,
        scheduledItemCount: 0,
        missingScheduleCount: 0,
      }

      return {
        id: semester.id,
        name: semester.name,
        status: semester.status.toLowerCase() as TimetableSemesterItem['status'],
        startDate: semester.startDate.toISOString(),
        endDate: semester.endDate.toISOString(),
        isCurrent: semester.status === 'CURRENT',
        isDefault: semester.id === defaultSemester.id,
        ...semesterStats,
      }
    })

    return {
      items,
      defaultSemesterId: defaultSemester.id,
    }
  },

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
