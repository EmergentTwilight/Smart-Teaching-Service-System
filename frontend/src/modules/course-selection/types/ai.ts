export type AiRecommendationCourseType = 'required' | 'elective' | 'general'

export interface AiRecommendationEligibilitySnapshot {
  isAvailable: boolean
  remainingCapacity?: number
  hasTimeConflict?: boolean
  prerequisiteSatisfied?: boolean
  isFull?: boolean
  isEnrolled?: boolean
  withinCurriculum?: boolean
  withinSelectionPeriod?: boolean
  underMaxCredits?: boolean
}

export interface AiRecommendation {
  courseOfferingId: string
  courseCode: string
  courseName: string
  credits: number
  teacherName: string
  recommendationScore: number
  reasons: string[]
  risks: string[]
  eligibilitySnapshot: AiRecommendationEligibilitySnapshot
}

export interface AiRecommendationPlan {
  id: 'balanced' | 'required_first' | 'low_risk'
  title: string
  rationale: string
  recommendations: AiRecommendation[]
  projectedCredits: number
  totalCredits?: number
  riskLevel: 'low' | 'medium' | 'high'
}

export interface AiConflictNote {
  courseOfferingId: string
  courseName: string
  message: string
}

export interface AiCreditProgressSummary {
  currentSelectedCredits: number
  targetCredits: number
  maxCredits: number
  remainingToTarget?: number
}

export type AiAdvisorMode = 'full' | 'rule_only' | 'template_only' | 'disabled'

export interface AiScoreBreakdown {
  totalCandidates: number
  safeCandidates: number
  blockedCandidates: number
}

export interface AiFallbackInfo {
  code: string
  reason: string
  retriable?: boolean
  source?: 'rule' | 'llm' | 'template' | 'service'
}

export interface AiAdvicePayload {
  disclaimer: string
  creditProgressSummary: AiCreditProgressSummary
  recommendations: AiRecommendation[]
  conflictNotes: AiConflictNote[]
  plans?: AiRecommendationPlan[]
  recommendationSummary?: string
  mode?: AiAdvisorMode
  suggestionMode?: AiAdvisorMode
  degradedMode: AiAdvisorMode
  llmUsed: boolean
  model: string | null
  fallbackInfo?: AiFallbackInfo
  scoreBreakdown?: AiScoreBreakdown
}

export interface AiRecommendPreferenceInput {
  targetCredits?: number
  preferredCourseTypes?: AiRecommendationCourseType[]
  avoidEarlyMorning?: boolean
  preferLowLoad?: boolean
  preferRequiredCourses?: boolean
  preferGraduationProgress?: boolean
  riskTolerance?: 'low' | 'medium' | 'high'
  naturalLanguagePreference?: string
}

export interface AiRecommendPayload {
  semesterId?: string
  preferences?: AiRecommendPreferenceInput
  maxRecommendations?: number
}

export interface AiExplainPayload {
  offeringId: string
  question?: string
}

export interface AiExplainPayloadResult {
  courseOfferingId: string
  courseName: string
  explanation: string
  hardRuleResult: {
    isSelectableNow: boolean
    reasons: string[]
  }
  disclaimer: string
  explanationSummary?: string
  degradedMode?: AiAdvisorMode
  llmUsed?: boolean
  model?: string | null
  fallbackInfo?: AiFallbackInfo
}
