// rule.service.ts
import { v4 as uuidv4 } from 'uuid' // 记得 pnpm add uuid
import prisma from '../../../shared/prisma/client.js'
import { RuleSaveInput, OverviewStats } from './rule.types.js'

export class RuleService {
  // rule.service.ts - saveRule 方法修改
  async saveRule(input: RuleSaveInput) {
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
      update: { rules: input.rules as any },
      create: {
        id: uuidv4(),
        targetType: input.targetType,
        targetId: input.targetId,
        rules: input.rules as any,
      },
    })

    return { ruleId: rule.id, isNew: !existing }
  }

  // 算法核心：获取所有规则并转换成 Map，方便排课时快速检索
  async getRulesMap() {
    const allRules = await prisma.rule.findMany()
    const map = new Map<string, any>()
    allRules.forEach((r) => {
      map.set(`${r.targetType}:${r.targetId}`, r.rules)
    })
    return map
  }

  // 获取规则列表（分页）
async getList(params: { page: number; pageSize: number; targetType?: string; keyword?: string }) {
  const where: any = {}
  if (params.targetType) where.targetType = params.targetType
  if (params.keyword) {
    where.OR = [
      { targetId: { contains: params.keyword } },
      { targetName: { contains: params.keyword } },
    ]
  }
  const [items, total] = await Promise.all([
    prisma.rule.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.rule.count({ where }),
  ])
  return {
    items,
    pagination: { page: params.page, pageSize: params.pageSize, total },
  }
}

// 获取单条规则
async getById(id: string) {
  return prisma.rule.findUniqueOrThrow({ where: { id } })
}

// 删除单条规则
async deleteRule(id: string) {
  await prisma.rule.delete({ where: { id } })
}

// 批量删除规则
async batchDelete(ids: string[]) {
  await prisma.rule.deleteMany({ where: { id: { in: ids } } })
}

// 获取学期列表（含课程数）和教室
async getOverviewStats(): Promise<OverviewStats> {
  const [semesters, classrooms] = await Promise.all([
    prisma.semester.findMany({
      select: {
        id: true,
        name: true,
        courseOfferings: {
          select: {
            id: true,
            course: { select: { name: true } }
          }
        }
      },
      orderBy: { startDate: 'desc' },
    }),
    prisma.classroom.findMany({
      select: { id: true, building: true, roomNumber: true }
    }),
  ])
  return {
    semesters: semesters.map(s => ({
      id: s.id,
      name: s.name,
      courseOfferings: s.courseOfferings.map(co => ({
        id: co.id,
        name: co.course.name
      }))
    })),
    classrooms: classrooms.map(c => ({
      id: c.id,
      name: `${c.building} ${c.roomNumber}`
    }))
  }
}
}

export const ruleService = new RuleService()
