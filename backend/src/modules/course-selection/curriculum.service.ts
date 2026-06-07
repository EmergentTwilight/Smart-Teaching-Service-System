import type {
  CurriculumPayload,
  CurriculumProgress,
  CurriculumQuery,
  CurriculumProgressQuery,
  CurriculumInfo,
  CurriculumCourseGroup,
  CurriculumConfirmation,
} from './course-selection.types.js'

import {
  toCourseTypeValue,
} from './course-selection.types.js'

import { 
  PrismaClient,
  CourseType,
  CourseStatus
} from '@prisma/client'

const prisma = new PrismaClient()

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
    void studentId
    void query

    // TODO(C1, FR-C-01, FR-C-02, FR-C-03, FR-C-06, NFR-C-13):
    // 由 C1 成员实现学生 major/grade 到 Curriculum 的匹配，以及 CurriculumCourse 分类输出。
    // 负责人骨架不得提前写入未经 C1 review 的 Prisma 查询假设。
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
    if(!student.majorId || !student.major) {
      return '无法找到对应专业'
    }

    const curriculums = await prisma.curriculum.findMany({
      where: {
        majorId: student.majorId,
        year:  student.grade
      }
    })
    if(curriculums.length === 0) {
      return '无法找到对应培养方案'
    }
    if(curriculums.length !== 1) {
      return '对应培养方案不唯一'
    }

    const curriculum = curriculums[0]
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
    let courseGroups: CurriculumCourseGroup[] = []
    if(includeCourses) {
      const where: any = { curriculumId: curriculum.id };
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

    const confirmation: CurriculumConfirmation = {
      requiredBeforeSelection: true,
      confirmed: false,
      message: '请先查看并确认培养方案后再进入正式选课流程'
    }

    const payload: CurriculumPayload = {
      curriculum: info,
      courseGroups: courseGroups,
      confirmation: confirmation
    }
    return payload
  },

  /**
   * 获取当前学生学分进展
   */
  async getMyCurriculumProgress(
    studentId: string,
    query: CurriculumProgressQuery
  ): Promise<CurriculumProgress | null> {
    void studentId
    void query

    // TODO(C1, FR-C-05, NFR-C-07): 由有效 Enrollment 汇总真实学分进度
    // - 读取学生 ENROLLED/非 DROPPED 记录
    // - 按课程类型聚合已选学分
    // - 计算与 Curriculum 目标学分的比例
    // TODO(C1, FR-C-05, NFR-C-12): 进度统计结果与后续选课/退课事务需保持一致
    // 负责人 scaffold 不返回 200 全零进度，避免把未实现误判为真实统计结果。
    return null
  },
}
