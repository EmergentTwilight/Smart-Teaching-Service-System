import type { GradeLetter, ScoreStatus } from '../shared';

export type TeacherScoreStatus = ScoreStatus | 'EMPTY';

export interface EditableScoreValues {
  usualScore: number | null;
  midtermScore: number | null;
  finalScore: number | null;
}

export type DraftScorePatch = Partial<EditableScoreValues>;

export interface TeacherScoreRow extends EditableScoreValues {
  id: string;
  scoreId: string | null;
  enrollmentId: string;
  courseOfferingId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  className: string | null;
  totalScore: number | null;
  gradePoint: number | null;
  gradeLetter: GradeLetter | null;
  status: TeacherScoreStatus;
  hasPendingModificationRequest: boolean;
  enteredAt: string | null;
  modifiedAt: string | null;
}

export interface CourseScoresQueryParams {
  page?: number;
  pageSize?: number;
}

export interface CourseScoresPagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface SaveDraftScoreInput extends EditableScoreValues {
  enrollmentId: string;
  scoreId?: string | null;
}

export interface SaveDraftScoresPayload {
  scores: SaveDraftScoreInput[];
}

export interface SubmitScoresPayload {
  scoreIds: string[];
}

export interface ModificationRequestPayload extends EditableScoreValues {
  reason: string;
}
