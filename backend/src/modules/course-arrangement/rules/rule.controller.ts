// rule.controller.ts
import { Request, Response } from 'express'
import { ruleService } from './rule.service.js'
import { success } from '../../../shared/utils/response.js'
import {
  ruleListResponseSchema,
  ruleResponseSchema,
  saveRuleResponseSchema,
  overviewStatsResponseSchema,
  setSchedulingRuleSchema,
  getRulesListSchema,
  idSchema,
  batchDeleteSchema,
} from './rule.types.js'

// 修改：同一处理方式，验证请求的类型 => 交给 service => 验证 result => 封装 response，这样不会出现类型错误

// 6.5.1 设置约束规则
export const setSchedulingRule = async (req: Request, res: Response) => {
  const validatedInput = setSchedulingRuleSchema.parse(req.body)
  const result = await ruleService.saveRule(validatedInput)
  const validatedData = saveRuleResponseSchema.parse(result)
  success(res, validatedData, '约束规则配置成功', result.isNew ? 201 : 200)
}

// 获取规则列表
export const getRulesList = async (req: Request, res: Response) => {
  const validatedInput = getRulesListSchema.parse(req.query)
  const data = await ruleService.getList(validatedInput)
  const validatedData = ruleListResponseSchema.parse(data)
  success(res, validatedData)
}

// 获取单条规则
export const getRuleById = async (req: Request, res: Response) => {
  const validatedInput = idSchema.parse(req.params)
  const rule = await ruleService.getById(validatedInput)
  const validatedData = ruleResponseSchema.parse(rule)
  success(res, validatedData)
}

// 删除单条规则
export const deleteRule = async (req: Request, res: Response) => {
  const validatedInput = idSchema.parse(req.params)
  await ruleService.deleteRule(validatedInput)
  success(res, null, '删除成功')
}

// 批量删除规则
export const batchDeleteRules = async (req: Request, res: Response) => {
  const validatedInput = batchDeleteSchema.parse(req.body)
  await ruleService.batchDelete(validatedInput)
  success(res, null, '批量删除成功')
}

// 获取排课概览统计：学期+课程数、教室总数
export const getSchedulingOverview = async (req: Request, res: Response) => {
  const data = await ruleService.getOverviewStats()
  const validatedData = overviewStatsResponseSchema.parse(data)
  success(res, validatedData)
}
