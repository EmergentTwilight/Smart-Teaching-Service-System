import request from '@/shared/utils/request';
import type { User, PaginatedData } from '@/shared/types';

export interface UserQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  role?: string;
  status?: string;
}

export const usersApi = {
  getList: async (params?: UserQueryParams): Promise<{ items: User[]; pagination: PaginatedData<User>['pagination'] }> => {
    return request.get('/users', { params });
  },

  getById: async (id: string): Promise<User> => {
    return request.get(`/users/${id}`);
  },

  create: async (data: Partial<User>): Promise<User> => {
    return request.post('/users', data);
  },

  update: async (id: string, data: Partial<User>): Promise<User> => {
    return request.put(`/users/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await request.delete(`/users/${id}`);
  },
};
