/**
 * Prisma 客户端实例
 * 统一管理数据库连接
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// 连接池参数通过 DATABASE_URL 配置
// 示例: postgresql://user:pass@host:port/db?connection_limit=10&pool_timeout=30

export default prisma
