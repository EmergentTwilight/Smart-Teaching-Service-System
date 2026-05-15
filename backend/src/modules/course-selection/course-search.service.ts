import type {
  CourseSearchQuery,
  AvailableOfferingsQuery,
  PaginatedItems,
  CourseListItem,
  CourseOfferingItem,
  CourseOfferingDetail,
} from './course-selection.types.js'
import {
  toCourseTypeValue,
  toOfferingStatusValue,
} from './course-selection.types.js'
import prisma from '../../shared/prisma/client.js'
import { NotFoundError } from '@stss/shared'

const emptyPagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}

export const courseSearchService = {
  // TODO(C2, FR-C-08, FR-C-09, FR-C-10, FR-C-12, NFR-C-13): 完整实现课程搜索查询
  // - 支持课程名/教师名/课程代码/学期/课程类型筛选
  // - 分页返回并支持按课程状态、是否可选过滤
  async searchCourses(query: CourseSearchQuery): Promise<PaginatedItems<CourseListItem>> {
    return {
      items: [],
      pagination: {
        ...emptyPagination,
        page: query.page ?? 1,
        pageSize: query.pageSize || 20,
      },
    }
  },

  // TODO(C2, FR-C-08, FR-C-15): 实现开课列表查询并返回容量与状态
  // - 基于 CourseOffering 返回课程容量/已选人数/教师
  // - 与课程状态变更一致，不依赖前端过滤
  async listOfferings(query: CourseSearchQuery): Promise<PaginatedItems<CourseOfferingItem>> {
    return {
      items: [],
      pagination: {
        ...emptyPagination,
        page: query.page ?? 1,
        pageSize: query.pageSize || 20,
      },
    }
  },

  // TODO(C2, C3, FR-C-13, FR-C-15, FR-C-16, FR-C-18, NFR-C-07, NFR-C-08): 返回学生可选课程并标记可选原因
  // - 筛掉不满足培养方案/学生权限的课程
  // - 标识容量、冲突、先修要求、是否可选
  async listAvailableOfferings(
    studentId: string,
    query: AvailableOfferingsQuery
  ): Promise<PaginatedItems<CourseOfferingItem>> {
    return {
      items: [],
      pagination: {
        ...emptyPagination,
        page: query.page ?? 1,
        pageSize: query.pageSize || 20,
      },
    }
  },

  // TODO(C2, C3, FR-C-18, FR-C-19, NFR-C-07):
  // 在详情中补充当前学生的可选性原因，不能绕过容量、课表冲突、培养方案和先修校验。
  async getOfferingDetail(offeringId: string, _studentId: string): Promise<CourseOfferingDetail> {
    const offering = await prisma.courseOffering.findUnique({
      where: {
        id: offeringId,
      },
      include: {
        course: {
          include: {
            prerequisites: {
              include: {
                prerequisite: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        semester: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            user: {
              select: {
                realName: true,
              },
            },
          },
        },
        schedules: {
          include: {
            classroom: {
              select: {
                building: true,
                roomNumber: true,
                campus: true,
              },
            },
          },
        },
      },
    })

    if (!offering) {
      throw new NotFoundError('课程开设', offeringId)
    }

    return {
      id: offering.id,
      courseId: offering.courseId,
      semesterId: offering.semester.id,
      semesterName: offering.semester.name,
      courseName: offering.course.name,
      courseCode: offering.course.code,
      credits: Number(offering.course.credits),
      courseType: toCourseTypeValue(offering.course.courseType),
      teacherId: offering.teacherId,
      teacherName: offering.teacher.user.realName,
      capacity: offering.capacity,
      enrolledCount: offering.enrolledCount,
      offeringStatus: toOfferingStatusValue(offering.status),
      isAvailable:
        offering.status === 'OPEN' &&
        offering.course.status === 'ACTIVE' &&
        offering.enrolledCount < offering.capacity,
      description: offering.course.description ?? undefined,
      assessmentMethod: offering.course.assessmentMethod ?? undefined,
      schedules: offering.schedules.map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek,
        startWeek: schedule.startWeek,
        endWeek: schedule.endWeek,
        startPeriod: schedule.startPeriod,
        endPeriod: schedule.endPeriod,
        classroomName: `${schedule.classroom.campus} ${schedule.classroom.building} ${schedule.classroom.roomNumber}`,
      })),
      prerequisites: offering.course.prerequisites.map((item) => ({
        courseCode: item.prerequisite.code,
        courseName: item.prerequisite.name,
      })),
    }
  },
}
