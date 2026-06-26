/**
 * C4（FR-C-24~FR-C-26, FR-C-29）：学生本人选课结果分页查询与学分汇总。
 * studentId 须来自 JWT，禁止信任请求体中的学生身份。
 */
import { EnrollmentStatus, type Prisma } from '@prisma/client'
import type {
  EnrollmentItem,
  EnrollmentListPayload,
  EnrollmentQuery,
  StudyStatusValue,
} from './course-selection.types.js'
import { toCourseTypeValue } from './course-selection.types.js'
import {
  buildPaginationMeta,
  decimalToNumber,
  mapEnrollmentStatus,
  parseEnrollmentStatusFilter,
} from './course-selection.support.js'
import prisma from '../../shared/prisma/client.js'
import {
  PASS_LINE,
  SUBMITTED_SCORE_STATUSES,
  pickEffectiveScoresByCourse,
  toNumber,
} from '../score-management/score-statistics.js'

const buildEnrollmentWhere = (
  studentId: string,
  query: EnrollmentQuery
): Prisma.EnrollmentWhereInput => {
  const status = parseEnrollmentStatusFilter(query.status)
  const keyword = query.keyword?.trim()

  const courseOffering: Prisma.CourseOfferingWhereInput = {}
  if (query.semesterId) {
    courseOffering.semesterId = query.semesterId
  }
  if (keyword) {
    courseOffering.course = {
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
      ],
    }
  }

  return {
    studentId,
    ...(status ? { status } : {}),
    ...(Object.keys(courseOffering).length > 0 ? { courseOffering } : {}),
  }
}

const mapEnrollmentItem = (row: {
  id: string
  status: EnrollmentStatus
  enrolledAt: Date
  droppedAt: Date | null
  courseOffering: {
    id: string
    course: {
      id: string
      code: string
      name: string
      credits: Prisma.Decimal
      courseType: string
    }
    teacher: { user: { realName: string } }
    semester: { name: string }
  }
}, completedCourseIds: Set<string>): EnrollmentItem => ({
  enrollmentId: row.id,
  status: mapEnrollmentStatus(row.status),
  studyStatus: resolveEnrollmentStudyStatus(row, completedCourseIds),
  enrolledAt: row.enrolledAt.toISOString(),
  droppedAt: row.droppedAt?.toISOString() ?? null,
  courseOffering: {
    id: row.courseOffering.id,
    courseCode: row.courseOffering.course.code,
    courseName: row.courseOffering.course.name,
    credits: decimalToNumber(row.courseOffering.course.credits),
    courseType: toCourseTypeValue(row.courseOffering.course.courseType),
    teacherName: row.courseOffering.teacher.user.realName,
    semesterName: row.courseOffering.semester.name,
  },
})

const resolveEnrollmentStudyStatus = (
  row: { status: EnrollmentStatus; courseOffering: { course: { id: string } } },
  completedCourseIds: Set<string>
): StudyStatusValue => {
  if (completedCourseIds.has(row.courseOffering.course.id)) {
    return 'completed'
  }

  if (row.status === EnrollmentStatus.ENROLLED) {
    return 'in_progress'
  }

  return 'not_started'
}

const loadCompletedCourseIds = async (
  studentId: string,
  courseIds: string[]
): Promise<Set<string>> => {
  if (courseIds.length === 0) {
    return new Set()
  }

  const scores = await prisma.score.findMany({
    where: {
      studentId,
      status: {
        in: [...SUBMITTED_SCORE_STATUSES],
      },
      courseOffering: {
        courseId: {
          in: courseIds,
        },
      },
    },
    include: {
      courseOffering: {
        include: {
          course: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  })

  const completedCourseIds = new Set<string>()
  for (const score of pickEffectiveScoresByCourse(scores)) {
    const totalScore = toNumber(score.totalScore)
    if (totalScore !== null && totalScore >= PASS_LINE) {
      completedCourseIds.add(score.courseOffering.course.id)
    }
  }

  return completedCourseIds
}

export const enrollmentResultsService = {
  async listMyEnrollments(
    studentId: string,
    query: EnrollmentQuery
  ): Promise<EnrollmentListPayload> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const where = buildEnrollmentWhere(studentId, query)

    const [total, rows, summaryRows] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({
        where,
        orderBy: [{ enrolledAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          courseOffering: {
            include: {
              course: {
                select: {
                  code: true,
                  id: true,
                  name: true,
                  credits: true,
                  courseType: true,
                },
              },
              teacher: {
                select: {
                  user: { select: { realName: true } },
                },
              },
              semester: { select: { name: true } },
            },
          },
        },
      }),
      prisma.enrollment.findMany({
        where: {
          ...buildEnrollmentWhere(studentId, {
            ...query,
            status: 'enrolled',
          }),
          status: EnrollmentStatus.ENROLLED,
        },
        include: {
          courseOffering: {
            include: {
              course: { select: { credits: true } },
            },
          },
        },
      }),
    ])

    const enrolledCredits = summaryRows.reduce(
      (sum, row) => sum + decimalToNumber(row.courseOffering.course.credits),
      0
    )
    const completedCourseIds = await loadCompletedCourseIds(
      studentId,
      rows.map((row) => row.courseOffering.course.id)
    )

    return {
      items: rows.map((row) => mapEnrollmentItem(row, completedCourseIds)),
      summary: {
        enrolledCount: summaryRows.length,
        enrolledCredits,
      },
      pagination: buildPaginationMeta(page, pageSize, total),
    }
  },
}
