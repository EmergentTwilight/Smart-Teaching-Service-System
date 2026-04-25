import type {
  BackendScoreRange,
  CourseType,
  CourseTypeInfo,
  GradeLetter,
  ScoreRange,
  ScoreRangeInfo,
  ScoreStatus,
  ScoreStatusInfo,
} from '../types/common-types';

export const SCORE_RANGES: Record<ScoreRange, ScoreRangeInfo> = {
  EXCELLENT: {
    range: 'EXCELLENT',
    label: '优秀',
    min: 90,
    max: 100,
    color: '#52c41a',
  },
  GOOD: {
    range: 'GOOD',
    label: '良好',
    min: 80,
    max: 89,
    color: '#1677ff',
  },
  PASS: {
    range: 'PASS',
    label: '及格',
    min: 60,
    max: 79,
    color: '#faad14',
  },
  FAIL: {
    range: 'FAIL',
    label: '不及格',
    min: 0,
    max: 59,
    color: '#ff4d4f',
  },
};

export const SCORE_RANGE_ARRAY = Object.values(SCORE_RANGES);

export function getScoreRange(score: number): ScoreRangeInfo {
  if (score >= 90) {
    return SCORE_RANGES.EXCELLENT;
  }
  if (score >= 80) {
    return SCORE_RANGES.GOOD;
  }
  if (score >= 60) {
    return SCORE_RANGES.PASS;
  }
  return SCORE_RANGES.FAIL;
}

export const BACKEND_RANGE_TO_SCORE_RANGE: Record<BackendScoreRange, ScoreRange> = {
  '90-100': 'EXCELLENT',
  '80-89': 'GOOD',
  '70-79': 'PASS',
  '60-69': 'PASS',
  '0-59': 'FAIL',
};

export function convertBackendRange(backendRange: BackendScoreRange): ScoreRangeInfo {
  return SCORE_RANGES[BACKEND_RANGE_TO_SCORE_RANGE[backendRange]];
}

export const SCORE_STATUS: Record<ScoreStatus, ScoreStatusInfo> = {
  DRAFT: {
    value: 'DRAFT',
    label: '草稿',
    color: 'default',
    isFinal: false,
  },
  SUBMITTED: {
    value: 'SUBMITTED',
    label: '已提交',
    color: 'processing',
    isFinal: true,
  },
  CONFIRMED: {
    value: 'CONFIRMED',
    label: '已确认',
    color: 'success',
    isFinal: true,
  },
};

export const SCORE_STATUS_ARRAY = Object.values(SCORE_STATUS);

export function isScoreEditable(status: ScoreStatus): boolean {
  return status === 'DRAFT';
}

export function isScoreFinal(status: ScoreStatus): boolean {
  return SCORE_STATUS[status].isFinal;
}

export const COURSE_TYPE: Record<CourseType, CourseTypeInfo> = {
  REQUIRED: {
    value: 'REQUIRED',
    label: '必修',
    color: '#ff7875',
  },
  ELECTIVE: {
    value: 'ELECTIVE',
    label: '选修',
    color: '#69c0ff',
  },
  GENERAL: {
    value: 'GENERAL',
    label: '通识',
    color: '#95de64',
  },
};

export const COURSE_TYPE_ARRAY = Object.values(COURSE_TYPE);

export const GRADE_LETTER_RANGES: Array<{
  letter: GradeLetter;
  min: number;
  max: number;
  point: number;
}> = [
  { letter: 'A+', min: 95, max: 100, point: 4.0 },
  { letter: 'A', min: 90, max: 94, point: 4.0 },
  { letter: 'A-', min: 85, max: 89, point: 3.7 },
  { letter: 'B+', min: 80, max: 84, point: 3.3 },
  { letter: 'B', min: 75, max: 79, point: 3.0 },
  { letter: 'B-', min: 70, max: 74, point: 2.7 },
  { letter: 'C+', min: 65, max: 69, point: 2.3 },
  { letter: 'C', min: 60, max: 64, point: 2.0 },
  { letter: 'D', min: 50, max: 59, point: 1.0 },
  { letter: 'F', min: 0, max: 49, point: 0.0 },
];

export function getGradeLetter(score: number): GradeLetter {
  return GRADE_LETTER_RANGES.find((item) => score >= item.min && score <= item.max)?.letter ?? 'F';
}

export function getGradePoint(score: number): number {
  return GRADE_LETTER_RANGES.find((item) => score >= item.min && score <= item.max)?.point ?? 0;
}

export const PASSING_SCORE = 60;

export const DEFAULT_PAGE_SIZE = 20;

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const SCORE_LIMITS = {
  MIN: 0,
  MAX: 100,
} as const;
