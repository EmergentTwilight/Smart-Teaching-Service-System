import type { CourseEligibilitySnapshot } from '../types/course';

interface ReasonPriority {
  matches: (reason: string) => boolean;
}

export interface EligibilityDisplay {
  statusLabel: '已选' | '可选' | '不可选' | '未知';
  statusColor: 'blue' | 'success' | 'error' | 'default';
  visibleReasons: string[];
  isEnrolled: boolean;
  isAvailable: boolean;
}

const UNAVAILABLE_REASON_PRIORITY: ReasonPriority[] = [
  { matches: (reason) => reason.includes('容量') || reason.includes('已满') },
  { matches: (reason) => reason.includes('时间冲突') },
  { matches: (reason) => reason.includes('先修') },
  { matches: (reason) => reason.includes('培养方案') },
  { matches: (reason) => reason.includes('阶段') || reason.includes('时间段') },
];

const pickPrimaryUnavailableReason = (reasons: string[]) => {
  for (const priority of UNAVAILABLE_REASON_PRIORITY) {
    const reason = reasons.find(priority.matches);
    if (reason) {
      return reason;
    }
  }

  return reasons[0];
};

export const getEligibilityDisplay = (
  eligibility?: CourseEligibilitySnapshot | null
): EligibilityDisplay => {
  if (!eligibility) {
    return {
      statusLabel: '未知',
      statusColor: 'default',
      visibleReasons: [],
      isEnrolled: false,
      isAvailable: false,
    };
  }

  if (eligibility.isEnrolled) {
    return {
      statusLabel: '已选',
      statusColor: 'blue',
      visibleReasons: [],
      isEnrolled: true,
      isAvailable: false,
    };
  }

  if (eligibility.isAvailable) {
    return {
      statusLabel: '可选',
      statusColor: 'success',
      visibleReasons: eligibility.reasons,
      isEnrolled: false,
      isAvailable: true,
    };
  }

  const primaryReason = pickPrimaryUnavailableReason(eligibility.reasons);

  return {
    statusLabel: '不可选',
    statusColor: 'error',
    visibleReasons: primaryReason ? [primaryReason] : [],
    isEnrolled: false,
    isAvailable: false,
  };
};
