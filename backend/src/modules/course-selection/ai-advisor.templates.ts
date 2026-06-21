export const AI_PLAN_TITLES = {
  balanced: '稳妥稳选',
  required_first: '补短板优先',
  low_risk: '轻负担优先',
} as const

export const buildFallbackPlanTitle = (planId: keyof typeof AI_PLAN_TITLES): string =>
  AI_PLAN_TITLES[planId]

export const getFallbackSummary = (): string =>
  '未能调用可用的 AI 策略模型时，系统已按规则与偏好生成降级推荐。' +
  '结果仅用于辅助决策，请先按课程详情与后续流程确认。'

export const getFallbackPlanRationale = (planId: keyof typeof AI_PLAN_TITLES): string => {
  switch (planId) {
    case 'balanced':
      return '按可选性优先、课程类型与容量平衡，兼顾培养方案推进与课表稳定。'
    case 'required_first':
      return '优先补齐培养方案缺口，优先选择必修/学分更紧缺的课程。'
    case 'low_risk':
      return '优先减少课表风险与容量紧张课程，兼顾选课成功率。'
    default:
      return '系统规则生成的兜底推荐。'
  }
}
