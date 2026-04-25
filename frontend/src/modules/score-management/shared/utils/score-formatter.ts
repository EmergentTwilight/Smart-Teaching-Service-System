import type { CourseType, ScoreStatus } from '../types/common-types';
import {
  COURSE_TYPE,
  PASSING_SCORE,
  SCORE_RANGES,
  SCORE_STATUS,
  getGradeLetter,
} from '../constants/score-constants';

export function formatScore(score: number | null, placeholder = '--'): string {
  return score === null ? placeholder : `${score}`;
}

export function formatScoreWithDecimals(score: number | null, decimals = 2): string {
  return score === null ? '--' : score.toFixed(decimals);
}

export function isPassingScore(score: number | null): boolean {
  return score !== null && score >= PASSING_SCORE;
}

export function formatPassingStatus(score: number | null): string {
  if (score === null) {
    return '--';
  }
  return score >= PASSING_SCORE ? '及格' : '不及格';
}

export function formatGradeLetter(score: number | null): string {
  return score === null ? '--' : getGradeLetter(score);
}

export function formatGradePoint(point: number | null): string {
  return point === null ? '--' : point.toFixed(2);
}

export function formatScoreStatus(status: ScoreStatus): string {
  return SCORE_STATUS[status].label;
}

export function getScoreStatusColor(
  status: ScoreStatus,
): 'default' | 'processing' | 'success' | 'warning' | 'error' {
  return SCORE_STATUS[status].color;
}

export function canEditScore(status: ScoreStatus): boolean {
  return status === 'DRAFT';
}

export function isFinalScore(status: ScoreStatus): boolean {
  return SCORE_STATUS[status].isFinal;
}

export function formatCourseType(type: CourseType): string {
  return COURSE_TYPE[type].label;
}

export function getCourseTypeColor(type: CourseType): string {
  return COURSE_TYPE[type].color;
}

export function getScoreRangeInfo(score: number) {
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

export function formatScoreRange(score: number): string {
  return getScoreRangeInfo(score).label;
}

export function formatFullScore(score: number | null, gradeLetter?: string | null): string {
  if (score === null) {
    return '--';
  }
  return gradeLetter ? `${score} (${gradeLetter})` : `${score}`;
}

export function formatCredits(credits: number | null): string {
  if (credits === null) {
    return '--';
  }
  return Number.isInteger(credits) ? credits.toFixed(1) : `${credits}`;
}

export function formatDateTime(
  dateStr: string | null,
  format: 'date' | 'datetime' | 'time' = 'datetime',
): string {
  if (!dateStr) {
    return '--';
  }

  const date = new Date(dateStr);

  if (format === 'date') {
    return date.toLocaleDateString('zh-CN');
  }

  if (format === 'time') {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) {
    return '--';
  }

  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return '刚刚';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }
  if (diffDays < 7) {
    return `${diffDays} 天前`;
  }
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} 周前`;
  }
  if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)} 个月前`;
  }
  return `${Math.floor(diffDays / 365)} 年前`;
}
