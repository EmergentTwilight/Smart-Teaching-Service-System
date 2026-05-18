import prisma from '../../shared/prisma/client.js'
import { AppError, ForbiddenError, NotFoundError } from '@stss/shared'
import type {
  PaginatedRosterPayload,
  RosterExportQuery,
  RosterOfferingInfo,
  RosterQuery,
} from './course-selection.types.js'

async function getOfferingRosterOwnership(
  requesterUserId: string,
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

  if (offering.teacherId !== requesterUserId) {
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
  // - 仅允许任课教师访问 roster 与 export
  // - 基于 CourseOffering.teacherId 与数据库关系校验，禁止信任前端 teacherId
  async getOfferingRoster(
    requesterUserId: string,
    offeringId: string,
    query: RosterQuery
  ): Promise<PaginatedRosterPayload | null> {
    await getOfferingRosterOwnership(requesterUserId, offeringId)
    void query

    // TODO(C4, FR-C-27, NFR-C-06): 替换为真实分页查询
    // - 过滤 enrollment.status
    // - 加关键字检索（学号/姓名/专业/班级）
    // - 支持 status 与 page/pageSize 分页
    // - 查询结果需与导出条件一致
    // 负责人 scaffold 保留任课教师 ownership 校验，但不返回 200 空名单。
    return null
  },

  // TODO(C4, FR-C-28, NFR-C-08): 导出接口返回可落盘结构
  // - 导出字段：学号、姓名、专业、班级、选课状态、选课时间
  // - 与查询结果一致，不来自前端缓存
  async exportOfferingRoster(
    requesterUserId: string,
    offeringId: string,
    query: RosterExportQuery
  ): Promise<{
    downloadToken: string
    fileName: string
    message: string
  }> {
    await getOfferingRosterOwnership(requesterUserId, offeringId)
    void query

    // TODO(C4, FR-C-28, NFR-C-08):
    // 接入 Excel 生成库并按 query.status/query.format 从 Enrollment 查询导出内容；
    // 在实现前不得返回伪造下载令牌。
    throw new AppError(
      'COURSE_SELECTION_ROSTER_EXPORT_NOT_IMPLEMENTED',
      501,
      '课程学生名单导出暂未实现，当前无法生成下载文件'
    )
  },
}
