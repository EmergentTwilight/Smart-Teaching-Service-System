import { courseSelectionRequest } from './client';
import type {
  CurriculumPayload,
  CurriculumQuery,
  CurriculumProgress,
  CurriculumProgressQuery,
} from '../types/curriculum';

export const curriculumApi = {
  getMyCurriculum: (params?: CurriculumQuery) =>
    courseSelectionRequest.get<CurriculumPayload>(
      '/course-selection/curriculum/me',
      { params }
    ),
  getMyCurriculumProgress: (params?: CurriculumProgressQuery) =>
    courseSelectionRequest.get<CurriculumProgress>(
      '/course-selection/curriculum/me/progress',
      { params }
    ),
};
