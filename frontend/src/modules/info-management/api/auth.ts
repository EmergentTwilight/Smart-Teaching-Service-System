import request from '@/shared/utils/request';
import type { LoginResponse, User } from '@/shared/types';

export interface LoginRequest {
  username: string;
  password: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return request.post('/auth/login', data);
  },

  logout: async (): Promise<void> => {
    return request.post('/auth/logout');
  },

  me: async (): Promise<User> => {
    return request.get('/auth/me');
  },

  changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<void> => {
    return request.post('/auth/change-password', data);
  },
};
