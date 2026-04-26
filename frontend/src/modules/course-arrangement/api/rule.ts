// frontend/src/modules/course-arrangement/api/constraint.ts
import request from '@/shared/utils/request'
import {
  batchDeleteSchema,
  idSchema,
  getRulesListSchema,
  ruleListResponseSchema,
  ruleResponseSchema,
  saveRuleResponseSchema,
  overviewStatsResponseSchema,
  setSchedulingRuleSchema,
  SetSchedulingRuleInput,
  GetRulesListInput,
  BatchDeleteInput,
  IdInput,
  RuleListResponse,
  RuleResponse,
  SaveRuleResponse,
  OverviewStatsResponse,
} from '../types/rule.js'

const BASE_PATH = '/course-arrangement/rules'

export const rulesApi = {
  getList: async (input: GetRulesListInput): Promise<RuleListResponse> => {
    const validatedInput = getRulesListSchema.parse(input)
    const data = await request.get(BASE_PATH, { params: validatedInput })
    return ruleListResponseSchema.parse(data) // Zod 验证
  },

  getById: async (input: IdInput): Promise<RuleResponse> => {
    const validatedInput = idSchema.parse(input)
    const data = await request.get(`${BASE_PATH}/${validatedInput.id}`)
    return ruleResponseSchema.parse(data) // Zod 验证
  },

  /** 创建或更新规则 */
  save: async (input: SetSchedulingRuleInput): Promise<SaveRuleResponse> => {
    const validatedInput = setSchedulingRuleSchema.parse(input) // 请求参数验证
    const result = await request.post(BASE_PATH, validatedInput)
    return saveRuleResponseSchema.parse(result) // 响应验证
  },

  delete: async (input: IdInput): Promise<void> => {
    const validatedInput = idSchema.parse(input)
    await request.delete(`${BASE_PATH}/${validatedInput.id}`)
  },

  batchDelete: async (input: BatchDeleteInput): Promise<void> => {
    const validatedInput = batchDeleteSchema.parse(input)
    await request.post(`${BASE_PATH}/batch-delete`, validatedInput)
  },

  /** 获取排课概览统计（学期+课程数、教室） */
  getOverview: async (): Promise<OverviewStatsResponse> => {
    const result = await request.get(`${BASE_PATH}/overview`)
    return overviewStatsResponseSchema.parse(result) // Zod 验证
  },
}
