import { courseSelectionRequest } from './client';
import type {
  CurriculumPayload,
  CurriculumQuery,
  CurriculumConfirmationPayload,
  CurriculumProgress,
  CurriculumProgressQuery,
} from '../types/curriculum';

export const curriculumApi = {
  getMyCurriculum: (params?: CurriculumQuery) =>
    courseSelectionRequest.get<CurriculumPayload>(
      '/course-selection/curriculum/me',
      { params }
    ),
  confirmMyCurriculum: (curriculumId: string) =>
    courseSelectionRequest.post<CurriculumConfirmationPayload>(
      '/course-selection/curriculum/me/confirmation',
      { curriculumId }
    ),
  getMyCurriculumProgress: (params?: CurriculumProgressQuery) =>
    courseSelectionRequest.get<CurriculumProgress>(
      '/course-selection/curriculum/me/progress',
      { params }
    ),
};
