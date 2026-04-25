export type ScoreStatus = 'DRAFT' | 'SUBMITTED' | 'CONFIRMED';

export type CourseType = 'REQUIRED' | 'ELECTIVE' | 'GENERAL';

export type ScoreRange = 'EXCELLENT' | 'GOOD' | 'PASS' | 'FAIL';

export type BackendScoreRange = '0-59' | '60-69' | '70-79' | '80-89' | '90-100';

export type GradeLetter = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'D' | 'F';

export interface CourseInfo {
  id: string;
  code: string;
  name: string;
  type: CourseType;
  credits: number;
}

export interface SemesterInfo {
  id: string;
  name: string;
}

export interface StudentInfo {
  id: string;
  studentNumber: string;
  name: string;
  className?: string | null;
}

export interface TeacherInfo {
  id: string;
  teacherNumber: string;
  name: string;
  title?: string | null;
}

export interface ScoreComponents {
  usualScore: number | null;
  midtermScore: number | null;
  finalScore: number | null;
  totalScore: number | null;
}

export interface GradeInfo {
  letter: GradeLetter | null;
  point: number | null;
}

export interface ScoreEntryInfo {
  enteredBy: string | null;
  enteredAt: string | null;
  modifiedBy: string | null;
  modifiedAt: string | null;
}

export interface BaseScore {
  id: string;
  enrollmentId: string;
  courseOfferingId: string;
  course: CourseInfo;
  semester: SemesterInfo;
  scores: ScoreComponents;
  grade: GradeInfo;
  status: ScoreStatus;
  hasPendingModificationRequest?: boolean;
  entry: ScoreEntryInfo;
}

export interface ScoreRangeInfo {
  range: ScoreRange;
  label: string;
  min: number;
  max: number;
  color: string;
}

export interface ScoreStatusInfo {
  value: ScoreStatus;
  label: string;
  color: 'default' | 'processing' | 'success' | 'warning' | 'error';
  isFinal: boolean;
}

export interface CourseTypeInfo {
  value: CourseType;
  label: string;
  color: string;
}

export function isValidScoreStatus(value: string): value is ScoreStatus {
  return value === 'DRAFT' || value === 'SUBMITTED' || value === 'CONFIRMED';
}

export function isValidCourseType(value: string): value is CourseType {
  return value === 'REQUIRED' || value === 'ELECTIVE' || value === 'GENERAL';
}

export function isValidScore(score: number | null): score is number {
  return score !== null && score >= 0 && score <= 100;
}

export function isValidGradePoint(point: number | null): point is number {
  return point !== null && point >= 0 && point <= 4.0;
}
