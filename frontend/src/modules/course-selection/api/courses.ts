import { courseSelectionRequest } from './client';
import type {
  CourseSearchParams,
  CourseOfferingItem,
  CourseOfferingDetail,
  OfferingsAvailableQuery,
} from '../types/course';
import type { PaginatedResponse } from '../types/common';

export const coursesApi = {
  listCourses: (params?: CourseSearchParams) => {
    return courseSelectionRequest.get<PaginatedResponse<CourseOfferingItem>>('/course-selection/courses', {
      params,
    });
  },
  listOfferings: (params?: CourseSearchParams) => {
    return courseSelectionRequest.get<PaginatedResponse<CourseOfferingItem>>('/course-selection/offerings', {
      params,
    });
  },
  listAvailableOfferings: (params?: OfferingsAvailableQuery) => {
    return courseSelectionRequest.get<PaginatedResponse<CourseOfferingItem>>(
      '/course-selection/offerings/available',
      { params }
    );
  },
  getOfferingDetail: (offeringId: string) => {
    return courseSelectionRequest.get<CourseOfferingDetail>(`/course-selection/offerings/${offeringId}`);
  },
};
