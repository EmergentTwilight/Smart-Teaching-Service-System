// frontend/src/modules/course-arrangement/api/constraint.ts
import request from '@/shared/utils/request';
import type {
  SchedulingRule,
  RuleQueryParams,
  RuleSaveInput,
} from '../types/constraint';
import type { PaginatedData } from '@/shared/types';

const BASE_PATH = '/course-arrangement/rules';

export const rulesApi = {
  getList: async (params?: RuleQueryParams): Promise<PaginatedData<SchedulingRule>> => {
    return request.get(BASE_PATH, { params });
  },

  getById: async (id: string): Promise<SchedulingRule> => {
    return request.get(`${BASE_PATH}/${id}`);
  },

  /** 创建或更新规则（直接使用统一保存接口） */
  save: async (data: RuleSaveInput): Promise<SchedulingRule> => {
    return request.post(BASE_PATH, data);
  },

  delete: async (id: string): Promise<void> => {
    return request.delete(`${BASE_PATH}/${id}`);
  },

  batchDelete: async (ids: string[]): Promise<void> => {
    return request.post(`${BASE_PATH}/batch-delete`, { ids });
  },
};
