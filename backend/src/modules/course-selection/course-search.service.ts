import type {
  CourseSearchQuery,
  AvailableOfferingsQuery,
  PaginatedItems,
  CourseListItem,
  CourseOfferingListItem,
  AvailableOfferingItem,
  CourseOfferingDetail,
  PaginationMeta,
  CourseEligibilitySnapshot,
} from './course-selection.types.js'

import {
  toCourseTypeValue,
  toCourseStatusValue,
  toOfferingStatusValue
} from './course-selection.types.js'

import { 
  PrismaClient,
  CourseType,
  CourseStatus,
  OfferingStatus,
  EnrollmentStatus
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
      orderBy: { id: 'asc' },
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
  async listOfferings(query: CourseSearchQuery): Promise<PaginatedItems<CourseOfferingListItem> | string> {
    void query

    const semesterId = query.semester_id ?? query.semesterId ?? undefined
    const keyword = query.keyword ?? undefined
    const teacher = query.teacher ?? undefined
    const teacherId = query.teacher_id ?? query.teacherId ?? undefined
    const courseType = query.course_type ?? query.courseType ?? undefined
    const offeringStatus = query.offering_status ?? query.offeringStatus ?? undefined
    const availableOnly = query.available_only ?? query.availableOnly ?? false
    let page = query.page ?? 1
    page = Math.max(page, 1)
    let pageSize = query.pageSize ?? 20
    pageSize = Math.min(pageSize, 100)

    const where: any = {}
    if(semesterId) {
      where.semesterId = semesterId
    }
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
    if(offeringStatus == 'planned') {
      where.status = OfferingStatus.PLANNED
    }
    if(offeringStatus == 'open') {
      where.status = OfferingStatus.OPEN
    }
    if(offeringStatus == 'closed') {
      where.status = OfferingStatus.CLOSED
    }
    if(offeringStatus == 'cancelled') {
      where.status = OfferingStatus.CANCELLED
    }
    if(availableOnly) {
      where.status = OfferingStatus.OPEN
      where.enrolledCount = { lt: where.capacity }//maybe RE
    }
    const courseOfferings = await prisma.courseOffering.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: 'asc' },
      where,
      include: {
        course: true,
        semester: true,
        teacher: {
          include: {
            user: true
          }
        },
        schedules: {
          include: {
            classroom: true
          }
        }
      },
    })

    let courses: CourseOfferingListItem[] = []
    for(const courseOffering of courseOfferings) {
      courses.push({
        courseOfferingId: courseOffering.id,
        course: {
          id: courseOffering.courseId,
          code: courseOffering.course.code,
          name: courseOffering.course.name,
          credits: Number(courseOffering.course.credits),
          courseType: toCourseTypeValue(courseOffering.course.courseType),
        },
        semester: {
          id: courseOffering.semesterId,
          name: courseOffering.semester.name
        },
        teacher: {
          id: courseOffering.teacherId,
          realName: courseOffering.teacher.user.realName,
          teacherNumber: courseOffering.teacher.teacherNumber
        },
        capacity: courseOffering.capacity,
        enrolledCount: courseOffering.enrolledCount,
        remainingCapacity: courseOffering.capacity - courseOffering.enrolledCount,
        status: toOfferingStatusValue(courseOffering.status),
        schedules: []
      })
      for(const schedule of courseOffering.schedules) {
        courses[courses.length - 1].schedules.push({
          id: schedule.id,
          dayOfWeek: schedule.dayOfWeek,
          startWeek: schedule.startWeek,
          endWeek: schedule.endWeek,
          startPeriod: schedule.startPeriod,
          endPeriod: schedule.endPeriod,
          classroom: {
            building: schedule.classroom.building,
            roomNumber: schedule.classroom.roomNumber,
            campus: schedule.classroom.campus,
          },
          notes: schedule.notes ?? null
        })
      }
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

    const result: PaginatedItems<CourseOfferingListItem> = {
      items: courses,
      pagination: pagination
    }
    return result
  },

  // TODO(C2, C3, FR-C-13, FR-C-15, FR-C-16, FR-C-18, NFR-C-07, NFR-C-08): 返回学生可选课程并标记可选原因
  // - 筛掉不满足培养方案/学生权限的课程
  // - 标识容量、冲突、先修要求、是否可选
  async listAvailableOfferings(
    studentId: string,
    query: AvailableOfferingsQuery
  ): Promise<PaginatedItems<AvailableOfferingItem> | string> {
    void studentId
    void query

    const student = await prisma.student.findUnique({
      where: {
        userId: studentId
      },
      include: {
        major: true,
        enrollments: {
          include: {
            courseOffering: {
              include: {
                schedules: true
              }
            }
          }
        }
      }
    })
    if(!student) {
      return '无法找到对应学生'
    }
    if(!student.majorId || !student.major) {
      return '无法找到对应专业'
    }

    const curriculums = await prisma.curriculum.findMany({
      where: {
        majorId: student.majorId,
        year:  student.grade
      },
      include: {
        courses: true
      }
    })
    if(curriculums.length === 0) {
      return '无法找到对应培养方案'
    }
    if(curriculums.length !== 1) {
      return '对应培养方案不唯一'
    }
    const curriculum = curriculums[0]

    let semesterId = query.semester_id ?? query.semesterId ?? undefined;
    const courseType = query.course_type ?? query.courseType ?? undefined;
    const keyword = query.keyword ?? undefined;
    let includeUnavailable = query.include_unavailable ?? query.includeUnavailable ?? true
    let page = query.page ?? 1
    page = Math.max(page, 1)
    let pageSize = query.pageSize ?? 20
    pageSize = Math.min(pageSize, 100)

    const where: any = {}
    if(!semesterId) {
      const now = new Date();
      const currentSemester = await prisma.semester.findMany({
        where: {
          startDate: { lte: now },
          endDate: { gte: now }
        }
      })
      if(currentSemester.length === 0) {
        return '无法找到当前学期'
      }
      if(currentSemester.length !== 1) {
        return '当前学期不唯一'
      }
      semesterId = currentSemester[0].id
    }
    where.semesterId = semesterId
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
    if(courseType === 'required') {
      where.course.courseType = CourseType.REQUIRED
    }
    if(courseType === 'elective') {
      where.course.courseType = CourseType.ELECTIVE
    }
    if(courseType === 'general') {
      where.course.courseType = CourseType.GENERAL
    }
    const courseOfferings = await prisma.courseOffering.findMany({
      orderBy: { id: 'asc' },
      where,
      include: {
        schedules: true,
        course: {
          include: {
            prerequisites: {
              include: {
                prerequisite: true
              }
            }
          }
        },
        teacher: {
          include: {
            user: true
          }
        }
      },
    })

    let courses: AvailableOfferingItem[] = []
    let total = 0
    for(const courseOffering of courseOfferings) {
      let isEnrolled: boolean = false, hasTimeConflict: boolean = false, prerequisiteSatisfied: boolean = true, withinCurriculum: boolean = false
      const isFull = courseOffering.capacity <= courseOffering.enrolledCount
      for(const enrollment of student.enrollments) {
        if(enrollment.status != EnrollmentStatus.ENROLLED) {
          continue
        }
        if(enrollment.courseOfferingId == courseOffering.id) {
          isEnrolled = true
          continue
        }
        if(enrollment.courseOffering.semesterId != courseOffering.semesterId) {
          continue
        }
        for(const s1 of enrollment.courseOffering.schedules) {
          for(const s2 of courseOffering.schedules) {
            if(s1.dayOfWeek != s2.dayOfWeek) {
              continue
            }
            if(s1.startWeek > s2.endWeek || s2.startWeek > s1.endWeek) {
              continue
            }
            if(s1.startPeriod > s2.endPeriod || s2.startPeriod > s1.endPeriod) {
              continue
            }
            hasTimeConflict = true
            break
          }
          if(hasTimeConflict) {
            break
          }
        }
      }
      for(const prerequisites of courseOffering.course.prerequisites) {
        let x = false
        for(const enrollment of student.enrollments) {
          if(enrollment.status != EnrollmentStatus.ENROLLED) {
            continue
          }
          if(prerequisites.prerequisite.id == enrollment.courseOffering.courseId) {
            x = true
            break
          }
        }
        if(!x) {
          prerequisiteSatisfied = false
          break
        }
      }
      for(const course of curriculum.courses) {
        if(course.courseId == courseOffering.course.id) {
          withinCurriculum = true
          break
        }
      }
      const isAvailable = !isEnrolled && !isFull && !hasTimeConflict && prerequisiteSatisfied && withinCurriculum
      if(!isAvailable && !includeUnavailable) {
        continue
      }
      ++total
      courses.push({
        courseOfferingId: courseOffering.id,
        courseCode: courseOffering.course.code,
        courseName: courseOffering.course.name,
        credits: Number(courseOffering.course.credits),
        courseType: toCourseTypeValue(courseOffering.course.courseType),
        teacherName: courseOffering.teacher.user.realName,
        capacity: courseOffering.capacity,
        enrolledCount: courseOffering.enrolledCount,
        remainingCapacity: courseOffering.capacity - courseOffering.enrolledCount,
        status: toOfferingStatusValue(courseOffering.status),
        eligibility: {
          isAvailable: isAvailable,
          isEnrolled: isEnrolled,
          isFull: isFull,
          hasTimeConflict: hasTimeConflict,
          prerequisiteSatisfied: prerequisiteSatisfied,
          withinCurriculum: withinCurriculum,
          reasons: []
        }
      })
      if(isEnrolled) {
        courses[courses.length - 1].eligibility.reasons.push('课程已选')
      }
      if(isFull) {
        courses[courses.length - 1].eligibility.reasons.push('课程已满')
      }
      if(hasTimeConflict) {
        courses[courses.length - 1].eligibility.reasons.push('课程有时间冲突')
      }
      if(!prerequisiteSatisfied) {
        courses[courses.length - 1].eligibility.reasons.push('课程先修条件不满足')
      }
      if(!withinCurriculum) {
        courses[courses.length - 1].eligibility.reasons.push('课程不在培养方案中')
      }
    }

    const pagination: PaginationMeta = {
      page: page,
      pageSize: pageSize,
      total: total,
      totalPages: Math.ceil(total / pageSize)
    }

    const result: PaginatedItems<AvailableOfferingItem> = {
      items: courses.slice((page - 1) * pageSize, page * pageSize),
      pagination: pagination
    }
    return result
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
  ): Promise<CourseOfferingDetail | string> {
    void offeringId
    void requesterUserId
    void includeEligibility

    const user = await prisma.user.findUnique({
      where: {
        id: requesterUserId
      },
      include: {
        student: true,
        teacher: true,
        admin: true
      }
    })
    if(!user) {
      return '无法找到对应用户'
    }
    if(!user.student && !user.teacher && !user.admin) {
      return '该用户没有身份'
    }

    const offering = await prisma.courseOffering.findUnique({
      where: {
        id: offeringId
      },
      include: {
        course: {
          include: {
            prerequisites: {
              include: {
                prerequisite: true
              }
            }
          }
        },
        semester: true,
        teacher: {
          include: {
            user: true
          }
        },
        schedules: {
          include: {
            classroom: true
          }
        }
      }
    })
    if(!offering) {
      return '无法找到对应课程开设'
    }

    let result: CourseOfferingDetail = {
      courseOfferingId: offeringId,
      course: {
        id: offering.courseId,
        code: offering.course.code,
        name: offering.course.name,
        credits: Number(offering.course.credits),
        courseType: toCourseTypeValue(offering.course.courseType),
        category: offering.course.category ?? null,
        description: offering.course.description ?? null,
        assessmentMethod: offering.course.assessmentMethod ?? null,
        status: toCourseStatusValue(offering.course.status)
      },
      semester: {
        id: offering.semesterId,
        name: offering.semester.name
      },
      teacher: {
        id: offering.teacherId,
        realName: offering.teacher.user.realName,
        teacherNumber: offering.teacher.teacherNumber,
        title: offering.teacher.title ?? null
      },
      capacity: offering.capacity,
      enrolledCount: offering.enrolledCount,
      remainingCapacity: offering.capacity - offering.enrolledCount,
      status: toOfferingStatusValue(offering.status),
      prerequisites: new Array<{
        courseId?: string
        courseCode: string
        courseName: string
      }>,
      schedules: []
    }
    for(const course of offering.course.prerequisites) {
      result.prerequisites.push({
        courseId: course.prerequisite.id,
        courseCode: course.prerequisite.code,
        courseName: course.prerequisite.name
      })
    }
    for(const schedule of offering.schedules) {
      result.schedules.push({
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        startWeek: schedule.startWeek,
        endWeek: schedule.endWeek,
        startPeriod: schedule.startPeriod,
        endPeriod: schedule.endPeriod,
        classroom: {
          building: schedule.classroom.building,
          roomNumber: schedule.classroom.roomNumber,
          campus: schedule.classroom.campus,
        },
        notes: schedule.notes ?? null
      })
    }
    if(!user.student || !includeEligibility) {
      return result
    }

    const student = await prisma.student.findUnique({
      where: {
        userId: requesterUserId
      },
      include: {
        major: true,
        enrollments: {
          include: {
            courseOffering: {
              include: {
                schedules: true
              }
            }
          }
        }
      }
    })
    if(!student) {
      return '无法找到对应学生'
    }
    if(!student.majorId || !student.major) {
      return '无法找到对应专业'
    }

    const curriculums = await prisma.curriculum.findMany({
      where: {
        majorId: student.majorId,
        year:  student.grade
      },
      include: {
        courses: true
      }
    })
    if(curriculums.length === 0) {
      return '无法找到对应培养方案'
    }
    if(curriculums.length !== 1) {
      return '对应培养方案不唯一'
    }
    const curriculum = curriculums[0]
    
    let isEnrolled: boolean = false, hasTimeConflict: boolean = false, prerequisiteSatisfied: boolean = true, withinCurriculum: boolean = false
    const isFull = offering.capacity <= offering.enrolledCount
    for(const enrollment of student.enrollments) {
      if(enrollment.status != EnrollmentStatus.ENROLLED) {
        continue
      }
      if(enrollment.courseOfferingId == offering.id) {
        isEnrolled = true
        continue
      }
      if(enrollment.courseOffering.semesterId != offering.semesterId) {
        continue
      }
      for(const s1 of enrollment.courseOffering.schedules) {
        for(const s2 of offering.schedules) {
          if(s1.dayOfWeek != s2.dayOfWeek) {
            continue
          }
          if(s1.startWeek > s2.endWeek || s2.startWeek > s1.endWeek) {
            continue
          }
          if(s1.startPeriod > s2.endPeriod || s2.startPeriod > s1.endPeriod) {
            continue
          }
          hasTimeConflict = true
          break
        }
        if(hasTimeConflict) {
          break
        }
      }
    }
    for(const prerequisites of offering.course.prerequisites) {
      let x = false
      for(const enrollment of student.enrollments) {
        if(enrollment.status != EnrollmentStatus.ENROLLED) {
          continue
        }
        if(prerequisites.prerequisite.id == enrollment.courseOffering.courseId) {
          x = true
          break
        }
      }
      if(!x) {
        prerequisiteSatisfied = false
        break
      }
    }
    for(const course of curriculum.courses) {
      if(course.courseId == offering.course.id) {
        withinCurriculum = true
        break
      }
    }
    const isAvailable = !isEnrolled && !isFull && !hasTimeConflict && prerequisiteSatisfied && withinCurriculum
    let eligibility: CourseEligibilitySnapshot = {
      isAvailable: isAvailable,
      isEnrolled: isEnrolled,
      isFull: isFull,
      hasTimeConflict: hasTimeConflict,
      prerequisiteSatisfied: prerequisiteSatisfied,
      withinCurriculum: withinCurriculum,
      reasons: []
    }
    if(isEnrolled) {
      eligibility.reasons.push('课程已选')
    }
    if(isFull) {
      eligibility.reasons.push('课程已满')
    }
    if(hasTimeConflict) {
      eligibility.reasons.push('课程有时间冲突')
    }
    if(!prerequisiteSatisfied) {
      eligibility.reasons.push('课程先修条件不满足')
    }
    if(!withinCurriculum) {
      eligibility.reasons.push('课程不在培养方案中')
    }
    result.eligibility = {
      isAvailable: isAvailable,
      reasons: eligibility.reasons
    }
    return result
  },
}
