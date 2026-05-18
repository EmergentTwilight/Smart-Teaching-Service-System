import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { coursesApi } from '../api/courses';
import type { OfferingsAvailableQuery } from '../types/course';

// TODO(C2, FR-C-13, FR-C-15, NFR-C-13): 该 Hook 仅聚合可选课查询
// - 将查询参数透传给 /offerings/available；
// - 负责人 scaffold 不接入选课/退课 mutation，避免抢做成员 4 的完整学生端交互；
// - 成员 4 后续接入 mutation 时，任何成功/失败必须以后端返回结果作为最终判定。

export const useAvailableOfferings = (query?: OfferingsAvailableQuery) => {
  const available = useQuery({
    queryKey: ['course-selection', 'offerings', 'available', query],
    queryFn: () => coursesApi.listAvailableOfferings(query),
    staleTime: 30 * 1000,
  });

  return useMemo(
    () => ({
      available,
    }),
    [available]
  );
};
