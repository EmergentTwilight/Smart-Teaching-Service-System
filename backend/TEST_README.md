# 后端测试指南

## 快速开始

```bash
# 安装依赖
cd backend
pnpm install

# 生成 Prisma 客户端
pnpm db:generate

# 运行单元测试 (不需要数据库)
pnpm test:unit

# 运行集成测试 (需要数据库)
pnpm test:integration

# 运行所有测试
pnpm test:run

# 生成覆盖率报告
pnpm test:coverage
```

## 测试类型

| 类型     | 命令                    | 说明              |
| -------- | ----------------------- | ----------------- |
| 单元测试 | `pnpm test:unit`        | Mock 所有外部依赖 |
| 集成测试 | `pnpm test:integration` | 需要真实数据库    |
| 全部测试 | `pnpm test:run`         | 运行所有测试      |
| 覆盖率   | `pnpm test:coverage`    | 生成覆盖率报告    |

## 数据库配置

### 使用 Docker (推荐)

```bash
# 启动数据库
docker-compose up -d postgres redis

# 等待启动
sleep 5

# 推送 Schema
pnpm db:push

# 运行测试
pnpm test:run
```

### 使用本地数据库

```bash
# 配置环境变量
export DATABASE_URL="postgresql://user:password@localhost:5432/stss"

# 运行测试
pnpm test:integration
```

## 测试目录结构

```
src/__tests__/
├── setup.ts                    # 全局测试配置
├── helpers/                    # 测试辅助工具
│   ├── mocks.ts               # Mock 对象工厂
│   ├── db.ts                  # 数据库辅助函数
│   └── auth.ts                # 认证辅助函数
├── modules/                    # 其他测试
│   └── info-management/
│       ├── users.integration.test.ts       # 用户集成测试
│       └── major.service.test.ts           # 专业服务单元测试
├── unit/                       # 单元测试
│   ├── modules/
│   │   └── info-management/
│   │       ├── auth.controller.test.ts     # 认证控制器 (P0)
│   │       └── users.controller.test.ts    # 用户控制器 (P1)
│   └── shared/
│       └── middleware/
│           ├── auth.test.ts                # 认证中间件 (P1)
│           └── validate.test.ts            # 参数校验中间件 (P1)
└── integration/                # 集成测试
    └── modules/
        └── info-management/
            ├── auth.routes.integration.test.ts       # 认证路由 (P0)
            ├── users.routes.integration.test.ts      # 用户路由 (P1)
            ├── departments.routes.integration.test.ts # 院系路由 (P2)
            └── majors.routes.integration.test.ts     # 专业路由 (P2)
```

## 编写测试

### 单元测试示例

```typescript
import { describe, expect, it, vi } from 'vitest'

describe('MyService', () => {
  it('应该返回正确的结果', async () => {
    // Arrange
    const mockData = { id: '1', name: 'Test' }

    // Act
    const result = await myService.getData()

    // Assert
    expect(result).toEqual(mockData)
  })
})
```

### 集成测试示例

```typescript
import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('POST /api/users', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  it('应该创建新用户', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ username: 'test', password: 'Test123' })
      .expect(201)

    expect(response.body.data.username).toBe('test')
  })
})
```

## 目标覆盖率

- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%
