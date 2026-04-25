/**
 * F1 成绩录入服务
 * 核心业务逻辑：查询录入列表、保存草稿、提交成绩
 */
import prisma from '../../shared/prisma/client.js'
import { Prisma } from '@prisma/client'
import { ForbiddenError, NotFoundError } from '@stss/shared'
import type { GetScoreListQuery, SaveDraftBody, SubmitScoresBody } from './score-entry.types.js'

// ===== 内部工具函数 =====

/**
 * 根据各项分数计算总评成绩
 * 公式：平时*30% + 期中*20% + 期末*50%
 * 只有三项都有值时才计算，否则返回 null
 */
function calcTotalScore(
  usualScore: number | null,
  midtermScore: number | null,
  finalScore: number | null
): number | null {
  if (usualScore == null || midtermScore == null || finalScore == null) return null
  return Math.round((usualScore * 0.3 + midtermScore * 0.2 + finalScore * 0.5) * 100) / 100
}

/**
 * 根据总分计算绩点
 */
function calcGradePoint(totalScore: number | null): number | null {
  if (totalScore == null) return null
  if (totalScore >= 90) return 4.0
  if (totalScore >= 85) return 3.7
  if (totalScore >= 82) return 3.3
  if (totalScore >= 78) return 3.0
  if (totalScore >= 75) return 2.7
  if (totalScore >= 72) return 2.3
  if (totalScore >= 68) return 2.0
  if (totalScore >= 64) return 1.5
  if (totalScore >= 60) return 1.0
  return 0.0
}

/**
 * 根据总分计算等级
 */
function calcGradeLetter(totalScore: number | null): string | null {
  if (totalScore == null) return null
  if (totalScore >= 90) return 'A'
  if (totalScore >= 80) return 'B'
  if (totalScore >= 70) return 'C'
  if (totalScore >= 60) return 'D'
  return 'F'
}

/**
 * 检查当前教师是否有权操作该 CourseOffering
 * 管理员可以操作所有，教师只能操作自己的
 */
async function checkTeacherPermission(
  courseOfferingId: string,
  userId: string,
  roles: string[]
): Promise<void> {
  const isAdmin = roles.some((r) => r === 'admin' || r === 'super_admin')
  if (isAdmin) return

  const teacher = await prisma.teacher.findUnique({ where: { userId } })
  if (!teacher) throw new ForbiddenError('当前用户不是教师')

  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
  })
  if (!offering) throw new NotFoundError('课程开设记录不存在')
  if (offering.teacherId !== teacher.userId) throw new ForbiddenError('无权操作此课程')
}

// ===== 对外暴露的 service 方法 =====

export const scoreEntryService = {
  /**
   * 获取某开课下的成绩录入列表
   * 无 Score 记录的学生也返回占位项（status: EMPTY）
   */
  async getScoreList(
    courseOfferingId: string,
    query: GetScoreListQuery,
    userId: string,
    roles: string[]
  ) {
    await checkTeacherPermission(courseOfferingId, userId, roles)

    const { page, pageSize, keyword, status } = query
    const skip = (page - 1) * pageSize

    // 查该课程下所有有效选课记录
    // keyword 同时匹配学号或姓名（OR 条件），符合统一口径
    const enrollmentWhere: Prisma.EnrollmentWhereInput = {
      courseOfferingId,
      status: 'ENROLLED',
      ...(keyword
        ? {
            OR: [
              { student: { studentNumber: { contains: keyword } } },
              { student: { user: { realName: { contains: keyword } } } },
            ],
          }
        : {}),
    }

    const enrollments = await prisma.enrollment.findMany({
      where: enrollmentWhere,
      include: {
        student: {
          include: {
            user: { select: { realName: true } },
          },
        },
        score: true,
      },
      orderBy: { student: { studentNumber: 'asc' } },
    })

    // 拼装列表，后端补占位项
    const allItems = enrollments.map((enrollment) => {
      const score = enrollment.score
      const s = enrollment.student

      const usualScore = score?.usualScore ?? null
      const midtermScore = score?.midtermScore ?? null
      const finalScore = score?.finalScore ?? null
      const totalScore = score?.totalScore ?? null
      const gradePoint = score?.gradePoint ?? null
      const gradeLetter = score?.gradeLetter ?? null
      const itemStatus = score ? (score.status as string) : 'EMPTY'

      return {
        scoreId: score?.id ?? null,
        enrollmentId: enrollment.id,
        studentId: s.userId,
        studentNumber: s.studentNumber,
        studentName: s.user.realName,
        className: s.className ?? null,
        usualScore: usualScore != null ? Number(usualScore) : null,
        midtermScore: midtermScore != null ? Number(midtermScore) : null,
        finalScore: finalScore != null ? Number(finalScore) : null,
        totalScore: totalScore != null ? Number(totalScore) : null,
        gradePoint: gradePoint != null ? Number(gradePoint) : null,
        gradeLetter,
        status: itemStatus,
      }
    })

    // 按状态筛选（在内存里做，因为 Score 是 optional 关联）
    const filtered = status ? allItems.filter((item) => item.status === status) : allItems
    const total = filtered.length
    const items = filtered.slice(skip, skip + pageSize)

    return {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      items,
    }
  },

  /**
   * 批量保存成绩草稿（upsert）
   * 已提交的记录跳过，分数校验失败的报错
   */
  async saveDraft(
    courseOfferingId: string,
    body: SaveDraftBody,
    userId: string,
    roles: string[]
  ) {
    await checkTeacherPermission(courseOfferingId, userId, roles)

    const teacher = await prisma.teacher.findUnique({ where: { userId } })

    let savedCount = 0
    let skippedCount = 0
    const errors: { enrollmentId: string; field: string; message: string }[] = []

    for (const item of body.scores) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: item.enrollmentId },
        include: { score: true },
      })

      if (!enrollment || enrollment.courseOfferingId !== courseOfferingId) {
        errors.push({
          enrollmentId: item.enrollmentId,
          field: 'enrollmentId',
          message: '选课记录不存在或不属于此课程',
        })
        continue
      }

      // 已提交（SUBMITTED）或已确认（CONFIRMED）的都不允许再通过录入接口修改
      // CONFIRMED 是 F2 审批流产生的，F1 只需识别保护，不自己产生
      if (enrollment.score?.status === 'SUBMITTED' || enrollment.score?.status === 'CONFIRMED') {
        skippedCount++
        continue
      }

      // 修复 null 清空 bug：
      // 用 'key' in item 判断前端是否显式传了这个字段
      // 如果传了（哪怕是 null），就用前端的值（表示清空）
      // 如果没传（undefined），才回退到数据库旧值
      const usualScore =
        'usualScore' in item ? item.usualScore : (enrollment.score?.usualScore ?? null)
      const midtermScore =
        'midtermScore' in item ? item.midtermScore : (enrollment.score?.midtermScore ?? null)
      const finalScore =
        'finalScore' in item ? item.finalScore : (enrollment.score?.finalScore ?? null)
      const totalScore = calcTotalScore(
        usualScore != null ? Number(usualScore) : null,
        midtermScore != null ? Number(midtermScore) : null,
        finalScore != null ? Number(finalScore) : null
      )
      const gradePoint = calcGradePoint(totalScore)
      const gradeLetter = calcGradeLetter(totalScore)

      await prisma.score.upsert({
        where: { enrollmentId: item.enrollmentId },
        create: {
          enrollmentId: item.enrollmentId,
          studentId: enrollment.studentId,
          courseOfferingId,
          usualScore: usualScore != null ? usualScore : undefined,
          midtermScore: midtermScore != null ? midtermScore : undefined,
          finalScore: finalScore != null ? finalScore : undefined,
          totalScore: totalScore ?? undefined,
          gradePoint: gradePoint ?? undefined,
          gradeLetter: gradeLetter ?? undefined,
          status: 'DRAFT',
          enteredBy: teacher?.userId ?? userId,
          enteredAt: new Date(),
        },
        update: {
          usualScore: 'usualScore' in item ? (item.usualScore ?? null) : undefined,
          midtermScore: 'midtermScore' in item ? (item.midtermScore ?? null) : undefined,
          finalScore: 'finalScore' in item ? (item.finalScore ?? null) : undefined,
          totalScore: totalScore ?? undefined,
          gradePoint: gradePoint ?? undefined,
          gradeLetter: gradeLetter ?? undefined,
          enteredBy: teacher?.userId ?? userId,
          enteredAt: new Date(),
        },
      })

      savedCount++
    }

    return { savedCount, skippedCount, errors }
  },

  /**
   * 批量提交成绩
   * 将 DRAFT 状态改为 SUBMITTED，提交后不可再通过录入接口修改
   */
  async submitScores(
    courseOfferingId: string,
    body: SubmitScoresBody,
    userId: string,
    roles: string[]
  ) {
    await checkTeacherPermission(courseOfferingId, userId, roles)

    const teacher = await prisma.teacher.findUnique({ where: { userId } })

    let submittedCount = 0
    let skippedCount = 0
    const errors: { enrollmentId: string; message: string }[] = []

    if (body.submitAll) {
      // 提交该课程下所有草稿
      const result = await prisma.score.updateMany({
        where: {
          courseOfferingId,
          status: 'DRAFT',
        },
        data: {
          status: 'SUBMITTED',
          enteredBy: teacher?.userId ?? userId,
          enteredAt: new Date(),
        },
      })
      submittedCount = result.count
    } else if (body.enrollmentIds && body.enrollmentIds.length > 0) {
      for (const enrollmentId of body.enrollmentIds) {
        const score = await prisma.score.findUnique({ where: { enrollmentId } })

        if (!score || score.courseOfferingId !== courseOfferingId) {
          errors.push({ enrollmentId, message: '成绩记录不存在或不属于此课程' })
          continue
        }

        if (score.status !== 'DRAFT') {
          skippedCount++
          continue
        }

        await prisma.score.update({
          where: { enrollmentId },
          data: {
            status: 'SUBMITTED',
            enteredBy: teacher?.userId ?? userId,
            enteredAt: new Date(),
          },
        })
        submittedCount++
      }
    }

    return { submittedCount, skippedCount, errors }
  },
}
