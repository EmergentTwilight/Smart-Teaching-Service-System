import type {
  CurriculumInfo,
  CurriculumProgress,
  CurriculumQuery,
  CurriculumProgressQuery,
  CurriculumCourseItem,
} from './course-selection.types.js'
import {
  toCourseStatusValue,
  toCourseTypeValue,
} from './course-selection.types.js'
import prisma from '../../shared/prisma/client.js'
import { AppError } from '@stss/shared'

const createCurriculumNotFoundError = () =>
  new AppError(
    'COURSE_SELECTION_CURRICULUM_NOT_FOUND',
    422,
    '当前学生暂无匹配培养方案，无法生成可选课程列表'
  )

const shouldIncludeCourses = (query: CurriculumQuery): boolean =>
  query.includeCourses ?? query.include_courses ?? true

const normalizeCourseTypeFilter = (query: CurriculumQuery): string | undefined =>
  query.courseType?.toLowerCase() ?? query.course_type?.toLowerCase()

async function findCurriculumForStudent(studentId: string) {
  const student = await prisma.student.findUnique({
    where: {
      userId: studentId,
    },
    select: {
      majorId: true,
      grade: true,
    },
  })

  if (!student?.majorId) {
    throw createCurriculumNotFoundError()
  }

  return prisma.curriculum.findFirst({
    where: {
      majorId: student.majorId,
      year: student.grade,
    },
    include: {
      major: {
        select: {
          name: true,
        },
      },
      courses: {
        include: {
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              credits: true,
              status: true,
            },
          },
        },
      },
    },
  })
}

type StudentCurriculumRecord = NonNullable<Awaited<ReturnType<typeof findCurriculumForStudent>>>

const toCurriculumInfo = (curriculum: StudentCurriculumRecord): CurriculumInfo => ({
  id: curriculum.id,
  name: curriculum.name,
  year: curriculum.year,
  majorName: curriculum.major.name,
  totalCredits: Number(curriculum.totalCredits),
  requiredCredits: curriculum.requiredCredits === null ? undefined : Number(curriculum.requiredCredits),
  electiveCredits: curriculum.electiveCredits === null ? undefined : Number(curriculum.electiveCredits),
})

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
  ): Promise<{ studentId: string; curriculum: CurriculumInfo; courseGroups: CurriculumCourseItem[] }> {
    const curriculumRecord = await findCurriculumForStudent(studentId)

    if (!curriculumRecord) {
      throw createCurriculumNotFoundError()
    }

    const courseTypeFilter = normalizeCourseTypeFilter(query)
    const courseGroups: CurriculumCourseItem[] = shouldIncludeCourses(query)
      ? curriculumRecord.courses
        .filter((item) => !courseTypeFilter || toCourseTypeValue(item.courseType) === courseTypeFilter)
        .map((item) => ({
          courseId: item.course.id,
          courseCode: item.course.code,
          courseName: item.course.name,
          credits: Number(item.course.credits),
          courseType: toCourseTypeValue(item.courseType),
          semesterSuggestion: item.semesterSuggestion,
          status: toCourseStatusValue(item.course.status),
        }))
      : []

    return {
      studentId,
      curriculum: toCurriculumInfo(curriculumRecord),
      courseGroups,
    }
  },

  /**
   * 获取当前学生学分进展
   */
  async getMyCurriculumProgress(
    studentId: string,
    _query: CurriculumProgressQuery
  ): Promise<{ progress: CurriculumProgress; studentId: string }> {
    const progress: CurriculumProgress = {
      totalSelectedCredits: 0,
      requiredSelectedCredits: 0,
      electiveSelectedCredits: 0,
      generalSelectedCredits: 0,
      totalCreditRatio: 0,
    }

    // TODO(C1, FR-C-05, NFR-C-07): 由有效 Enrollment 汇总进度
    // - 读取学生 ENROLLED/非 DROPPED 记录
    // - 按课程类型聚合已选学分
    // - 计算与 Curriculum 目标学分的比例

    // TODO(C1, FR-C-05, NFR-C-12): 进度统计结果与后续选课/退课事务需保持一致

    return {
      studentId,
      progress,
    }
  },
}
