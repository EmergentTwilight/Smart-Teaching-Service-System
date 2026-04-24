// rule.controller.ts
import { Request, Response } from 'express'
import { ruleService } from './rule.service.js'
import { success } from '../../../shared/utils/response.js'
import { ruleSaveInputSchema } from './rule.types.js'
import { ValidationError } from '@stss/shared'

// 6.5.1 设置约束规则
export const setSchedulingRule = async (req: Request, res: Response) => {
  const parsed = ruleSaveInputSchema.safeParse(req.body)
  if (!parsed.success) throw new ValidationError(parsed.error.errors.map(e => e.message).join(', '))
  const result = await ruleService.saveRule(parsed.data)
  success(res, { ruleId: result.ruleId }, '约束规则配置成功', result.isNew ? 201 : 200)
}

// 获取规则列表
export const getRulesList = async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20, targetType, keyword } = req.query
  // ... 实现分页查询逻辑
  const data = await ruleService.getList({ page: Number(page), pageSize: Number(pageSize), targetType, keyword })
  success(res, data)
}

// 获取单条规则
export const getRuleById = async (req: Request, res: Response) => {
  const { id } = req.params
  const rule = await ruleService.getById(id)
  success(res, rule)
}

// 删除单条规则
export const deleteRule = async (req: Request, res: Response) => {
  const { id } = req.params
  await ruleService.deleteRule(id)
  success(res, null, '删除成功')
}

// 批量删除规则
export const batchDeleteRules = async (req: Request, res: Response) => {
  const { ids } = req.body
  // ids 应为 string[]
  await ruleService.batchDelete(ids)
  success(res, null, '批量删除成功')
}

// 获取排课概览统计：学期+课程数、教室总数
export const getSchedulingOverview = async (req: Request, res: Response) => {
  const data = await ruleService.getOverviewStats()
  success(res, data)
}