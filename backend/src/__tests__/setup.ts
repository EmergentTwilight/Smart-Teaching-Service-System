import { afterEach, beforeEach, vi } from 'vitest'
import { config } from 'dotenv'
import { resolve } from 'path'

// 加载测试环境变量
// 集成测试使用开发数据库（与 Docker Compose 一致）
// 单元测试可以使用 mock 或配置为特定数据库
const isIntegration = process.env.npm_lifecycle_event?.includes('integration')

if (isIntegration) {
  // 集成测试：使用开发环境数据库
  config({ path: resolve(__dirname, '../../.env') })
} else {
  // 单元测试：使用测试环境配置（可能使用 mock）
  config({ path: resolve(__dirname, '../../.env.test') })
}

beforeEach(() => {
  vi.useRealTimers()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
