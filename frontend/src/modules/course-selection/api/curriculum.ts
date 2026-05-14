import { courseSelectionRequest } from './client';
import type {
  CurriculumInfo,
  CurriculumCourseItem,
  CurriculumQuery,
  CurriculumProgress,
  CurriculumProgressQuery,
} from '../types/curriculum';

export const curriculumApi = {
  getMyCurriculum: (params?: CurriculumQuery) =>
    courseSelectionRequest.get<{
      curriculum: CurriculumInfo;
      courseGroups: CurriculumCourseItem[];
      studentId: string;
    }>(
      '/course-selection/curriculum/me',
      { params }
    ),
  getMyCurriculumProgress: (params?: CurriculumProgressQuery) =>
    courseSelectionRequest.get<{ progress: CurriculumProgress; studentId: string }>(
      '/course-selection/curriculum/me/progress',
      { params }
    ),
};
