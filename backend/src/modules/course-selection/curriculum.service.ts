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
  StudyStatusValue,
} from './course-selection.types.js'

import {
  toCourseTypeValue,
} from './course-selection.types.js'
import {
  buildCurriculumConfirmationPayload,
  resolveSemesterId,
} from './course-selection.support.js'

import {
  CourseType,
  CourseStatus,
  EnrollmentStatus,
  SemesterStatus,
} from '@prisma/client'
import type { Prisma } from '@prisma/client'
import prisma from '../../shared/prisma/client.js'
import {
  PASS_LINE,
  SUBMITTED_SCORE_STATUSES,
  pickEffectiveScoresByCourse,
  toNumber,
} from '../score-management/score-statistics.js'

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

type ProgressSummary = CurriculumCreditSummary

const emptyProgressSummary = (): ProgressSummary => ({
  totalCredits: 0,
  requiredCredits: 0,
  electiveCredits: 0,
  generalCredits: 0,
})

const addCourseToSummary = (
  summary: ProgressSummary,
  course: { credits: unknown; courseType: CourseType }
) => {
  const credits = Number(course.credits)
  summary.totalCredits += credits

  if(course.courseType == CourseType.REQUIRED) {
    summary.requiredCredits += credits
  }
  if(course.courseType == CourseType.ELECTIVE) {
    summary.electiveCredits += credits
  }
  if(course.courseType == CourseType.GENERAL) {
    summary.generalCredits = (summary.generalCredits ?? 0) + credits
  }
}

const loadCompletedCourseIds = async (studentId: string): Promise<Set<string>> => {
  const scores = await prisma.score.findMany({
    where: {
      studentId,
      status: {
        in: [...SUBMITTED_SCORE_STATUSES],
      },
    },
    include: {
      courseOffering: {
        include: {
          course: true,
        },
      },
    },
  })

  const completedCourseIds = new Set<string>()
  for(const score of pickEffectiveScoresByCourse(scores)) {
    const totalScore = toNumber(score.totalScore)
    if(totalScore !== null && totalScore >= PASS_LINE) {
      completedCourseIds.add(score.courseOffering.course.id)
    }
  }
  return completedCourseIds
}

const loadCurrentInProgressCourseIds = async (
  studentId: string,
  completedCourseIds: Set<string>
): Promise<Set<string>> => {
  let semesterId: string | undefined
  try {
    semesterId = (await resolveSemesterId()).id
  }
  catch {
    return new Set()
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
      status: EnrollmentStatus.ENROLLED,
      courseOffering: {
        semesterId,
      },
    },
    include: {
      courseOffering: {
        include: {
          course: true,
        },
      },
    },
  })

  const inProgressCourseIds = new Set<string>()
  for(const enrollment of enrollments) {
    const courseId = enrollment.courseOffering.course.id
    if(!completedCourseIds.has(courseId)) {
      inProgressCourseIds.add(courseId)
    }
  }
  return inProgressCourseIds
}

const getStudyStatus = (
  courseId: string,
  completedCourseIds: Set<string>,
  inProgressCourseIds: Set<string>
): StudyStatusValue => {
  if(completedCourseIds.has(courseId)) {
    return 'completed'
  }
  if(inProgressCourseIds.has(courseId)) {
    return 'in_progress'
  }
  return 'not_started'
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
      const completedCourseIds = await loadCompletedCourseIds(studentId)
      const inProgressCourseIds = await loadCurrentInProgressCourseIds(
        studentId,
        completedCourseIds
      )
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
          status: course.course.status == CourseStatus.ACTIVE ? 'active' : 'archived',
          studyStatus: getStudyStatus(
            course.course.id,
            completedCourseIds,
            inProgressCourseIds
          )
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
    let inProgressSemester: { id: string; status: SemesterStatus } | null = null
    if(semesterId) {
      const semester = await prisma.semester.findUnique({
        where: {
          id: semesterId
        },
        select: {
          id: true,
          endDate: true,
          status: true,
        },
      })
      if(!semester) {
        return '无法找到对应学期'
      }
      date = semester.endDate
      inProgressSemester = {
        id: semester.id,
        status: semester.status,
      }
    }
    else {
      try {
        const resolvedSemester = await resolveSemesterId()
        const semester = await prisma.semester.findUnique({
          where: {
            id: resolvedSemester.id,
          },
          select: {
            id: true,
            status: true,
          },
        })
        if(semester) {
          inProgressSemester = semester
        }
      }
      catch {
        inProgressSemester = null
      }
    }

    const completed = emptyProgressSummary()
    const inProgress = emptyProgressSummary()
    const selected = emptyProgressSummary()
    const completedCourseIds = new Set<string>()
    const inProgressCourseIds = new Set<string>()

    const scores = await prisma.score.findMany({
      where: {
        studentId,
        status: {
          in: [...SUBMITTED_SCORE_STATUSES],
        },
        courseOffering: semesterId
          ? {
              semester: {
                endDate: {
                  lte: date,
                },
              },
            }
          : undefined,
      },
      include: {
        courseOffering: {
          include: {
            course: true,
          },
        },
      },
    })

    for(const score of pickEffectiveScoresByCourse(scores)) {
      const totalScore = toNumber(score.totalScore)
      if(totalScore === null || totalScore < PASS_LINE) {
        continue
      }
      const course = score.courseOffering.course
      if(completedCourseIds.has(course.id)) {
        continue
      }
      completedCourseIds.add(course.id)
      addCourseToSummary(completed, course)
      addCourseToSummary(selected, course)
    }

    if(inProgressSemester && inProgressSemester.status !== SemesterStatus.ENDED) {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          studentId,
          status: EnrollmentStatus.ENROLLED,
          courseOffering: {
            semesterId: inProgressSemester.id,
          },
        },
        include: {
          courseOffering: {
            include: {
              course: true,
            },
          },
        },
      })

      for(const enrollment of enrollments) {
        const course = enrollment.courseOffering.course
        if(completedCourseIds.has(course.id) || inProgressCourseIds.has(course.id)) {
          continue
        }
        inProgressCourseIds.add(course.id)
        addCourseToSummary(inProgress, course)
        addCourseToSummary(selected, course)
      }
    }

    const remaining: Partial<CurriculumCreditSummary> = {}
    if(selected.totalCredits < requirements.totalCredits) {
      remaining.totalCredits = requirements.totalCredits - selected.totalCredits
    }
    if(selected.requiredCredits < requirements.requiredCredits) {
      remaining.requiredCredits = requirements.requiredCredits - selected.requiredCredits
    }
    if(selected.electiveCredits < requirements.electiveCredits) {
      remaining.electiveCredits = requirements.electiveCredits - selected.electiveCredits
    }

    const completedCounts = {
      required: 0,
      elective: 0,
      general: 0,
    }
    const inProgressCounts = {
      required: 0,
      elective: 0,
      general: 0,
    }

    const countedCourses = await prisma.course.findMany({
      where: {
        id: {
          in: [...completedCourseIds, ...inProgressCourseIds],
        },
      },
      select: {
        id: true,
        courseType: true,
      },
    })

    for(const course of countedCourses) {
      const key =
        course.courseType == CourseType.REQUIRED
          ? 'required'
          : course.courseType == CourseType.ELECTIVE
            ? 'elective'
            : 'general'
      if(completedCourseIds.has(course.id)) {
        completedCounts[key] += 1
      }
      else if(inProgressCourseIds.has(course.id)) {
        inProgressCounts[key] += 1
      }
    }

    const byCourseType: CurriculumCourseTypeProgress[] = [
      {
        courseType: toCourseTypeValue('required'),
        selectedCredits: selected.requiredCredits,
        completedCredits: completed.requiredCredits,
        inProgressCredits: inProgress.requiredCredits,
        requirementCredits: requirements.requiredCredits,
        courseCount: completedCounts.required + inProgressCounts.required
      },
      {
        courseType: toCourseTypeValue('elective'),
        selectedCredits: selected.electiveCredits,
        completedCredits: completed.electiveCredits,
        inProgressCredits: inProgress.electiveCredits,
        requirementCredits: requirements.electiveCredits,
        courseCount: completedCounts.elective + inProgressCounts.elective
      },
      {
        courseType: toCourseTypeValue('general'),
        selectedCredits: selected.generalCredits ?? 0,
        completedCredits: completed.generalCredits ?? 0,
        inProgressCredits: inProgress.generalCredits ?? 0,
        requirementCredits: requirements.generalCredits,
        courseCount: completedCounts.general + inProgressCounts.general
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
      completed: completed,
      inProgress: inProgress,
      remaining: remaining,
      byCourseType: byCourseType,
      warnings: warnings
    }
    return progress
  },
}
