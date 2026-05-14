import prisma from '../../shared/prisma/client.js'
import { ForbiddenError, NotFoundError } from '@stss/shared'
import type { PaginatedRosterPayload, RosterOfferingInfo, RosterQuery, RosterStudentItem } from './course-selection.types.js'

const ROSTER_ADMIN_ROLES = new Set(['admin', 'super_admin'])

function hasRosterAdminRole(roles: string[]): boolean {
  return roles.some((role) => ROSTER_ADMIN_ROLES.has(role))
}

function buildPagination(page = 1, pageSize = 20) {
  return {
    page,
    pageSize,
    total: 0,
    totalPages: 0,
  }
}

async function getOfferingRosterOwnership(
  requesterUserId: string,
  requesterRoles: string[],
  offeringId: string
): Promise<RosterOfferingInfo> {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      course: {
        select: {
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
    },
  })

  if (!offering) {
    throw new NotFoundError('课程开设')
  }

  if (!hasRosterAdminRole(requesterRoles) && offering.teacherId !== requesterUserId) {
    throw new ForbiddenError('无权查看该课程学生名单')
  }

  return {
    offeringId: offering.id,
    courseName: offering.course.name,
    teacherName: offering.teacher.user.realName,
  }
}

export const rosterService = {
  // TODO(C4, FR-C-27, FR-C-28, NFR-C-06): 列出并导出任课教师名单
  // - 仅允许 teacher/admin/super_admin 访问 roster 与 export
  // - admin/super_admin 可访问任意 offering；teacher 只能访问本课程
  // - 基于 CourseOffering.teacherId 与数据库关系校验，禁止信任前端 teacherId
  async getOfferingRoster(
    requesterUserId: string,
    requesterRoles: string[],
    offeringId: string,
    query: RosterQuery
  ): Promise<PaginatedRosterPayload> {
    const offering = await getOfferingRosterOwnership(requesterUserId, requesterRoles, offeringId)
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20

    // TODO(C4, FR-C-27, NFR-C-06): 替换为真实分页查询
    // - 过滤 enrollment.status
    // - 加关键字检索（学号/姓名/专业/班级）
    // - 支持 status 与 page/pageSize 分页
    // - 查询结果需与导出条件一致
    const students: RosterStudentItem[] = []

    return {
      offering,
      students,
      pagination: buildPagination(page, pageSize),
    }
  },

  // TODO(C4, FR-C-28, NFR-C-08): 导出接口返回可落盘结构
  // - 导出字段：学号、姓名、专业、班级、选课状态、选课时间
  // - 与查询结果一致，不来自前端缓存
  async exportOfferingRoster(
    requesterUserId: string,
    requesterRoles: string[],
    offeringId: string
  ): Promise<{
    downloadToken: string
    fileName: string
    message: string
  }> {
    await getOfferingRosterOwnership(requesterUserId, requesterRoles, offeringId)

    return {
      downloadToken: 'pending',
      fileName: `roster-${offeringId}.xlsx`,
      message: '导出暂未接入 Excel 依赖，当前返回导出任务占位信息',
    }
  },
}
