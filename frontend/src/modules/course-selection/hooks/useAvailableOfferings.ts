import { useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { coursesApi } from '../api/courses';
import type { OfferingsAvailableQuery } from '../types/course';
import { enrollmentsApi } from '../api/enrollments';

// TODO(C2, FR-C-13, FR-C-15, NFR-C-13): 该 Hook 聚合可选课查询与选课/退课入口
// - 将查询参数透传给 /offerings/available；
// - 选课前仍需在页面层提示阶段、冲突、容量类规则；
// - 任何成功/失败需使用后端返回结果作为最终判定。

export const useAvailableOfferings = (query?: OfferingsAvailableQuery) => {
  const qc = useQueryClient();

  const available = useQuery({
    queryKey: ['course-selection', 'offerings', 'available', query],
    queryFn: () => coursesApi.listAvailableOfferings(query),
    staleTime: 30 * 1000,
  });

  const enrollMutation = useMutation({
    mutationFn: (offeringId: string) =>
      enrollmentsApi.createEnrollment({ courseOfferingId: offeringId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-selection', 'enrollments'] });
      qc.invalidateQueries({ queryKey: ['course-selection', 'timetable'] });
    },
  });

  const dropMutation = useMutation({
    mutationFn: ({ enrollmentId, reason }: { enrollmentId: string; reason?: string }) =>
      enrollmentsApi.dropEnrollment(enrollmentId, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-selection', 'enrollments'] });
      qc.invalidateQueries({ queryKey: ['course-selection', 'timetable'] });
    },
  });

  return useMemo(
    () => ({
      available,
      enroll: enrollMutation,
      drop: dropMutation,
    }),
    [available, enrollMutation, dropMutation]
  );
};
