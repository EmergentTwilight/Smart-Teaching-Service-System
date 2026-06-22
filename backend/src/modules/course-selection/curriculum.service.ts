import type {
  CurriculumPayload,
  CurriculumConfirmationBody,
  CurriculumConfirmationPayload,
  CurriculumProgress,
  CurriculumQuery,
  CurriculumProgressQuery,
  CurriculumInfo,
  CurriculumCourseGroup,
  CurriculumConfirmation,
  CurriculumCreditSummary,
  CurriculumCourseTypeProgress,
  CurriculumProgressWarning,
} from './course-selection.types.js'

import {
  toCourseTypeValue,
} from './course-selection.types.js'
import {
  buildCurriculumConfirmationPayload,
} from './course-selection.support.js'

import {
  CourseType,
  CourseStatus,
  EnrollmentStatus
} from '@prisma/client'
import type { Prisma } from '@prisma/client'
import prisma from '../../shared/prisma/client.js'

const resolveCurrentCurriculumContext = async (studentId: string) => {
  const student = await prisma.student.findUnique({
    where: {
      userId: studentId
    },
    include: {
      major: true
    }
  })
  if(!student) {
    return '无法找到对应学生'
  }
  const majorId = student.majorId
  const major = student.major
  if(!majorId || !major) {
    return '无法找到对应专业'
  }

  const curriculums = await prisma.curriculum.findMany({
    where: {
      majorId,
      year: student.grade
    }
  })
  if(curriculums.length === 0) {
    return '无法找到对应培养方案'
  }
  if(curriculums.length !== 1) {
    return '对应培养方案不唯一'
  }

  return {
    student: {
      ...student,
      majorId,
      major
    },
    curriculum: curriculums[0]
  }
}

/**
 * C1: 培养方案与学分进展服务
 */
export const curriculumService = {
  /**
   * 获取当前学生培养方案
   */
  async getMyCurriculum(
    studentId: string,
    query: CurriculumQuery
  ): Promise<CurriculumPayload | string> {
    void query

    // TODO(C1, FR-C-01, FR-C-02, FR-C-03, FR-C-06, NFR-C-13):
    // 由 C1 成员实现学生 major/grade 到 Curriculum 的匹配，以及 CurriculumCourse 分类输出。
    // 负责人骨架不得提前写入未经 C1 review 的 Prisma 查询假设。
    const context = await resolveCurrentCurriculumContext(studentId)
    if(typeof context === 'string') {
      return context
    }

    const { student, curriculum } = context
    const info: CurriculumInfo = {
      id: curriculum.id,
      name: curriculum.name,
      year: curriculum.year,
      major: {
        id: student.major.id,
        name: student.major.name,
        code: student.major.code ?? ''
      },
      totalCredits: Number(curriculum.totalCredits),
      requiredCredits: curriculum.requiredCredits
        ? Number(curriculum.requiredCredits)
        : undefined,
      electiveCredits: curriculum.electiveCredits
        ? Number(curriculum.electiveCredits)
        : undefined
    }

    const includeCourses =
      query.includeCourses ?? query.include_courses ?? true
    const courseType =
      query.courseType ?? query.course_type ?? undefined
    const courseGroups: CurriculumCourseGroup[] = []
    if(includeCourses) {
      const where: Prisma.CurriculumCourseWhereInput = { curriculumId: curriculum.id };
      if (courseType === 'required') {
        where.courseType = CourseType.REQUIRED
        courseGroups.push({
          courseType: toCourseTypeValue('required'),
          courseTypeName: '专业必修课',
          courses: []
        })
      }
      else if (courseType === 'elective') {
        where.courseType = CourseType.ELECTIVE
        courseGroups.push({
          courseType: toCourseTypeValue('elective'),
          courseTypeName: '专业选修课',
          courses: []
        })
      }
      else if (courseType === 'general') {
        where.courseType = CourseType.GENERAL
        courseGroups.push({
          courseType: toCourseTypeValue('general'),
          courseTypeName: '公共课',
          courses: []
        })
      }
      else {
        courseGroups.push({
          courseType: toCourseTypeValue('required'),
          courseTypeName: '专业必修课',
          courses: []
        })
        courseGroups.push({
          courseType: toCourseTypeValue('elective'),
          courseTypeName: '专业选修课',
          courses: []
        })
        courseGroups.push({
          courseType: toCourseTypeValue('general'),
          courseTypeName: '公共课',
          courses: []
        })
      }
      const courses = await prisma.curriculumCourse.findMany({
        where,
        include: { course: true },
      })
      for(const course of courses) {
        if(!course.course) {
          continue
        }
        const i = courseType ? 0 : course.courseType == CourseType.REQUIRED ? 0 : course.courseType == CourseType.ELECTIVE ? 1 : 2
        courseGroups[i].courses.push({
          courseId: course.course.id,
          courseCode: course.course.code,
          courseName: course.course.name,
          credits: Number(course.course.credits),
          courseType: toCourseTypeValue(course.courseType),
          semesterSuggestion: course.semesterSuggestion ? Number(course.semesterSuggestion) : undefined,
          status: course.course.status == CourseStatus.ACTIVE ? 'active' : 'archived'
        })
      }
    }

    const confirmationRecord = await prisma.studentCurriculumConfirmation.findUnique({
      where: {
        studentId_curriculumId: {
          studentId,
          curriculumId: curriculum.id
        }
      },
      select: {
        confirmedAt: true
      }
    })

    const confirmation: CurriculumConfirmation = buildCurriculumConfirmationPayload(
      confirmationRecord,
      curriculum
    )

    const payload: CurriculumPayload = {
      curriculum: info,
      courseGroups: courseGroups,
      confirmation: confirmation
    }
    return payload
  },

  /**
   * 确认当前学生匹配的培养方案
   */
  async confirmMyCurriculum(
    studentId: string,
    body: CurriculumConfirmationBody
  ): Promise<CurriculumConfirmationPayload | string> {
    const context = await resolveCurrentCurriculumContext(studentId)
    if(typeof context === 'string') {
      return context
    }

    const { curriculum } = context
    if(body.curriculumId !== curriculum.id) {
      return '提交的培养方案与当前学生匹配培养方案不一致'
    }

    const now = new Date()
    const confirmationRecord = await prisma.studentCurriculumConfirmation.upsert({
      where: {
        studentId_curriculumId: {
          studentId,
          curriculumId: curriculum.id
        }
      },
      create: {
        studentId,
        curriculumId: curriculum.id,
        confirmedAt: now
      },
      update: {
        confirmedAt: now
      },
      select: {
        confirmedAt: true
      }
    })

    return {
      confirmation: buildCurriculumConfirmationPayload(confirmationRecord, curriculum)
    }
  },

  /**
   * 获取当前学生学分进展
   */
  async getMyCurriculumProgress(
    studentId: string,
    query: CurriculumProgressQuery
  ): Promise<CurriculumProgress | string> {
    void query

    // TODO(C1, FR-C-05, NFR-C-07): 由有效 Enrollment 汇总真实学分进度
    // - 读取学生 ENROLLED/非 DROPPED 记录
    // - 按课程类型聚合已选学分
    // - 计算与 Curriculum 目标学分的比例
    // TODO(C1, FR-C-05, NFR-C-12): 进度统计结果与后续选课/退课事务需保持一致
    // 负责人 scaffold 不返回 200 全零进度，避免把未实现误判为真实统计结果。
    const context = await resolveCurrentCurriculumContext(studentId)
    if(typeof context === 'string') {
      return context
    }

    const { curriculum } = context
    const requirements: CurriculumCreditSummary = {
      totalCredits: Number(curriculum.totalCredits),
      requiredCredits: Number(curriculum.requiredCredits),
      electiveCredits: Number(curriculum.electiveCredits),
      generalCredits: null
    }

    const semesterId =
      query.semesterId ?? undefined
    let date: Date = new Date()
    if(semesterId) {
      const semester = await prisma.semester.findUnique({
        where: {
          id: semesterId
        }
      })
      if(!semester) {
        return '无法找到对应学期'
      }
      date = semester.endDate
    }

    const includeDropped =
      query.includeDropped ?? query.include_dropped ?? false
    let a: number = 0, b: number = 0, c: number = 0, d: number = 0, x: number = 0, y: number = 0, z: number = 0
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: studentId
      }
    })
    for(const enrollment of enrollments) {
      if(!includeDropped && enrollment.status !== EnrollmentStatus.ENROLLED) {
        continue
      }
      const courseoffering = await prisma.courseOffering.findUnique({
        where: {
          id: enrollment.courseOfferingId
        },
        include: {
          semester: true
        }
      })
      if(!courseoffering || !courseoffering.semester || semesterId && courseoffering.semester.endDate > date) {
        continue
      }
      const course = await prisma.course.findUnique({
        where: {
          id: courseoffering.courseId
        }
      })
      if(!course) {
        continue
      }
      if(enrollment.status === EnrollmentStatus.ENROLLED) a += Number(course.credits)
      if(course.courseType == CourseType.REQUIRED) {
        if(enrollment.status === EnrollmentStatus.ENROLLED) b += Number(course.credits)
        ++x
      }
      if(course.courseType == CourseType.ELECTIVE) {
        if(enrollment.status === EnrollmentStatus.ENROLLED) c += Number(course.credits)
        ++y
      }
      if(course.courseType == CourseType.GENERAL) {
        if(enrollment.status === EnrollmentStatus.ENROLLED) d += Number(course.credits)
        ++z
      }
    }
    const selected: CurriculumCreditSummary = {
      totalCredits: a,
      requiredCredits: b,
      electiveCredits: c,
      generalCredits: d
    }

    const remaining: Partial<CurriculumCreditSummary> = {}
    if(a < requirements.totalCredits) {
      remaining.totalCredits = requirements.totalCredits - a
    }
    if(b < requirements.requiredCredits) {
      remaining.requiredCredits = requirements.requiredCredits - b
    }
    if(c < requirements.electiveCredits) {
      remaining.electiveCredits = requirements.electiveCredits - c
    }

    const byCourseType: CurriculumCourseTypeProgress[] = [
      {
        courseType: toCourseTypeValue('required'),
        selectedCredits: b,
        requirementCredits: requirements.requiredCredits,
        courseCount: x
      },
      {
        courseType: toCourseTypeValue('elective'),
        selectedCredits: c,
        requirementCredits: requirements.electiveCredits,
        courseCount: y
      },
      {
        courseType: toCourseTypeValue('general'),
        selectedCredits: d,
        requirementCredits: requirements.generalCredits,
        courseCount: z
      }
    ]

    const warnings: CurriculumProgressWarning[] = [{
      code: 'GENERAL_REQUIREMENT_NOT_MODELED',
      message: '数据库设计暂未提供公共课最低学分字段，仅返回已选公共课学分'
    }]

    const progress: CurriculumProgress = {
      curriculumId: curriculum.id,
      requirements: requirements,
      selected: selected,
      remaining: remaining,
      byCourseType: byCourseType,
      warnings: warnings
    }
    return progress
  },
}
