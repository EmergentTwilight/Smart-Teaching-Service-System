// rule.service.ts
import { Prisma } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid' // 记得 pnpm add uuid
import prisma from '../../../shared/prisma/client.js'
import {
  SchedulingRule,
  SetSchedulingRuleInput,
  BatchDeleteInput,
  GetRulesListInput,
  IdInput,
  OverviewStatsResponse,
  RuleListResponse,
  SaveRuleResponse,
  RuleResponse,
} from './rule.types.js'

function normalizeRule(rule: SchedulingRule): SchedulingRule {
  const requiredRoomType = rule.hardConstraints.requiredRoomType
  return {
    ...rule,
    hardConstraints: {
      ...rule.hardConstraints,
      requiredRoomType: requiredRoomType?.toUpperCase(),
    },
  }
}

export class RuleService {
  // rule.service.ts - saveRule 方法修改
  async saveRule(input: SetSchedulingRuleInput): Promise<SaveRuleResponse> {
    const normalizedRules = normalizeRule(input.rules)
    const existing = await prisma.rule.findUnique({
      where: {
        targetType_targetId: {
          targetType: input.targetType,
          targetId: input.targetId,
        },
      },
    })

    const rule = await prisma.rule.upsert({
      where: {
        targetType_targetId: {
          targetType: input.targetType,
          targetId: input.targetId,
        },
      },
      update: { rules: normalizedRules as SchedulingRule },
      create: {
        id: uuidv4(),
        targetType: input.targetType,
        targetId: input.targetId,
        rules: normalizedRules as SchedulingRule,
      },
    })

    return { ruleId: rule.id, isNew: !existing }
  }

  // 算法核心：获取所有规则并转换成 Map，方便排课时快速检索
  async getRulesMap(): Promise<Map<string, SchedulingRule>> {
    const allRules = await prisma.rule.findMany()
    const map = new Map<string, SchedulingRule>()
    allRules.forEach((r) => {
      map.set(`${r.targetType}:${r.targetId}`, normalizeRule(r.rules as SchedulingRule))
    })
    return map
  }

  // 获取规则列表（分页）
  async getList(input: GetRulesListInput): Promise<RuleListResponse> {
    const where: Prisma.RuleWhereInput = {}
    if (input.targetType) where.targetType = input.targetType
    if (input.keyword) {
      where.OR = [
        { targetId: { contains: input.keyword } },
        // 如果需要搜索规则内容，可以取消下面的注释
        // { rules: { path: ['$'], string_contains: params.keyword } }
      ]
    }
    const [items, total] = await Promise.all([
      prisma.rule.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.rule.count({ where }),
    ])
    return {
      items: items.map((item) => ({
        ...item,
        rules: normalizeRule(item.rules as SchedulingRule),
      })) as RuleResponse[],
      pagination: { page: input.page, pageSize: input.pageSize, total },
    }
  }

  // 获取单条规则
  async getById(input: IdInput): Promise<RuleResponse> {
    const rule = await prisma.rule.findUniqueOrThrow({ where: input })
    return {
      ...rule,
      rules: normalizeRule(rule.rules as SchedulingRule),
    } as RuleResponse
  }

  // 删除单条规则
  async deleteRule(input: IdInput): Promise<void> {
    await prisma.rule.delete({ where: input })
  }

  // 批量删除规则
  async batchDelete(input: BatchDeleteInput): Promise<void> {
    await prisma.rule.deleteMany({ where: { id: { in: input['ids'] } } })
  }

  // 获取学期列表（含课程数）和教室
  async getOverviewStats(): Promise<OverviewStatsResponse> {
    const [semesters, classrooms] = await Promise.all([
      prisma.semester.findMany({
        select: {
          id: true,
          name: true,
          courseOfferings: {
            select: {
              id: true,
              course: { select: { name: true } },
            },
          },
        },
        orderBy: { startDate: 'desc' },
      }),
      prisma.classroom.findMany({
        select: { id: true, building: true, roomNumber: true },
      }),
    ])
    return {
      semesters: semesters.map((s) => ({
        id: s.id,
        name: s.name,
        courseOfferings: s.courseOfferings.map((co) => ({
          id: co.id,
          name: co.course.name,
        })),
      })),
      classrooms: classrooms.map((c) => ({
        id: c.id,
        name: `${c.building} ${c.roomNumber}`,
      })),
    }
  }
}

export const ruleService = new RuleService()
