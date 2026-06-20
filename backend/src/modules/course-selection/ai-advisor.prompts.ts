import type { LlmCompletionResult } from './ai-advisor.llm-client.js'

export type LlmMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface PreferenceProfileInput {
  targetCredits?: number | null
  preferredCourseTypes: ('required' | 'elective' | 'general')[]
  avoidEarlyMorning: boolean
  preferLowLoad: boolean
  preferRequiredCourses: boolean
  preferGraduationProgress: boolean
  riskTolerance: 'low' | 'medium' | 'high'
  naturalLanguagePreference?: string
}

export interface PreferenceLlmOutput {
  targetCredits?: number
  preferredCourseTypes?: Array<'required' | 'elective' | 'general'>
  avoidEarlyMorning?: boolean
  preferLowLoad?: boolean
  preferRequiredCourses?: boolean
  preferGraduationProgress?: boolean
  riskTolerance?: 'low' | 'medium' | 'high'
  naturalLanguagePreference?: string
}

export interface StrategyPromptInput {
  maxRecommendations: number
  profile: PreferenceProfileInput
  candidates: Array<{
    id: string
    courseCode: string
    courseName: string
    credits: number
    courseType: string
    teacherName: string
    remainingCapacity: number
    riskHints: string[]
    score: number
  }>
  fallbackContext?: {
    currentCredits?: number
    maxCredits?: number | null
    curriculumTotal?: number
  }
}

export interface SingleExplainPromptInput {
  course: {
    id: string
    code: string
    name: string
    credits: number
    teacherName: string
    remainingCapacity: number
  }
  hardRuleResult: {
    isSelectableNow: boolean
    reasons: string[]
  }
  currentCredits: number
  maxCredits: number | null
  question: string
  preferenceHint?: string
}

export interface ParsedLlmPlan {
  id:
    | 'balanced'
    | 'required_first'
    | 'low_risk'
    | 'safe'
    | 'gap_filling'
    | 'low_load'
  title: string
  rationale: string
  recommendationIds: string[]
  riskLevel?: 'low' | 'medium' | 'high'
}

export interface ParsedLlmStrategy {
  plans?: ParsedLlmPlan[]
  recommendationSummary?: string
}

export interface ParsedExplainOutput {
  explanation: string
  disclaimer: string
}

const trimJsonPayload = (content: string): string => {
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return content.slice(start, end + 1)
  }
  return content.trim()
}

const parseJsonObject = <T>(content: string): T | null => {
  try {
    return JSON.parse(trimJsonPayload(content)) as T
  } catch {
    return null
  }
}

export const buildPreferenceInterpretPrompt = (raw: Record<string, unknown>): string => {
  const payload = {
    targetCredits: raw.targetCredits,
    preferredCourseTypes: raw.preferredCourseTypes,
    avoidEarlyMorning: raw.avoidEarlyMorning,
    preferLowLoad: raw.preferLowLoad,
    preferRequiredCourses: raw.preferRequiredCourses,
    preferGraduationProgress: raw.preferGraduationProgress,
    riskTolerance: raw.riskTolerance,
    naturalLanguagePreference: raw.naturalLanguagePreference,
  }

  return [
    '你是课程偏好解析器。请只返回 JSON，不要输出 Markdown。',
    '把学生输入转为结构化字段。',
    JSON.stringify(payload),
    '输出字段约束：',
    JSON.stringify(
      {
        targetCredits: 'number，可空',
        preferredCourseTypes: ['required|elective|general 数组，可空'],
        avoidEarlyMorning: 'boolean，可空',
        preferLowLoad: 'boolean，可空',
        preferRequiredCourses: 'boolean，可空',
        preferGraduationProgress: 'boolean，可空',
        riskTolerance: 'low|medium|high，可空',
        naturalLanguagePreference: 'string，可空',
      },
      null,
      2
    ),
  ].join('\n')
}

export const buildStrategyPrompt = ({
  maxRecommendations,
  profile,
  candidates,
  fallbackContext,
}: StrategyPromptInput): string => {
  const payload = {
    constraints: {
      maxRecommendations,
      targetCredits: profile.targetCredits,
      preferredCourseTypes: profile.preferredCourseTypes,
      avoidEarlyMorning: profile.avoidEarlyMorning,
      preferLowLoad: profile.preferLowLoad,
      preferRequiredCourses: profile.preferRequiredCourses,
      preferGraduationProgress: profile.preferGraduationProgress,
      riskTolerance: profile.riskTolerance,
      fallbackContext,
    },
    candidate_pool: candidates.map((item) => ({
      course_offering_id: item.id,
      course_code: item.courseCode,
      course_name: item.courseName,
      credits: item.credits,
      course_type: item.courseType,
      teacher_name: item.teacherName,
      remaining_capacity: item.remainingCapacity,
      score_hint: item.score,
      risk_hints: item.riskHints,
    })),
  }

  return [
    '你是 STSS C6 策略规划 Agent，只能输出课程 ID 组合，不得编造。',
    '输入为 safe_candidate_pool（已通过硬规则），每个 ID 必须来自 candidate_pool。',
    '输出要求：严格 JSON，不要 Markdown。',
    '{',
    '  "plans": [',
    '    {',
    '      "id": "balanced|required_first|low_risk",',
    '      "title": "方案标题",',
    '      "rationale": "方案说明，2-3 句",',
    '      "recommendationIds": ["uuid1", "uuid2"],',
    '      "riskLevel": "low|medium|high"',
    '    }',
    '  ],',
    '  "recommendationSummary": "总体说明"',
    '}',
    '补充规则：',
    `- 每个方案最多 ${maxRecommendations} 门课程。`,
    '- 不输出重复 ID；不输出不在 pool 中的 ID。',
    '- 如条件不满足可返回空列表（但 JSON 格式必须完整）。',
    `输入上下文：${JSON.stringify(payload)}`,
  ].join('\n')
}

export const buildSingleExplainPrompt = ({
  course,
  hardRuleResult,
  currentCredits,
  maxCredits,
  question,
  preferenceHint,
}: SingleExplainPromptInput): string => {
  return [
    '你是课程解释器，只能根据已校验规则给出解释，不得改变硬规则结果。',
    '返回 JSON，包含 explanation 与 disclaimer，必须是中文。',
    `课程：${course.code} ${course.name}（${course.credits} 学分）`,
    `授课教师：${course.teacherName}`,
    `硬性可选性：${hardRuleResult.isSelectableNow ? '可选' : '不可选'}`,
    `原因：${hardRuleResult.reasons.join('；') || '未发现明确阻断'}`,
    `当前已选学分：${currentCredits}`,
    maxCredits === null ? '' : `当前阶段上限：${maxCredits}`,
    `教师提问：${question}`,
    `偏好上下文：${preferenceHint ?? '无'}`,
    `剩余容量：${course.remainingCapacity}`,
    'JSON 格式示例：{',
    '  "explanation": "...",',
    '  "disclaimer": "AI 建议仅供参考，最终是否选课以提交选课时的服务端校验结果为准。"',
    '}',
    '要求：',
    '1) 不要承诺选课成功；',
    '2) 不能与硬规则冲突；',
    '3) 可适度解释学分影响。',
  ].join('\n')
}

export const parseLlmPreference = (raw: string): PreferenceLlmOutput | null => {
  const parsed = parseJsonObject<PreferenceLlmOutput>(raw)
  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  return parsed
}

export const parsePlansFromLlm = (raw: LlmCompletionResult | string | null): ParsedLlmStrategy | null => {
  if (!raw) {
    return null
  }

  const content = typeof raw === 'string' ? raw : raw.content
  if (!content) {
    return null
  }

  const parsed = parseJsonObject<ParsedLlmStrategy>(content)
  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  return {
    plans: parsed.plans,
    recommendationSummary: parsed.recommendationSummary,
  }
}

export const parseExplainFromLlm = (
  raw: LlmCompletionResult | string | null
): ParsedExplainOutput | null => {
  if (!raw) {
    return null
  }

  const content = typeof raw === 'string' ? raw : raw.content
  if (!content) {
    return null
  }

  const parsed = parseJsonObject<ParsedExplainOutput>(content)
  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  if (typeof parsed.explanation !== 'string' || typeof parsed.disclaimer !== 'string') {
    return null
  }

  return {
    explanation: parsed.explanation.trim(),
    disclaimer: parsed.disclaimer.trim(),
  }
}
