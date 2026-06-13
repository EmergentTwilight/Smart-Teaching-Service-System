import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// jsdom 未实现以下浏览器 API，antd 组件（Table 滚动条测量、响应式断点等）在测试中会用到，
// 这里统一打桩，避免渲染时抛出 "Not implemented" 错误。
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)
vi.stubGlobal(
  'matchMedia',
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
)
vi.stubGlobal(
  'getComputedStyle',
  vi.fn().mockImplementation(() => ({
    getPropertyValue: () => '',
  }))
)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
