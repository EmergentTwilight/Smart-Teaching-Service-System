/**
 * 认证状态管理
 * 使用 Zustand 管理用户登录状态
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUserDto } from '@/shared/types'

/**
 * 认证状态接口
 */
interface AuthState {
  /** 访问令牌 */
  token: string | null
  /** 刷新令牌 */
  refreshToken: string | null
  /** 用户信息 */
  user: AuthUserDto | null
  /** 是否已认证 */
  isAuthenticated: boolean
  /** 是否已从服务端同步当前认证用户 */
  authHydrated: boolean
  /** 设置认证信息 */
  setAuth: (token: string, refreshToken: string, user: AuthUserDto) => void
  /** 设置认证同步状态 */
  setAuthHydrated: (hydrated: boolean) => void
  /** 登出 */
  logout: () => void
  /** 更新用户信息 */
  updateUser: (user: Partial<AuthUserDto>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      authHydrated: true,

      setAuth: (token, refreshToken, user) => {
        set({ token, refreshToken, user, isAuthenticated: true, authHydrated: true })
      },

      setAuthHydrated: (hydrated) => {
        set({ authHydrated: hydrated })
      },

      logout: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          authHydrated: true,
        })
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }))
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
