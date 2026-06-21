import { courseSelectionRequest } from './client';
import type {
  CourseListItem,
  CourseSearchParams,
  CourseOfferingListItem,
  AvailableOfferingItem,
  CourseOfferingDetail,
  OfferingsAvailableQuery,
} from '../types/course';
import type { PaginatedResponse } from '../types/common';

export const coursesApi = {
  listCourses: (params?: CourseSearchParams) => {
    return courseSelectionRequest.get<PaginatedResponse<CourseListItem>>('/course-selection/courses', {
      params,
    });
  },
  listOfferings: (params?: CourseSearchParams) => {
    return courseSelectionRequest.get<PaginatedResponse<CourseOfferingListItem>>('/course-selection/offerings', {
      params,
    });
  },
  listAvailableOfferings: (params?: OfferingsAvailableQuery) => {
    return courseSelectionRequest.get<PaginatedResponse<AvailableOfferingItem>>(
      '/course-selection/offerings/available',
      { params }
    );
  },
  getOfferingDetail: (offeringId: string, includeEligibility = true) => {
    return courseSelectionRequest.get<CourseOfferingDetail>(`/course-selection/offerings/${offeringId}`, {
      params: { includeEligibility },
    });
  },
};
