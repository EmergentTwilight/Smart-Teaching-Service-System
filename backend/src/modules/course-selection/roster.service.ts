/**
 * C4：开课学生名单分页与导出；导出数据与列表查询口径一致（均来自 Enrollment）。
 */
import type { Prisma } from '@prisma/client'
import { EnrollmentStatus } from '@prisma/client'
import prisma from '../../shared/prisma/client.js'
import { ForbiddenError, NotFoundError } from '@stss/shared'
import type {
  PaginatedRosterPayload,
  RosterExportPayload,
  RosterExportQuery,
  RosterOfferingInfo,
  RosterQuery,
  RosterStudentItem,
} from './course-selection.types.js'
import {
  buildPaginationMeta,
  mapEnrollmentStatus,
  parseEnrollmentStatusFilter,
} from './course-selection.support.js'
import { buildRosterExcelBuffer, sanitizeExportFileName } from './roster-export.util.js'

/** 校验开课存在且 teacherId 与当前登录教师一致，否则 403。 */
async function getOfferingRosterOwnership(
  requesterUserId: string,
  offeringId: string
): Promise<RosterOfferingInfo & { courseCode: string; semesterName: string }> {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      course: {
        select: {
          code: true,
          name: true,
        },
      },
      semester: { select: { name: true } },
      teacher: {
        select: {
          user: {
            select: {
              realName: true,
            },
          },
        },
      },
    },
  })

  if (!offering) {
    throw new NotFoundError('课程开设')
  }

  if (offering.teacherId !== requesterUserId) {
    throw new ForbiddenError('无权查看该课程学生名单')
  }

  return {
    offeringId: offering.id,
    courseName: offering.course.name,
    teacherName: offering.teacher.user.realName,
    courseCode: offering.course.code,
    semesterName: offering.semester.name,
  }
}

const buildRosterEnrollmentWhere = (
  offeringId: string,
  query: RosterQuery | RosterExportQuery
): Prisma.EnrollmentWhereInput => {
  const status = parseEnrollmentStatusFilter(query.status ?? 'enrolled') ?? EnrollmentStatus.ENROLLED
  const keyword = 'keyword' in query ? query.keyword?.trim() : undefined

  const studentFilter: Prisma.StudentWhereInput | undefined = keyword
    ? {
        OR: [
          { studentNumber: { contains: keyword, mode: 'insensitive' } },
          { className: { contains: keyword, mode: 'insensitive' } },
          { user: { realName: { contains: keyword, mode: 'insensitive' } } },
          { major: { name: { contains: keyword, mode: 'insensitive' } } },
        ],
      }
    : undefined

  return {
    courseOfferingId: offeringId,
    status,
    ...(studentFilter ? { student: studentFilter } : {}),
  }
}

const mapRosterStudent = (row: {
  status: EnrollmentStatus
  enrolledAt: Date
  student: {
    studentNumber: string
    className: string | null
    user: { realName: string }
    major: { name: string } | null
  }
}): RosterStudentItem => ({
  studentNumber: row.student.studentNumber,
  studentName: row.student.user.realName,
  majorName: row.student.major?.name,
  className: row.student.className ?? undefined,
  enrollmentStatus: mapEnrollmentStatus(row.status),
  enrolledAt: row.enrolledAt.toISOString(),
})

async function queryRosterStudents(
  offeringId: string,
  query: RosterQuery | RosterExportQuery
): Promise<RosterStudentItem[]> {
  const rows = await prisma.enrollment.findMany({
    where: buildRosterEnrollmentWhere(offeringId, query),
    orderBy: [{ enrolledAt: 'asc' }],
    include: {
      student: {
        include: {
          user: { select: { realName: true } },
          major: { select: { name: true } },
        },
      },
    },
  })

  return rows.map(mapRosterStudent)
}

export const rosterService = {
  async getOfferingRoster(
    requesterUserId: string,
    offeringId: string,
    query: RosterQuery
  ): Promise<PaginatedRosterPayload> {
    const offering = await getOfferingRosterOwnership(requesterUserId, offeringId)
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 50
    const where = buildRosterEnrollmentWhere(offeringId, query)

    const [total, rows] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({
        where,
        orderBy: [{ enrolledAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          student: {
            include: {
              user: { select: { realName: true } },
              major: { select: { name: true } },
            },
          },
        },
      }),
    ])

    return {
      offering: {
        offeringId: offering.offeringId,
        courseName: offering.courseName,
        teacherName: offering.teacherName,
      },
      students: rows.map(mapRosterStudent),
      pagination: buildPaginationMeta(page, pageSize, total),
    }
  },

  async exportOfferingRoster(
    requesterUserId: string,
    offeringId: string,
    query: RosterExportQuery
  ): Promise<RosterExportPayload> {
    const offering = await getOfferingRosterOwnership(requesterUserId, offeringId)
    const students = await queryRosterStudents(offeringId, query)
    const content = await buildRosterExcelBuffer(students)

    return {
      content,
      fileName: sanitizeExportFileName(offering.courseCode, offering.semesterName),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  },
}
