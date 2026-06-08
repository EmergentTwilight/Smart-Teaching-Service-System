import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useAuthStore } from '@/shared/stores/authStore'
import type { AuthUserDto } from '@/shared/types'

// vitest 全局类型
vi.stubGlobal('console', console)

const createMockUser = (overrides?: Partial<AuthUserDto>): AuthUserDto => ({
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  phone: null,
  realName: 'Test User',
  avatarUrl: null,
  gender: null,
  status: 'ACTIVE',
  roles: ['student'],
  permissions: [],
  lastLoginAt: null,
  ...overrides,
})

describe('useAuthStore', () => {
  beforeEach(() => {
    // 重置 store
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
    })
  })

  it('初始状态应为未认证', () => {
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('setAuth 应该设置认证信息', () => {
    const mockUser = createMockUser()

    act(() => {
      useAuthStore.getState().setAuth('test-token', 'test-refresh-token', mockUser)
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('test-token')
    expect(state.refreshToken).toBe('test-refresh-token')
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
  })

  it('logout 应该清除认证信息', () => {
    const mockUser = createMockUser()

    act(() => {
      useAuthStore.getState().setAuth('test-token', 'test-refresh-token', mockUser)
      useAuthStore.getState().logout()
    })

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('updateUser 应该更新用户信息', () => {
    const mockUser = createMockUser()

    act(() => {
      useAuthStore.getState().setAuth('test-token', 'test-refresh-token', mockUser)
      useAuthStore.getState().updateUser({ realName: 'Updated Name' })
    })

    const state = useAuthStore.getState()
    expect(state.user?.realName).toBe('Updated Name')
    expect(state.user?.username).toBe('testuser')
  })
})
