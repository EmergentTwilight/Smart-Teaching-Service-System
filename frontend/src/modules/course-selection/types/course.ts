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

export interface CourseOfferingSchedule {
  id?: string;
  dayOfWeek: number;
  startWeek: number;
  endWeek: number;
  startPeriod: number;
  endPeriod: number;
  classroom?: {
    building?: string | null;
    roomNumber?: string | null;
    campus?: string | null;
  } | null;
  notes?: string | null;
}

export interface CourseOfferingListItem {
  courseOfferingId: string;
  course: {
    id: string;
    code: string;
    name: string;
    credits: number;
    courseType: 'required' | 'elective' | 'general';
  };
  semester: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    realName: string;
    teacherNumber?: string | null;
  };
  capacity: number;
  enrolledCount: number;
  remainingCapacity: number;
  status: 'planned' | 'open' | 'closed' | 'cancelled';
  schedules: CourseOfferingSchedule[];
}

export interface CourseEligibilitySnapshot {
  isAvailable: boolean;
  isEnrolled?: boolean;
  isFull?: boolean;
  hasTimeConflict?: boolean;
  prerequisiteSatisfied?: boolean;
  withinCurriculum?: boolean;
  reasons: string[];
}

export interface AvailableOfferingItem {
  courseOfferingId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  courseType: 'required' | 'elective' | 'general';
  teacherName: string;
  capacity: number;
  enrolledCount: number;
  remainingCapacity: number;
  status: 'planned' | 'open' | 'closed' | 'cancelled';
  eligibility: CourseEligibilitySnapshot;
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
  courseOfferingId: string;
  course: {
    id: string;
    code: string;
    name: string;
    credits: number;
    courseType: 'required' | 'elective' | 'general';
    category?: string | null;
    description?: string | null;
    assessmentMethod?: string | null;
    status: 'active' | 'archived';
  };
  semester: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    realName: string;
    teacherNumber?: string | null;
    title?: string | null;
  };
  capacity: number;
  enrolledCount: number;
  remainingCapacity: number;
  status: 'planned' | 'open' | 'closed' | 'cancelled';
  schedules: CourseOfferingSchedule[];
  prerequisites: CourseOfferingPrerequisite[];
  eligibility?: Pick<CourseEligibilitySnapshot, 'isAvailable' | 'reasons'>;
}

export interface CourseOfferingPrerequisite {
  courseId?: string;
  courseCode: string;
  courseName: string;
}
