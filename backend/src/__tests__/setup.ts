import { afterEach, beforeEach, vi } from 'vitest'
import { config } from 'dotenv'
import { resolve } from 'path'

// 加载测试环境变量
config({ path: resolve(__dirname, '../../.env.test') })

beforeEach(() => {
  vi.useRealTimers()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
