export interface CurriculumInfo {
  id: string;
  name: string;
  year: number;
  majorName: string;
  totalCredits: number;
  requiredCredits?: number;
  electiveCredits?: number;
}

export interface CurriculumCourseItem {
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  courseType: 'required' | 'elective' | 'general';
  semesterSuggestion?: number | null;
  status?: string;
}

export interface CurriculumQuery {
  includeCourses?: boolean;
  include_courses?: boolean;
  courseType?: 'required' | 'elective' | 'general';
  page?: number;
  pageSize?: number;
}

export interface CurriculumProgressQuery {
  semesterId?: string;
  includeDropped?: boolean;
  include_dropped?: boolean;
}

export interface CurriculumProgress {
  totalSelectedCredits: number;
  requiredSelectedCredits: number;
  electiveSelectedCredits: number;
  generalSelectedCredits: number;
  totalCreditRatio: number;
}
