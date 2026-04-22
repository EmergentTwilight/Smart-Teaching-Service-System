import type { Prisma, ScoreStatus } from '@prisma/client'
import prisma from '../../shared/prisma/client.js'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/AppError.js'
import { scoreModificationRequestPayloadSchema } from './score-modification.schemas.js'
import type {
  ApproveModificationRequestInput,
  CreateScoreModificationRequestInput,
  GetPendingModificationRequestsQuery,
  GetScoreModificationLogsQuery,
  PendingModificationRequestsResult,
  RejectModificationRequestInput,
  ScoreModificationLogsResult,
  ScoreModificationRequestPayload,
  ScoreSnapshot,
} from './score-modification.types.js'

/**
 * 仅对 SUBMITTED/CONFIRMED 成绩开放审批流。
 * 严格区分 F1 的 DRAFT 录入与 F2 的提交后改分。
 */
const APPROVAL_REQUIRED_STATUSES: ScoreStatus[] = ['SUBMITTED', 'CONFIRMED']

// 一些工具函数，可以复用来避免重复代码，也方便修改

// 检查角色列表，判断是否有权限
const hasAnyRole = (roles: string[], expectedRoles: string[]) => {
  return roles.some((role) => expectedRoles.includes(role))
}

// 统一转换为 number 或 null，方便后续处理
const toNumber = (value: Prisma.Decimal | number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null
  }
  return Number(value)
}

// 将数据库查询的成绩记录转换为统一的 ScoreSnapshot 结构
const toScoreSnapshot = (score: {
  usualScore: Prisma.Decimal | number | null
  midtermScore: Prisma.Decimal | number | null
  finalScore: Prisma.Decimal | number | null
  totalScore: Prisma.Decimal | number | null
}): ScoreSnapshot => {
  return {
    usualScore: toNumber(score.usualScore),
    midtermScore: toNumber(score.midtermScore),
    finalScore: toNumber(score.finalScore),
    totalScore: toNumber(score.totalScore),
  }
}

// 去除 undefined，转换为 null 或 number，方便后续处理和存储
const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null
  }
  return typeof value === 'number' ? value : null
}

// 将日志中的 JSON 快照统一转换为 ScoreSnapshot 结构
const toScoreSnapshotFromJson = (value: Prisma.JsonValue): ScoreSnapshot => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {
      usualScore: null,
      midtermScore: null,
      finalScore: null,
      totalScore: null,
    }
  }

  const json = value as Record<string, unknown>
  return {
    usualScore: toNullableNumber(json.usualScore),
    midtermScore: toNullableNumber(json.midtermScore),
    finalScore: toNullableNumber(json.finalScore),
    totalScore: toNullableNumber(json.totalScore),
  }
}

// 读取并解析数据库中的 modificationRequest 字符串，并用 schema 校验
const parseStoredModificationRequest = (
  raw: string | null,
  scoreId: string
): ScoreModificationRequestPayload => {
  if (!raw) {
    throw new ValidationError('该成绩不存在待处理修改申请')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ValidationError(`成绩 ${scoreId} 的修改申请数据格式损坏`)
  }

  const result = scoreModificationRequestPayloadSchema.safeParse(parsed)
  if (!result.success) {
    throw new ValidationError(`成绩 ${scoreId} 的修改申请字段不合法`)
  }

  return result.data
}

// 根据申请修改快照
const buildUpdatedSnapshot = (
  current: ScoreSnapshot,
  changes: ScoreModificationRequestPayload['proposedChanges']
): ScoreSnapshot => {
  return {
    usualScore: changes.usualScore ?? current.usualScore,
    midtermScore: changes.midtermScore ?? current.midtermScore,
    finalScore: changes.finalScore ?? current.finalScore,
    totalScore: changes.totalScore ?? current.totalScore,
  }
}

// 把 proposedChanges 转成 Prisma 的更新对象，仅更新传入字段
const toScoreUpdateData = (
  changes: ScoreModificationRequestPayload['proposedChanges']
): Prisma.ScoreUpdateManyMutationInput => {
  const data: Prisma.ScoreUpdateManyMutationInput = {}
  if (changes.usualScore !== undefined) {
    data.usualScore = changes.usualScore
  }
  if (changes.midtermScore !== undefined) {
    data.midtermScore = changes.midtermScore
  }
  if (changes.finalScore !== undefined) {
    data.finalScore = changes.finalScore
  }
  if (changes.totalScore !== undefined) {
    // 仅更新申请中明确传入的 totalScore 字段，保持“部分更新”语义。
    data.totalScore = changes.totalScore
  }
  return data
}

// 核心业务逻辑实现，负责所有修改成绩的操作
export const scoreModificationService = {
  // 教师/管理员发起修改申请
  async createModificationRequest(
    scoreId: string,
    requesterId: string,
    requesterRoles: string[],
    input: CreateScoreModificationRequestInput
  ) {
    const score = await prisma.score.findUnique({
      // 数据库查询成绩记录，检查是否存在、状态是否合法、是否已有待处理申请等
      where: { id: scoreId },
      select: {
        id: true,
        status: true,
        enteredBy: true,
        modificationRequest: true,
        courseOffering: {
          select: {
            teacherId: true,
          },
        },
      },
    })

    // 检验约束
    if (!score) {
      throw new NotFoundError('成绩不存在')
    }

    if (!APPROVAL_REQUIRED_STATUSES.includes(score.status)) {
      throw new ValidationError('仅 SUBMITTED/CONFIRMED 状态的成绩允许发起修改申请')
    }

    const isAdminRequester = hasAnyRole(requesterRoles, ['admin', 'super_admin'])
    const isTeacherRequester = hasAnyRole(requesterRoles, ['teacher'])

    if (!isTeacherRequester && !isAdminRequester) {
      throw new ForbiddenError('仅教师或管理员可发起修改申请')
    }

    const isOwnerByEntry = score.enteredBy === requesterId
    const isOwnerByCourse = score.courseOffering?.teacherId === requesterId

    if (!isAdminRequester && !isOwnerByEntry && !isOwnerByCourse) {
      // 教师必须是录入教师或任课教师，管理员可代发起申请。
      throw new ForbiddenError('仅该成绩录入教师或任课教师可发起修改申请')
    }

    if (score.modificationRequest) {
      throw new ConflictError('该成绩已有待处理修改申请')
    }

    // 构建申请负载，存储到 score 的 modificationRequest 字段中
    const payload: ScoreModificationRequestPayload = {
      proposedChanges: input.proposedChanges,
      reason: input.reason,
      applicantId: requesterId,
      appliedAt: new Date().toISOString(),
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 使用乐观并发条件，校验 count，避免并发下重复申请覆盖
      const updateResult = await tx.score.updateMany({
        where: {
          id: scoreId,
          ...(isAdminRequester
            ? {}
            : {
                OR: [{ enteredBy: requesterId }, { courseOffering: { teacherId: requesterId } }],
              }),
          status: { in: APPROVAL_REQUIRED_STATUSES },
          modificationRequest: null,
        },
        data: {
          modificationRequest: JSON.stringify(payload),
        },
      })

      if (updateResult.count === 0) {
        throw new ConflictError('该成绩已有待处理申请，或状态已发生变化')
      }

      await tx.systemLog.create({
        data: {
          userId: requesterId,
          action: 'score.modification.requested',
          resourceType: 'score',
          resourceId: scoreId,
          details: {
            reason: payload.reason,
            proposedChanges: payload.proposedChanges,
            appliedAt: payload.appliedAt,
          } as unknown as Prisma.InputJsonValue,
        },
      })
    })

    return {
      scoreId,
      status: score.status,
      request: payload,
    }
  },

  // 管理员获取待审批申请列表
  async getPendingModificationRequests(
    query: GetPendingModificationRequestsQuery
  ): Promise<PendingModificationRequestsResult> {
    const { page, pageSize, courseOfferingId, teacherId } = query
    const skip = (page - 1) * pageSize

    const where: Prisma.ScoreWhereInput = {
      status: { in: APPROVAL_REQUIRED_STATUSES },
      modificationRequest: { not: null },
    }

    if (courseOfferingId) {
      where.courseOfferingId = courseOfferingId
    }

    if (teacherId) {
      // teacherId 支持录入教师与任课教师双语义，任一命中即返回。
      where.OR = [{ enteredBy: teacherId }, { courseOffering: { teacherId } }]
    }

    // 数据库查询满足条件的成绩记录
    const [rows, total] = await Promise.all([
      prisma.score.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { enteredAt: 'desc' },
        select: {
          id: true,
          status: true,
          courseOfferingId: true,
          enteredBy: true,
          studentId: true,
          modificationRequest: true,
          student: {
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                  realName: true,
                },
              },
            },
          },
          enterer: {
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                  realName: true,
                },
              },
            },
          },
        },
      }),
      prisma.score.count({ where }),
    ])

    // 解析 modificationRequest 字段，组合申请列表和分页信息并返回
    const items = rows.map((row: (typeof rows)[number]) => {
      const request = parseStoredModificationRequest(row.modificationRequest, row.id)
      return {
        scoreId: row.id,
        status: row.status,
        courseOfferingId: row.courseOfferingId,
        teacherId: row.enteredBy,
        studentId: row.studentId,
        request,
        student: row.student?.user
          ? {
              id: row.student.user.id,
              username: row.student.user.username,
              realName: row.student.user.realName,
            }
          : null,
        teacher: row.enterer?.user
          ? {
              id: row.enterer.user.id,
              username: row.enterer.user.username,
              realName: row.enterer.user.realName,
            }
          : null,
      }
    })

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  },

  // 管理员审批通过
  async approveModificationRequest(
    scoreId: string,
    approverId: string,
    input: ApproveModificationRequestInput
  ) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 读取原成绩和申请，并申请新旧快照
      const score = await tx.score.findUnique({
        where: { id: scoreId },
        select: {
          id: true,
          status: true,
          modificationRequest: true,
          usualScore: true,
          midtermScore: true,
          finalScore: true,
          totalScore: true,
        },
      })

      if (!score) {
        throw new NotFoundError('成绩不存在')
      }

      if (!APPROVAL_REQUIRED_STATUSES.includes(score.status)) {
        throw new ValidationError('当前成绩状态不允许审批修改')
      }

      const request = parseStoredModificationRequest(score.modificationRequest, score.id)
      const oldSnapshot = toScoreSnapshot(score)
      const newSnapshot = buildUpdatedSnapshot(oldSnapshot, request.proposedChanges)
      const now = new Date()

      // 审批是敏感操作，要通过乐观并发锁避免同一申请被重复审批，这里通过 count 判断是否有记录被更新，如果为 0 则说明该申请已被处理（可能是另一个管理员已审批通过或驳回），需要提示用户刷新页面重试。
      const updateResult = await tx.score.updateMany({
        where: {
          id: scoreId,
          status: { in: APPROVAL_REQUIRED_STATUSES },
          modificationRequest: score.modificationRequest,
        },
        data: {
          ...toScoreUpdateData(request.proposedChanges),
          modifiedAt: now,
          modifiedBy: approverId,
          modificationRequest: null,
        },
      })

      // 检查更新结果，若 count 为 0 则说明该申请已被处理，抛出冲突错误提示用户刷新重试
      if (updateResult.count === 0) {
        throw new ConflictError('该申请已被处理，请刷新后重试')
      }

      // 记录修改日志和系统日志
      await tx.scoreModificationLog.create({
        data: {
          scoreId,
          modifierId: approverId,
          oldValue: oldSnapshot as unknown as Prisma.InputJsonValue,
          newValue: newSnapshot as unknown as Prisma.InputJsonValue,
          reason: input.comment ? `${request.reason}；审批备注：${input.comment}` : request.reason,
        },
      })

      // 记录系统日志
      await tx.systemLog.create({
        data: {
          userId: approverId,
          action: 'score.modification.approved',
          resourceType: 'score',
          resourceId: scoreId,
          details: {
            applicantId: request.applicantId,
            appliedAt: request.appliedAt,
            proposedChanges: request.proposedChanges,
            requestReason: request.reason,
            approverComment: input.comment ?? null,
          } as unknown as Prisma.InputJsonValue,
        },
      })

      return {
        scoreId,
        status: score.status,
        modifiedAt: now,
        modifiedBy: approverId,
        oldValue: oldSnapshot,
        newValue: newSnapshot,
      }
    })
  },

  // 管理员审批驳回
  async rejectModificationRequest(
    scoreId: string,
    approverId: string,
    input: RejectModificationRequestInput
  ) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 读取原成绩和申请，检查状态，并解析申请内容
      const score = await tx.score.findUnique({
        where: { id: scoreId },
        select: {
          id: true,
          status: true,
          modificationRequest: true,
        },
      })

      // 检验约束
      if (!score) {
        throw new NotFoundError('成绩不存在')
      }

      if (!APPROVAL_REQUIRED_STATUSES.includes(score.status)) {
        throw new ValidationError('当前成绩状态不允许审批修改')
      }

      // 审批同样需要乐观并发锁，避免重复审批导致数据不一致
      // 虽然没有修改数据，但仍然需要在条件中校验 modificationRequest，确保同一申请只能被审批一次
      const request = parseStoredModificationRequest(score.modificationRequest, score.id)

      const updateResult = await tx.score.updateMany({
        where: {
          id: scoreId,
          status: { in: APPROVAL_REQUIRED_STATUSES },
          modificationRequest: score.modificationRequest,
        },
        data: {
          modificationRequest: null,
        },
      })

      if (updateResult.count === 0) {
        throw new ConflictError('该申请已被处理，请刷新后重试')
      }

      await tx.systemLog.create({
        data: {
          userId: approverId,
          action: 'score.modification.rejected',
          resourceType: 'score',
          resourceId: scoreId,
          details: {
            applicantId: request.applicantId,
            appliedAt: request.appliedAt,
            requestReason: request.reason,
            proposedChanges: request.proposedChanges,
            rejectReason: input.reason,
          } as unknown as Prisma.InputJsonValue,
        },
      })

      return {
        scoreId,
        rejected: true,
      }
    })
  },

  // 查看修改日志（管理员、录入教师、成绩所属学生）
  async getScoreModificationLogs(
    scoreId: string,
    requesterId: string,
    requesterRoles: string[],
    query: GetScoreModificationLogsQuery
  ): Promise<ScoreModificationLogsResult> {
    const score = await prisma.score.findUnique({
      where: { id: scoreId },
      select: {
        id: true,
        enteredBy: true,
        studentId: true,
        courseOffering: {
          select: {
            teacherId: true,
          },
        },
      },
    })

    if (!score) {
      throw new NotFoundError('成绩不存在')
    }

    const isAdmin = hasAnyRole(requesterRoles, ['admin', 'super_admin'])
    // 学生仅可查看本人相关日志，管理员可查看全部，教师需满足归属关系。
    const isOwnerTeacher =
      hasAnyRole(requesterRoles, ['teacher']) &&
      (score.enteredBy === requesterId || score.courseOffering?.teacherId === requesterId)
    const isOwnerStudent =
      hasAnyRole(requesterRoles, ['student']) && score.studentId === requesterId

    if (!isAdmin && !isOwnerTeacher && !isOwnerStudent) {
      throw new ForbiddenError('仅管理员、该成绩录入教师或成绩所属学生可查看修改日志')
    }

    const { page, pageSize } = query
    const skip = (page - 1) * pageSize

    const [rows, total] = await Promise.all([
      prisma.scoreModificationLog.findMany({
        where: { scoreId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          modifier: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
        },
      }),
      prisma.scoreModificationLog.count({ where: { scoreId } }),
    ])

    const items = rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      scoreId: row.scoreId,
      modifierId: row.modifierId,
      modifierUsername: row.modifier.username,
      modifierRealName: row.modifier.realName,
      oldValue: toScoreSnapshotFromJson(row.oldValue),
      newValue: toScoreSnapshotFromJson(row.newValue),
      reason: row.reason,
      createdAt: row.createdAt,
    }))

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  },
}
