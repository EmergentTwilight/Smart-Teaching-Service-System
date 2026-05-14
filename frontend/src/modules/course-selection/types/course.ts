export interface CourseListItem {
  id: string;
  code: string;
  name: string;
  credits: number;
  courseType: 'REQUIRED' | 'ELECTIVE' | 'GENERAL';
  status?: string;
}

export interface CourseSearchParams {
  keyword?: string;
  teacher?: string;
  semesterId?: string;
  courseType?: string;
  offeringStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface CourseOfferingItem {
  id: string;
  courseId: string;
  semesterId: string;
  semesterName: string;
  courseName: string;
  courseCode: string;
  credits: number;
  courseType: 'REQUIRED' | 'ELECTIVE' | 'GENERAL';
  teacherId: string;
  teacherName: string;
  capacity: number;
  enrolledCount: number;
  offeringStatus: 'PLANNED' | 'OPEN' | 'CLOSED' | 'CANCELLED';
  isAvailable: boolean;
  hasConflictHint?: string;
  prerequisiteHint?: string;
}

export interface OfferingsAvailableQuery {
  keyword?: string;
  teacher?: string;
  semesterId?: string;
  courseType?: string;
  offeringStatus?: string;
  onlyAvailable?: boolean;
  includeConflictReasons?: boolean;
  includeUnavailable?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CourseOfferingDetail {
  id: string;
  courseId: string;
  semesterId: string;
  semesterName: string;
  courseName: string;
  courseCode: string;
  credits: number;
  courseType: 'REQUIRED' | 'ELECTIVE' | 'GENERAL';
  teacherId: string;
  teacherName: string;
  capacity: number;
  enrolledCount: number;
  offeringStatus: 'PLANNED' | 'OPEN' | 'CLOSED' | 'CANCELLED';
  isAvailable: boolean;
  description?: string;
  assessmentMethod?: string;
  schedules: CourseOfferingSchedule[];
  prerequisites: CourseOfferingPrerequisite[];
}

export interface CourseOfferingSchedule {
  dayOfWeek: number;
  startWeek: number;
  endWeek: number;
  startPeriod: number;
  endPeriod: number;
  classroomName?: string;
}

export interface CourseOfferingPrerequisite {
  courseCode: string;
  courseName: string;
}
