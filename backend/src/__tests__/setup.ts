import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.useRealTimers()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
