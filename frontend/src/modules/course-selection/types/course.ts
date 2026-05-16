export interface CourseListItem {
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  courseType: 'required' | 'elective' | 'general';
  category?: string;
  assessmentMethod?: string;
  status: 'active' | 'archived';
  offeringSummary?: {
    openCount: number;
    plannedCount: number;
    latestSemesterName?: string;
  };
}

export interface CourseSearchParams {
  keyword?: string;
  teacher?: string;
  semesterId?: string;
  courseType?: string;
  status?: string;
  offeringStatus?: string;
  availableOnly?: boolean;
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
  courseType: 'required' | 'elective' | 'general';
  teacherId: string;
  teacherName: string;
  capacity: number;
  enrolledCount: number;
  offeringStatus: 'planned' | 'open' | 'closed' | 'cancelled';
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
  courseType: 'required' | 'elective' | 'general';
  teacherId: string;
  teacherName: string;
  capacity: number;
  enrolledCount: number;
  offeringStatus: 'planned' | 'open' | 'closed' | 'cancelled';
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
