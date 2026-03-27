/**
 * Redis 配置
 * 当前优先使用内存实现，便于在未接入外部 Redis 服务时保持功能可用
 */

type SetOptions = {
  ex?: number
}

type CacheRecord = {
  value: string
  expires_at?: number
}

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

export const redisClient = new MemoryRedisClient()
