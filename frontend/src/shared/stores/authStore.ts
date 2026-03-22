/**
 * 认证状态管理
 * 使用 Zustand 管理用户登录状态
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/shared/types';

/**
 * 认证状态接口
 */
interface AuthState {
  /** 访问令牌 */
  token: string | null;
  /** 用户信息 */
  user: User | null;
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 设置认证信息 */
  setAuth: (token: string, user: User) => void;
  /** 登出 */
  logout: () => void;
  /** 更新用户信息 */
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
