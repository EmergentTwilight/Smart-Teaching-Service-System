import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiAdvisorApi } from '../api/ai-advisor';
import type { AiRecommendPayload, AiExplainPayload, SaveAiAdvisorRecordPayload } from '../types/ai';

// TODO(C6, FR-C-38, FR-C-41, NFR-C-10, NFR-C-11): AI 仅展示解释，不执行写操作
// - 推荐/解释的失败应可独立退化；
// - 提示内容需包含“仅供参考”；
// - 不在前端根据 AI 结果直接触发创建 Enrollment。

export const useAiAdvisor = () => {
  const queryClient = useQueryClient();

  const recommend = useMutation({
    mutationFn: (payload: AiRecommendPayload) => aiAdvisorApi.recommend(payload),
  });

  const explain = useMutation({
    mutationFn: (payload: AiExplainPayload) => aiAdvisorApi.explain(payload),
  });

  const savedRecords = useQuery({
    queryKey: ['course-selection', 'ai-advisor', 'saved-records'],
    queryFn: () => aiAdvisorApi.listSavedRecords({ page: 1, pageSize: 20 }),
  });

  const saveRecord = useMutation({
    mutationFn: (payload: SaveAiAdvisorRecordPayload) => aiAdvisorApi.saveRecord(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-selection', 'ai-advisor', 'saved-records'] });
    },
  });

  const deleteRecord = useMutation({
    mutationFn: (id: string) => aiAdvisorApi.deleteSavedRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-selection', 'ai-advisor', 'saved-records'] });
    },
  });

  return {
    recommend,
    explain,
    savedRecords,
    saveRecord,
    deleteRecord,
  };
};
