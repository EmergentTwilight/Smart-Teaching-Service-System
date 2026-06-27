/**
 * F1 成绩录入服务
 * 核心业务逻辑：查询录入列表、保存草稿、提交成绩
 */
import prisma from '../../shared/prisma/client.js'
import { Prisma } from '@prisma/client'
import { ForbiddenError, NotFoundError, ValidationError } from '@stss/shared'
import type { GetScoreListQuery, SaveDraftBody, SubmitScoresBody } from './score-entry.types.js'

function calcTotalScore(
  usualScore: number | null,
  midtermScore: number | null,
  finalScore: number | null
): number | null {
  if (usualScore == null || midtermScore == null || finalScore == null) return null
  return Math.round((usualScore * 0.3 + midtermScore * 0.2 + finalScore * 0.5) * 100) / 100
}

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

async function resolveEnteringTeacher(courseOfferingId: string, userId: string): Promise<string> {
  const teacher = await prisma.teacher.findUnique({ where: { userId } })
  if (!teacher) throw new ForbiddenError('仅任课教师可录入或提交成绩')

  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
  })
  if (!offering) throw new NotFoundError('课程开设记录不存在')
  if (offering.teacherId !== teacher.userId) throw new ForbiddenError('无权操作此课程')

  return teacher.userId
}

function isCompleteScore(score: {
  usualScore: unknown
  midtermScore: unknown
  finalScore: unknown
  totalScore: unknown
  gradePoint: unknown
  gradeLetter: unknown
}) {
  return (
    score.usualScore != null &&
    score.midtermScore != null &&
    score.finalScore != null &&
    score.totalScore != null &&
    score.gradePoint != null &&
    score.gradeLetter != null
  )
}

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

    const allItems = enrollments.map((enrollment) => {
      const score = enrollment.score
      const s = enrollment.student
      const itemStatus = score ? (score.status as string) : 'EMPTY'

      return {
        scoreId: score?.id ?? null,
        enrollmentId: enrollment.id,
        studentId: s.userId,
        studentNumber: s.studentNumber,
        studentName: s.user.realName,
        className: s.className ?? null,
        usualScore: score?.usualScore != null ? Number(score.usualScore) : null,
        midtermScore: score?.midtermScore != null ? Number(score.midtermScore) : null,
        finalScore: score?.finalScore != null ? Number(score.finalScore) : null,
        totalScore: score?.totalScore != null ? Number(score.totalScore) : null,
        gradePoint: score?.gradePoint != null ? Number(score.gradePoint) : null,
        gradeLetter: score?.gradeLetter ?? null,
        status: itemStatus,
      }
    })

    const filtered = status ? allItems.filter((item) => item.status === status) : allItems
    const total = filtered.length
    const items = filtered.slice(skip, skip + pageSize)

    return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), items }
  },

  /**
   * 批量保存成绩草稿（upsert）
   * 已提交/已确认的记录跳过，分数校验失败的报错
   */
  async saveDraft(courseOfferingId: string, body: SaveDraftBody, userId: string, roles: string[]) {
    if (!roles.includes('teacher')) {
      throw new ForbiddenError('仅任课教师可录入成绩')
    }
    const teacherId = await resolveEnteringTeacher(courseOfferingId, userId)

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

      // 用 'key' in item 判断前端是否显式传了这个字段
      // 如果传了（哪怕是 null），就用前端的值（表示清空）；否则回退到旧值
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

      const scoreData = {
        usualScore: usualScore ?? null,
        midtermScore: midtermScore ?? null,
        finalScore: finalScore ?? null,
        totalScore,
        gradePoint,
        gradeLetter,
        enteredBy: teacherId,
        enteredAt: new Date(),
      }

      if (enrollment.score) {
        const updated = await prisma.score.updateMany({
          where: {
            id: enrollment.score.id,
            status: 'DRAFT',
          },
          data: {
            ...scoreData,
            usualScore: 'usualScore' in item ? (item.usualScore ?? null) : undefined,
            midtermScore: 'midtermScore' in item ? (item.midtermScore ?? null) : undefined,
            finalScore: 'finalScore' in item ? (item.finalScore ?? null) : undefined,
          },
        })

        if (updated.count === 0) {
          skippedCount++
          continue
        }
      } else {
        try {
          await prisma.score.create({
            data: {
              enrollmentId: item.enrollmentId,
              studentId: enrollment.studentId,
              courseOfferingId,
              ...scoreData,
              status: 'DRAFT',
            },
          })
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            skippedCount++
            continue
          }
          throw err
        }
      }

      savedCount++
    }

    return { savedCount, skippedCount, errors }
  },

  /**
   * 批量提交成绩
   * 统一口径：按 scoreIds（Score 表主键）提交，与 F4 前端对齐
   * 将 DRAFT 状态改为 SUBMITTED，提交后不可再通过录入接口修改
   */
  async submitScores(
    courseOfferingId: string,
    body: SubmitScoresBody,
    userId: string,
    roles: string[]
  ) {
    if (!roles.includes('teacher')) {
      throw new ForbiddenError('仅任课教师可提交成绩')
    }
    const teacherId = await resolveEnteringTeacher(courseOfferingId, userId)

    let submittedCount = 0
    let skippedCount = 0
    const errors: { scoreId: string; message: string }[] = []

    for (const scoreId of body.scoreIds) {
      const score = await prisma.score.findUnique({ where: { id: scoreId } })

      if (!score || score.courseOfferingId !== courseOfferingId) {
        errors.push({ scoreId, message: '成绩记录不存在或不属于此课程' })
        continue
      }

      // 只有 DRAFT 状态才能提交；SUBMITTED/CONFIRMED 跳过
      if (score.status !== 'DRAFT') {
        skippedCount++
        continue
      }

      if (!isCompleteScore(score)) {
        errors.push({ scoreId, message: '成绩尚未完整，需录入平时、期中、期末成绩后才能提交' })
        continue
      }

      const updated = await prisma.score.updateMany({
        where: {
          id: scoreId,
          status: 'DRAFT',
        },
        data: {
          status: 'SUBMITTED',
          enteredBy: teacherId,
          enteredAt: new Date(),
        },
      })

      if (updated.count === 0) {
        skippedCount++
        continue
      }

      submittedCount++
    }

    if (submittedCount === 0 && errors.length > 0 && skippedCount === 0) {
      throw new ValidationError(errors[0].message)
    }

    return { submittedCount, skippedCount, errors }
  },
}
