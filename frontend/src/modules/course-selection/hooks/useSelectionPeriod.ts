import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { periodsApi } from '../api/periods';
import type {
  SelectionPeriodPayload,
  SelectionPeriodQuery,
  ManualEnrollmentPayload,
} from '../types/period';

// TODO(C5, FR-C-30, FR-C-31, FR-C-33, NFR-C-01~NFR-C-03): 阶段与手动加课操作
// - 仅 admin/super_admin 触发时调用，避免在前端做授权代理；
// - 创建/更新后清理相关查询缓存；
// - 与选课事务共用同一约束，手动加课默认执行同校验逻辑。

export const useSelectionPeriods = (query?: SelectionPeriodQuery) => {
  return useQuery({
    queryKey: ['course-selection', 'periods', query],
    queryFn: () => periodsApi.listPeriods(query),
    staleTime: 30 * 1000,
  });
};

export const useUpsertSelectionPeriod = () => {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (payload: SelectionPeriodPayload) => periodsApi.createPeriod(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-selection', 'periods'] }),
  });

  const update = useMutation({
    mutationFn: ({ periodId, payload }: { periodId: string; payload: SelectionPeriodPayload }) =>
      periodsApi.updatePeriod(periodId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-selection', 'periods'] }),
  });

  const manualEnroll = useMutation({
    mutationFn: (payload: ManualEnrollmentPayload) => periodsApi.manualEnroll(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-selection', 'enrollments'] }),
  });

  return useMemo(() => ({ create, update, manualEnroll }), [create, update, manualEnroll]);
};
