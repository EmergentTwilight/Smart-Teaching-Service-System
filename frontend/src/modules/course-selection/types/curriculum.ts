export interface CurriculumInfo {
  id: string;
  name: string;
  year: number;
  major: {
    id: string;
    name: string;
    code: string;
  };
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

export interface CurriculumCourseGroup {
  courseType: 'required' | 'elective' | 'general';
  courseTypeName: string;
  courses: CurriculumCourseItem[];
}

export interface CurriculumConfirmation {
  requiredBeforeSelection: boolean;
  confirmed: boolean;
  message?: string;
}

export interface CurriculumPayload {
  curriculum: CurriculumInfo;
  courseGroups: CurriculumCourseGroup[];
  confirmation: CurriculumConfirmation;
}

export interface CurriculumCreditSummary {
  totalCredits: number;
  requiredCredits: number;
  electiveCredits: number;
  generalCredits?: number | null;
}

export interface CurriculumCourseTypeProgress {
  courseType: 'required' | 'elective' | 'general';
  selectedCredits: number;
  requirementCredits?: number | null;
  courseCount: number;
}

export interface CurriculumProgressWarning {
  code: string;
  message: string;
}

export interface CurriculumProgress {
  curriculumId: string;
  requirements: CurriculumCreditSummary;
  selected: CurriculumCreditSummary;
  remaining: Partial<CurriculumCreditSummary>;
  byCourseType: CurriculumCourseTypeProgress[];
  warnings: CurriculumProgressWarning[];
}
