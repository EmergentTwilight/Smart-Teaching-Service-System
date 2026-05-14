import { useQuery } from '@tanstack/react-query';
import { enrollmentsApi } from '../api/enrollments';
import type { EnrollmentQuery } from '../types/enrollment';

// TODO(C4, FR-C-24, FR-C-29, NFR-C-06): 查询本人选课结果
// - 列表查询需与后端分页一致；
// - 不可通过前端 params 伪造他人 studentId；
// - 筛选/搜索仅用于展示，不替代后端权限边界。

export const useMyEnrollments = (query?: EnrollmentQuery) => {
  return useQuery({
    queryKey: ['course-selection', 'enrollments', query],
    queryFn: () => enrollmentsApi.listMyEnrollments(query),
    staleTime: 30 * 1000,
  });
};
