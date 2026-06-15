export interface AiRecommendation {
  courseOfferingId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  teacherName: string;
  recommendationScore: number;
  reasons: string[];
  risks: string[];
  eligibilitySnapshot: {
    isAvailable: boolean;
    remainingCapacity?: number;
    hasTimeConflict?: boolean;
    prerequisiteSatisfied?: boolean;
  };
}

export interface AiCreditProgressSummary {
  currentSelectedCredits: number;
  targetCredits: number;
  maxCredits: number;
}

export interface AiConflictNote {
  courseOfferingId: string;
  courseName: string;
  message: string;
}

export interface AiAdvicePayload {
  disclaimer: string;
  creditProgressSummary: AiCreditProgressSummary;
  recommendations: AiRecommendation[];
  conflictNotes: AiConflictNote[];
}

export interface AiExplainPayload {
  offeringId: string;
  question?: string;
}

export interface AiExplainPayloadResult {
  courseOfferingId: string;
  courseName: string;
  explanation: string;
  hardRuleResult: {
    isSelectableNow: boolean;
    reasons: string[];
  };
  disclaimer: string;
}

export interface AiRecommendPayload {
  semesterId?: string;
  preferences?: Record<string, unknown>;
  maxRecommendations?: number;
}
