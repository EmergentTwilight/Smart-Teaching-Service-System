import request from '@/shared/utils/request';
import { DEFAULT_PAGE_SIZE, isValidScoreStatus } from '../shared';
import type {
  CourseScoresPagination,
  CourseScoresQueryParams,
  ModificationRequestPayload,
  SaveDraftScoresPayload,
  SubmitScoresPayload,
  TeacherScoreRow,
  TeacherScoreStatus,
} from '../teacher/types';

type UnknownRecord = Record<string, unknown>;
type GradeLetter = TeacherScoreRow['gradeLetter'];

export interface CourseScoresApiResult {
  rows: TeacherScoreRow[];
  pagination: CourseScoresPagination;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getBoolean(value: unknown): boolean {
  return value === true;
}

function getGradeLetter(value: unknown): GradeLetter {
  if (
    value === 'A+' ||
    value === 'A' ||
    value === 'A-' ||
    value === 'B+' ||
    value === 'B' ||
    value === 'B-' ||
    value === 'C+' ||
    value === 'C' ||
    value === 'D' ||
    value === 'F'
  ) {
    return value;
  }

  return null;
}

function pickRecords(data: unknown): UnknownRecord[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }

  if (!isRecord(data)) {
    return [];
  }

  const candidates = [data.records, data.items, data.list, data.rows];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  return [];
}

function pickPagination(data: unknown, params?: CourseScoresQueryParams): CourseScoresPagination {
  if (!isRecord(data)) {
    return {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? DEFAULT_PAGE_SIZE,
      total: 0,
    };
  }

  const nestedPagination = isRecord(data.pagination) ? data.pagination : null;
  const page = getNumber(data.page) ?? getNumber(nestedPagination?.page) ?? params?.page ?? 1;
  const pageSize =
    getNumber(data.pageSize) ??
    getNumber(nestedPagination?.pageSize) ??
    params?.pageSize ??
    DEFAULT_PAGE_SIZE;
  const total =
    getNumber(data.total) ??
    getNumber(nestedPagination?.total) ??
    getNumber(data.count) ??
    (Array.isArray(data.records) ? data.records.length : Array.isArray(data.items) ? data.items.length : 0);

  return {
    page,
    pageSize,
    total,
  };
}

function deriveStatus(rawStatus: string | null, record: UnknownRecord): TeacherScoreStatus {
  if (rawStatus && isValidScoreStatus(rawStatus)) {
    return rawStatus;
  }

  const scores = isRecord(record.scores) ? record.scores : null;
  const hasAnyScore =
    getNumber(record.usualScore) !== null ||
    getNumber(record.midtermScore) !== null ||
    getNumber(record.finalScore) !== null ||
    getNumber(record.totalScore) !== null ||
    getNumber(scores?.usualScore) !== null ||
    getNumber(scores?.midtermScore) !== null ||
    getNumber(scores?.finalScore) !== null ||
    getNumber(scores?.totalScore) !== null;

  return hasAnyScore ? 'DRAFT' : 'EMPTY';
}

function normalizeRow(record: UnknownRecord, courseOfferingId: string): TeacherScoreRow {
  const student = isRecord(record.student) ? record.student : {};
  const scores = isRecord(record.scores) ? record.scores : {};
  const grade = isRecord(record.grade) ? record.grade : {};
  const entry = isRecord(record.entry) ? record.entry : {};

  const enrollmentId =
    getString(record.enrollmentId) ??
    getString(record.id) ??
    getString(student.enrollmentId) ??
    `${courseOfferingId}-${getString(student.studentNumber) ?? Math.random().toString(36).slice(2, 8)}`;

  const rawStatus = getString(record.status);

  return {
    id: enrollmentId,
    scoreId: getString(record.scoreId) ?? getString(record.id),
    enrollmentId,
    courseOfferingId,
    studentId: getString(record.studentId) ?? getString(student.id) ?? '',
    studentNumber: getString(record.studentNumber) ?? getString(student.studentNumber) ?? '--',
    studentName: getString(record.studentName) ?? getString(student.name) ?? '未命名学生',
    className: getString(record.className) ?? getString(student.className),
    usualScore: getNumber(record.usualScore) ?? getNumber(scores.usualScore),
    midtermScore: getNumber(record.midtermScore) ?? getNumber(scores.midtermScore),
    finalScore: getNumber(record.finalScore) ?? getNumber(scores.finalScore),
    totalScore: getNumber(record.totalScore) ?? getNumber(scores.totalScore),
    gradePoint: getNumber(record.gradePoint) ?? getNumber(grade.point),
    gradeLetter: getGradeLetter(record.gradeLetter) ?? getGradeLetter(grade.letter),
    status: deriveStatus(rawStatus, record),
    hasPendingModificationRequest:
      getBoolean(record.hasPendingModificationRequest) ||
      getBoolean(record.hasPendingRequest) ||
      getBoolean(record.pendingModificationRequest),
    enteredAt: getString(record.enteredAt) ?? getString(entry.enteredAt),
    modifiedAt: getString(record.modifiedAt) ?? getString(entry.modifiedAt),
  };
}

export function normalizeCourseScoresResult(
  data: unknown,
  courseOfferingId: string,
  params?: CourseScoresQueryParams,
): CourseScoresApiResult {
  const rows = pickRecords(data).map((record) => normalizeRow(record, courseOfferingId));

  return {
    rows,
    pagination: {
      ...pickPagination(data, params),
      total: pickPagination(data, params).total || rows.length,
    },
  };
}

export const scoreManagementApi = {
  getCourseScores(courseOfferingId: string, params?: CourseScoresQueryParams) {
    return request.get<unknown, unknown>(`/course-offerings/${courseOfferingId}/scores`, { params });
  },

  saveDraftScores(courseOfferingId: string, payload: SaveDraftScoresPayload) {
    return request.post<SaveDraftScoresPayload, unknown>(
      `/course-offerings/${courseOfferingId}/scores/draft`,
      payload,
    );
  },

  submitScores(courseOfferingId: string, payload: SubmitScoresPayload) {
    return request.post<SubmitScoresPayload, unknown>(
      `/course-offerings/${courseOfferingId}/scores/submit`,
      payload,
    );
  },

  createModificationRequest(scoreId: string, payload: ModificationRequestPayload) {
    return request.post<ModificationRequestPayload, unknown>(
      `/scores/${scoreId}/modification-request`,
      payload,
    );
  },
};
