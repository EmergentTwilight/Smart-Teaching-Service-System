export type AiRecommendationCourseType = 'required' | 'elective' | 'general'

export interface AiCourseScoreBreakdown {
  curriculumMatch: number
  creditGapFit: number
  scheduleFit: number
  preferenceFit: number
  capacityFit: number
  riskInverse: number
}

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
  reasons?: string[]
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
  scoreBreakdown?: AiCourseScoreBreakdown
}

export interface AiRecommendationPlan {
  id: 'balanced' | 'required_first' | 'low_risk'
  title: string
  rationale: string
  recommendations: AiRecommendation[]
  projectedCredits: number
  totalCredits?: number
  riskLevel: 'low' | 'medium' | 'high'
  planScore?: number
  keyTradeoffs?: string[]
}

export interface AiConflictNote {
  courseOfferingId: string
  courseName: string
  message: string
}

export interface AiCreditProgressSummary {
  currentSelectedCredits: number
  completedCredits?: number
  inProgressCredits?: number
  projectedCredits?: number
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

export interface AiProgressAudit {
  currentSelectedCredits: number
  completedCredits?: number
  inProgressCredits?: number
  projectedCredits?: number
  targetCredits: number
  maxCredits: number | null
  requiredGap: number
  electiveGap: number
  generalGap: number
  priorityGaps: Array<{
    courseType: AiRecommendationCourseType
    gapCredits: number
    urgency: 'low' | 'medium' | 'high'
    reason: string
  }>
}

export interface AiScheduleLoad {
  earlyMorningCount: number
  denseDays: string[]
  loadScore: number
  loadLevel: 'low' | 'medium' | 'high'
  notes: string[]
}

export interface AiCapacityRisk {
  courseOfferingId: string
  courseName: string
  remainingCapacity: number
  fillRate: number
  riskLevel: 'low' | 'medium' | 'high'
  riskReason: string
}

export interface AiProviderDiagnostics {
  provider: 'openrouter'
  model?: string | null
  endpointHost?: string | null
  statusCode?: number
  providerCode?: string
  providerMessage?: string
  providerRawErrorSummary?: string
  finishReason?: string
  nativeFinishReason?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  reasoningTokens?: number
  retryAfter?: string | null
  durationMs?: number
  retriable?: boolean
}

export interface AiFallbackInfo {
  code: string
  reason: string
  retriable?: boolean
  source?: 'rule' | 'llm' | 'template' | 'service'
  mode?: AiAdvisorMode
  missingComponents?: string[]
  llmUsed?: boolean
  model?: string | null
  stage?: 'preference' | 'recommendation' | 'explanation' | 'rule'
  diagnostics?: AiProviderDiagnostics
}

export type AiDebugStageName = 'preference' | 'recommendation' | 'explanation' | 'rule'
export type AiDebugStageStatus = 'skipped' | 'success' | 'failed' | 'fallback'

export interface AiDebugStage extends AiProviderDiagnostics {
  stage: AiDebugStageName
  status: AiDebugStageStatus
  reason?: string
}

export interface AiDebugInfo {
  requestId: string
  endpoint: 'recommend' | 'explain'
  llmTimeoutMs: number
  generatedAt: string
  stages: AiDebugStage[]
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
  progressAudit?: AiProgressAudit
  scheduleLoad?: AiScheduleLoad
  capacityRisks?: AiCapacityRisk[]
  requestId?: string
  debugInfo?: AiDebugInfo
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
  debugInfo?: AiDebugInfo
}

export type AiAdvisorSavedRecordType = 'recommendation' | 'explanation'

export interface SaveAiAdvisorRecordPayload {
  recordType: AiAdvisorSavedRecordType
  title?: string
  question?: string
  semesterId?: string
  courseOfferingId?: string
  requestPayload?: Record<string, unknown> | null
  resultPayload: Record<string, unknown>
}

export interface AiAdvisorSavedRecord {
  id: string
  studentId: string
  semesterId: string | null
  courseOfferingId: string | null
  recordType: AiAdvisorSavedRecordType
  title: string
  question: string | null
  requestPayload: Record<string, unknown> | null
  resultPayload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface AiAdvisorSavedRecordQuery {
  page?: number
  pageSize?: number
  recordType?: AiAdvisorSavedRecordType
  semesterId?: string
}

export interface AiAdvisorSavedRecordListPayload {
  items: AiAdvisorSavedRecord[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
