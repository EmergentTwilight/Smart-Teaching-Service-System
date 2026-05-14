import { useMutation } from '@tanstack/react-query';
import { aiAdvisorApi } from '../api/ai-advisor';
import type { AiRecommendPayload, AiExplainPayload } from '../types/ai';

// TODO(C6, FR-C-38, FR-C-41, NFR-C-10, NFR-C-11): AI 仅展示解释，不执行写操作
// - 推荐/解释的失败应可独立退化；
// - 提示内容需包含“仅供参考”；
// - 不在前端根据 AI 结果直接触发创建 Enrollment。

export const useAiAdvisor = () => {
  const recommend = useMutation({
    mutationFn: (payload: AiRecommendPayload) => aiAdvisorApi.recommend(payload),
  });

  const explain = useMutation({
    mutationFn: (payload: AiExplainPayload) => aiAdvisorApi.explain(payload),
  });

  return {
    recommend,
    explain,
  };
};
