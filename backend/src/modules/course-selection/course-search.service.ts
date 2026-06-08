import type {
  CourseSearchQuery,
  AvailableOfferingsQuery,
  PaginatedItems,
  CourseListItem,
  CourseOfferingListItem,
  AvailableOfferingItem,
  CourseOfferingDetail,
  PaginationMeta,
} from './course-selection.types.js'

import {
  toCourseTypeValue,
  toCourseStatusValue,
} from './course-selection.types.js'

import { 
  PrismaClient,
  CourseType,
  CourseStatus
} from '@prisma/client'

const prisma = new PrismaClient()

export const courseSearchService = {
  // TODO(C2, FR-C-08, FR-C-09, FR-C-10, FR-C-12, NFR-C-13): 完整实现课程搜索查询
  // - 支持课程名/教师名/课程代码/学期/课程类型筛选
  // - 分页返回并支持按课程状态、是否可选过滤
  // - 负责人 scaffold 不返回 200 空列表，避免把未实现误判为无数据
  async searchCourses(query: CourseSearchQuery): Promise<PaginatedItems<CourseListItem> | string> {
    void query

    const keyword = query.keyword ?? undefined
    const teacher = query.teacher ?? undefined
    const teacherId = query.teacherId ?? query.teacher_id ?? undefined
    const courseType = query.courseType ?? query.course_type ?? undefined
    const status = query.status ?? 'active'
    let page = query.page ?? 1
    page = Math.max(page, 1)
    let pageSize = query.pageSize ?? 20
    pageSize = Math.min(pageSize, 100)

    const where: any = {}
    if(keyword) {
      where.course =  {
        OR: [
          { code: { contains: keyword, mode: 'insensitive' } },
          { name: { contains: keyword, mode: 'insensitive' } }
        ]
      }
    }
    else {
      where.course = {}
    }
    if(teacherId) {
      where.teacherId = teacherId
    }
    if(teacher) {
      where.teacher = {
        OR: [
          { userId: { contains: teacher, mode: 'insensitive' } },
          {
            user: { realname: { contains: teacher, mode: 'insensitive' } }
          }
        ]
      }
    }
    if(courseType === 'required') {
      where.course.courseType = CourseType.REQUIRED
    }
    if(courseType === 'elective') {
      where.course.courseType = CourseType.ELECTIVE
    }
    if(courseType === 'general') {
      where.course.courseType = CourseType.GENERAL
    }
    if(status === 'active') {
      where.course.status = CourseStatus.ACTIVE
    }
    else {
      where.course.status = CourseStatus.ARCHIVED
    }
    const courseOfferings = await prisma.courseOffering.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { courseId: 'asc' },
      where,
      include: {
        course: true,
        semester: true
      },
    })

    let courses: CourseListItem[] = []
    for(const courseOffering of courseOfferings) {
      courses.push({
        courseId: courseOffering.courseId,
        courseCode: courseOffering.course.code,
        courseName: courseOffering.course.name,
        credits: Number(courseOffering.course.credits),
        courseType: toCourseTypeValue(courseOffering.course.courseType),
        category: courseOffering.course.category ?? null,
        assessmentMethod: courseOffering.course.assessmentMethod ?? null,
        status: toCourseStatusValue(courseOffering.status),
        offeringSummary: {
          openCount: Number(courseOffering.capacity),
          plannedCount: Number(courseOffering.enrolledCount),
          latestSemesterName: courseOffering.semester ? courseOffering.semester.name : null
        }
      })
    }

    const total = await prisma.courseOffering.count({
      where
    })
    const pagination: PaginationMeta = {
      page: page,
      pageSize: pageSize,
      total: total,
      totalPages: Math.ceil(total / pageSize)
    }

    const result: PaginatedItems<CourseListItem> = {
      items: courses,
      pagination: pagination
    }
    return result
  },

  // TODO(C2, FR-C-08, FR-C-15): 实现开课列表查询并返回容量与状态
  // - 基于 CourseOffering 返回课程容量/已选人数/教师
  // - 与课程状态变更一致，不依赖前端过滤
  // - 负责人 scaffold 不返回 200 空列表，避免把未实现误判为无数据
  async listOfferings(query: CourseSearchQuery): Promise<PaginatedItems<CourseOfferingListItem> | null> {
    void query
    return null
  },

  // TODO(C2, C3, FR-C-13, FR-C-15, FR-C-16, FR-C-18, NFR-C-07, NFR-C-08): 返回学生可选课程并标记可选原因
  // - 筛掉不满足培养方案/学生权限的课程
  // - 标识容量、冲突、先修要求、是否可选
  async listAvailableOfferings(
    studentId: string,
    query: AvailableOfferingsQuery
  ): Promise<PaginatedItems<AvailableOfferingItem> | null> {
    void studentId
    void query
    return null
  },

  // TODO(C2, C3, FR-C-18, FR-C-19, NFR-C-07):
  // 在详情中补充当前学生的可选性原因，不能绕过容量、课表冲突、培养方案和先修校验。
  // TODO(C2, FR-C-11, FR-C-18, FR-C-19, NFR-C-07):
  // 由 C2 成员按 API 文档返回 course_offering_id 以及 nested course/semester/teacher/eligibility。
  // 负责人骨架不得提前实现 Prisma 详情查询或返回与文档不一致的扁平 DTO。
  async getOfferingDetail(
    offeringId: string,
    requesterUserId: string,
    includeEligibility: boolean
  ): Promise<CourseOfferingDetail | null> {
    void offeringId
    void requesterUserId
    void includeEligibility

    return null
  },
}
