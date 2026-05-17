export interface AiRecommendation {
  offeringId: string;
  courseCode: string;
  courseName: string;
  teacherName: string;
  score: number;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface AiAdvicePayload {
  recommendations: AiRecommendation[];
  creditImpactSummary: string;
  conflictWarnings: string[];
  explanation: string;
  isDraftAdviceOnly: boolean;
}

export interface AiExplainPayload {
  offeringId: string;
  question?: string;
  studentContext?: Record<string, unknown>;
}

export interface AiExplainPayloadResult {
  advice: string;
  recommendations: AiRecommendation[];
  fallback: string;
}

export interface AiRecommendPayload {
  semesterId?: string;
  preferences?: Record<string, unknown>;
  maxRecommendations?: number;
}
