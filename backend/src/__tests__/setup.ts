/**
 * Vitest 测试环境设置
 * 在所有测试运行前执行
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
process.env.JWT_ACCESS_EXPIRES_IN = '15m'
process.env.JWT_REFRESH_EXPIRES_IN = '7d'
process.env.DATABASE_URL = 'file:./prisma/test.db'
process.env.CORS_ORIGIN = 'http://localhost:5173'
process.env.PORT = '3001'

// Mock console.error 以减少测试日志噪音（可选）
// const originalError = console.error
// beforeAll(() => {
//   console.error = (...args: any[]) => {
//     if (
//       typeof args[0] === 'string' &&
//       args[0].includes('Warning:')
//     ) {
//       return
//     }
//     originalError.call(console, ...args)
//   }
// })
//
// afterAll(() => {
//   console.error = originalError
// })
