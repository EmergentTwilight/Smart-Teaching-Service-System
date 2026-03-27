/**
 * 测试环境设置
 * 在所有测试运行前执行
 */
import { beforeAll, afterAll, afterEach, vi } from 'vitest'

// 设置测试环境变量
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
process.env.JWT_ACCESS_TOKEN_EXPIRES_IN = '15m'
process.env.JWT_REFRESH_TOKEN_EXPIRES_IN = '7d'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.REDIS_URL = 'redis://localhost:6379'

// 全局设置
beforeAll(() => {
  // 所有测试开始前的设置
})

// 全局清理
afterAll(() => {
  // 所有测试结束后的清理
})

// 每个测试后的清理
afterEach(() => {
  // 清理 mock
  vi.clearAllMocks()
})
