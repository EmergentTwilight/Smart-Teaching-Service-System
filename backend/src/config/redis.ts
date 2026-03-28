/**
 * Redis 配置
 * 生产环境必须配置 REDIS_URL，否则登录限流将无法跨实例共享
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const IORedis = require('ioredis').default

type SetOptions = {
  ex?: number
}

type CacheRecord = {
  value: string
  expires_at?: number
}

/**
 * 内存 Redis 客户端（仅用于开发/测试环境）
 * 警告：多实例部署时锁定状态无法共享
 */
class MemoryRedisClient {
  private readonly store = new Map<string, CacheRecord>()

  private cleanupExpired(key: string): void {
    const record = this.store.get(key)
    if (record?.expires_at && record.expires_at <= Date.now()) {
      this.store.delete(key)
    }
  }

  async get(key: string): Promise<string | null> {
    this.cleanupExpired(key)
    return this.store.get(key)?.value ?? null
  }

  async set(key: string, value: string, options: SetOptions = {}): Promise<void> {
    this.store.set(key, {
      value,
      expires_at: options.ex ? Date.now() + options.ex * 1000 : undefined,
    })
  }

  async incr(key: string): Promise<number> {
    this.cleanupExpired(key)
    const currentValue = Number((await this.get(key)) || '0') + 1
    const record = this.store.get(key)

    this.store.set(key, {
      value: String(currentValue),
      expires_at: record?.expires_at,
    })

    return currentValue
  }

  async expire(key: string, seconds: number): Promise<void> {
    const record = this.store.get(key)
    if (!record) {
      return
    }

    this.store.set(key, {
      ...record,
      expires_at: Date.now() + seconds * 1000,
    })
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0
    keys.forEach((key) => {
      if (this.store.delete(key)) {
        deleted += 1
      }
    })
    return deleted
  }
}

/**
 * Redis 客户端接口
 */
interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: SetOptions): Promise<void>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<void>
  del(...keys: string[]): Promise<number>
}

/**
 * 创建 Redis 客户端
 */
function createRedisClient(): RedisClient {
  const redisUrl = process.env.REDIS_URL
  const isProduction = process.env.NODE_ENV === 'production'

  if (redisUrl) {
    console.log('✅ 使用 Redis:', redisUrl.replace(/:[^:@]+@/, ':****@'))
    const redis = new IORedis(redisUrl)

    return {
      async get(key: string) {
        return redis.get(key) as Promise<string | null>
      },
      async set(key: string, value: string, options: SetOptions = {}) {
        if (options.ex) {
          await redis.setex(key, options.ex, value)
        } else {
          await redis.set(key, value)
        }
      },
      async incr(key: string) {
        return redis.incr(key) as Promise<number>
      },
      async expire(key: string, seconds: number) {
        await redis.expire(key, seconds)
      },
      async del(...keys: string[]) {
        if (keys.length === 0) return 0
        return redis.del(...keys) as Promise<number>
      },
    }
  }

  // 无 Redis URL 时的降级处理
  if (isProduction) {
    console.error('❌ 生产环境必须配置 REDIS_URL！登录限流将无法正常工作！')
    throw new Error('REDIS_URL is required in production environment')
  }

  console.warn('⚠️ 警告: 使用内存 Redis 客户端（仅限开发环境）')
  console.warn('⚠️ 多实例部署时登录限流将无法跨实例共享')

  return new MemoryRedisClient()
}

export const redisClient = createRedisClient()
