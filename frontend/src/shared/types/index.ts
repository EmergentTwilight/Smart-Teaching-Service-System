// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  realName: string;
  avatarUrl: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 表单类型
export interface UserFormData {
  username: string;
  email?: string;
  realName: string;
  password?: string;
  phone?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  status?: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  roleIds?: string[];
}
