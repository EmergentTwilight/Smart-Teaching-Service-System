/**
 * C4（FR-C-24~FR-C-26, FR-C-29）：学生本人选课结果分页查询与学分汇总。
 * studentId 须来自 JWT，禁止信任请求体中的学生身份。
 */
import { EnrollmentStatus, type Prisma } from '@prisma/client'
import type {
  EnrollmentItem,
  EnrollmentListPayload,
  EnrollmentQuery,
} from './course-selection.types.js'
import { toCourseTypeValue } from './course-selection.types.js'
import {
  buildPaginationMeta,
  decimalToNumber,
  mapEnrollmentStatus,
  parseEnrollmentStatusFilter,
} from './course-selection.support.js'
import prisma from '../../shared/prisma/client.js'

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
      code: string
      name: string
      credits: Prisma.Decimal
      courseType: string
    }
    teacher: { user: { realName: string } }
    semester: { name: string }
  }
}): EnrollmentItem => ({
  enrollmentId: row.id,
  status: mapEnrollmentStatus(row.status),
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

    return {
      items: rows.map(mapEnrollmentItem),
      summary: {
        enrolledCount: summaryRows.length,
        enrolledCredits,
      },
      pagination: buildPaginationMeta(page, pageSize, total),
    }
  },
}
