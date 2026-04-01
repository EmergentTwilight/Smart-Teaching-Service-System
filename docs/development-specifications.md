---
filename: development-specifications.md
title: Smart-Teaching-Service-System 开发规范
status: active
version: 2.0.0
last_updated_at: 2026-04-01
last_updated_by: 程韬
description: 智慧教学服务系统开发规范，包含技术栈、分支管理、代码规范、API设计等
---

# Smart-Teaching-Service-System 开发规范

---

## 一、项目概述

| 项目信息     | 详情                                                              |
| ------------ | ----------------------------------------------------------------- |
| **项目名称** | Smart Teaching Service System (智慧教学服务系统)                  |
| **项目地址** | https://github.com/EmergentTwilight/Smart-Teaching-Service-System |
| **团队规模** | 36 人，6 组（A-F）                                                |
| **文档**     | 飞书知识库                                                        |

---

## 二、技术栈（2026 最新版）

### 2.1 核心技术

| 层级           | 技术            | 版本 | 说明                     |
| -------------- | --------------- | ---- | ------------------------ |
| **前端框架**   | React           | 19   | 最新 Concurrent Features |
| **前端语言**   | TypeScript      | 5.7  | strict mode              |
| **构建工具**   | Vite            | 6    | 极速 HMR                 |
| **UI 组件库**  | Ant Design      | 5    | 企业级组件               |
| **状态管理**   | Zustand         | 5    | 轻量级客户端状态         |
| **服务端状态** | TanStack Query  | 5    | 数据获取、缓存、同步     |
| **路由**       | React Router    | 7    | 最新版                   |
| **表单**       | React Hook Form | 7    | 高性能表单               |
| **校验**       | Zod             | 3    | TypeScript-first schema  |
| **后端运行时** | Node.js         | 24   | 最新 LTS                 |
| **后端框架**   | Express         | 5    | 最新版                   |
| **ORM**        | Prisma          | 6    | 类型安全                 |
| **数据库**     | PostgreSQL      | 18   | 最新版                   |
| **缓存**       | Redis           | 7    | 会话、缓存               |
| **开发环境**   | Docker Compose  | -    | 完全容器化               |

### 2.2 开发工具

| 工具            | 用途                    |
| --------------- | ----------------------- |
| **ESLint**      | 代码检查（flat config） |
| **Prettier**    | 代码格式化              |
| **commitlint**  | 提交信息规范            |
| **lint-staged** | 暂存区检查              |
| **Husky**       | Git hooks               |
| **Vitest**      | 单元测试                |
| **Playwright**  | E2E 测试                |

---

## 三、项目结构

```plaintext
STSS/
├── frontend/                          # 统一前端
│   ├── src/
│   │   ├── modules/                   # 按子系统分模块
│   │   │   ├── info-management/       # A组
│   │   │   ├── course-arrangement/    # B组
│   │   │   ├── course-selection/      # C组
│   │   │   ├── forum/                 # D组
│   │   │   ├── online-testing/        # E组
│   │   │   └── score-management/      # F组
│   │   ├── shared/                    # 公共组件
│   │   │   ├── components/            # UI 组件
│   │   │   ├── hooks/                 # 通用 hooks
│   │   │   ├── utils/                 # 工具函数
│   │   │   └── types/                 # 类型定义
│   │   ├── stores/                    # Zustand stores
│   │   ├── services/                  # API 服务层
│   │   └── router/                    # 路由配置
│   └── package.json
│
├── backend/                           # 统一后端
│   ├── src/
│   │   ├── modules/                   # 按子系统分模块
│   │   │   ├── info-management/       # A组
│   │   │   ├── course-arrangement/    # B组
│   │   │   ├── course-selection/      # C组
│   │   │   ├── forum/                 # D组
│   │   │   ├── online-testing/        # E组
│   │   │   └── score-management/      # F组
│   │   ├── shared/                    # 公共模块
│   │   │   ├── middleware/            # 中间件
│   │   │   ├── utils/                 # 工具函数
│   │   │   ├── types/                 # 类型定义
│   │   │   └── errors/                # 错误处理
│   │   └── prisma/                    # 数据库 Schema
│   └── package.json
│
├── shared/                            # 前后端共享类型
├── docker-compose.dev.yml
└── docker-compose.yml
```

---

## 四、Git 分支管理规范

### 4.1 分支结构

```plaintext
main                    # 生产环境（受保护）
│
├── develop             # 开发主分支（受保护）
│   │
│   ├── dev/A           # A组集成分支
│   │   ├── feat/A-*    # 功能分支
│   │   ├── fix/A-*     # Bug 修复
│   │   ├── refactor/A-* # 重构
│   │   └── docs/A-*    # 文档
│   │
│   ├── dev/B           # B组集成分支
│   ├── dev/C           # C组集成分支
│   ├── dev/D           # D组集成分支
│   ├── dev/E           # E组集成分支
│   └── dev/F           # F组集成分支
│
└── hotfix/*            # 紧急修复（仅从 main 创建）
```

### 4.2 分支保护规则

| 分支      | 保护规则                                    |
| --------- | ------------------------------------------- |
| `main`    | 禁止直接推送，必须通过 PR，需要 1 个 review |
| `develop` | 禁止直接推送，必须通过 PR                   |
| `dev/A~F` | 组长可推送，建议使用 PR                     |

### 4.3 分支命名规范

| 类型 | 格式                              | 示例                    |
| ---- | --------------------------------- | ----------------------- |
| 功能 | `feat/<子系统>-<功能>-<日期>`     | `feat/A-user-crud-0401` |
| 修复 | `fix/<子系统>-<描述>-<日期>`      | `fix/A-login-0401`      |
| 重构 | `refactor/<子系统>-<描述>-<日期>` | `refactor/C-api-0401`   |
| 文档 | `docs/<子系统>-<描述>-<日期>`     | `docs/A-api-0401`       |
| 性能 | `perf/<子系统>-<描述>-<日期>`     | `perf/B-schedule-0401`  |

### 4.4 工作流程

```bash
# 1. 从 dev/X 创建功能分支
git checkout dev/A
git pull origin dev/A
git checkout -b feat/A-user-crud-0401

# 2. 开发（自动检查：lint + format + typecheck）
git add .
git commit -m "feat(A): add user CRUD API"
git push origin feat/A-user-crud-0401

# 3. 合并到 dev/X（组员）
git checkout dev/A
git merge feat/A-user-crud-0401 --no-ff
git push origin dev/A

# 4. dev/X → develop（组长提交 PR）
# 在 GitHub 上创建 PR: dev/A → develop

# 5. develop → main（Travis + 组长协商）
# 所有组长确认后，Travis 执行合并
```

---

## 五、Commit 规范

### 5.1 格式

```plaintext
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### 5.2 Type 类型

| Type       | 说明                   | 示例                                 |
| ---------- | ---------------------- | ------------------------------------ |
| `feat`     | 新功能                 | `feat(A): add user registration`     |
| `fix`      | Bug 修复               | `fix(C): resolve conflict detection` |
| `docs`     | 文档                   | `docs: update API documentation`     |
| `style`    | 代码格式（不影响逻辑） | `style(A): format code`              |
| `refactor` | 重构（不增加功能）     | `refactor(B): optimize algorithm`    |
| `perf`     | 性能优化               | `perf(B): improve schedule speed`    |
| `test`     | 测试                   | `test(E): add unit tests`            |
| `chore`    | 构建/工具              | `chore: update dependencies`         |
| `ci`       | CI/CD                  | `ci: add GitHub Actions`             |
| `revert`   | 回滚                   | `revert: revert commit xxx`          |

### 5.3 Scope 范围

| Scope    | 说明         |
| -------- | ------------ |
| `A`      | 基础信息管理 |
| `B`      | 自动排课     |
| `C`      | 智能选课     |
| `D`      | 论坛交流     |
| `E`      | 在线测试     |
| `F`      | 成绩管理     |
| `shared` | 共享代码     |
| `db`     | 数据库相关   |
| `deps`   | 依赖更新     |

### 5.4 示例

```bash
feat(A): add user CRUD API
feat(C): integrate AI course recommendation
fix(A): resolve login token expiration
refactor(B): optimize scheduling performance
perf(B): improve auto-arrange speed by 50%
test(E): add question bank unit tests
docs: update database schema
chore(deps): update dependencies
```

---

## 六、API 设计规范

### 6.1 RESTful 规范

| 方法     | 路径                | 说明             |
| -------- | ------------------- | ---------------- |
| `GET`    | `/api/v1/users`     | 获取用户列表     |
| `GET`    | `/api/v1/users/:id` | 获取单个用户     |
| `POST`   | `/api/v1/users`     | 创建用户         |
| `PATCH`  | `/api/v1/users/:id` | 更新用户（部分） |
| `PUT`    | `/api/v1/users/:id` | 更新用户（完整） |
| `DELETE` | `/api/v1/users/:id` | 删除用户         |

### 6.2 统一响应格式

**成功响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

**分页响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

**错误响应：**

```json
{
  "code": 40001,
  "message": "参数校验失败",
  "errors": [{ "field": "username", "message": "用户名不能为空" }]
}
```

### 6.3 HTTP 状态码

| 状态码 | 说明                 |
| ------ | -------------------- |
| 200    | 成功                 |
| 201    | 创建成功             |
| 204    | 删除成功（无返回体） |
| 400    | 参数错误             |
| 401    | 未认证               |
| 403    | 无权限               |
| 404    | 资源不存在           |
| 409    | 资源冲突             |
| 422    | 业务规则不满足       |
| 429    | 请求过于频繁         |
| 500    | 服务器错误           |

---

## 七、前端开发规范

### 7.1 组件设计

```typescript
// ✅ 推荐：组件职责单一
interface UserCardProps {
  /** 用户信息 */
  user: User
  /** 点击回调 */
  onClick?: () => void
}

export function UserCard({ user, onClick }: UserCardProps) {
  return (
    <Card onClick={onClick}>
      <Avatar src={user.avatarUrl} />
      <Typography>{user.realName}</Typography>
    </Card>
  )
}
```

### 7.2 状态管理策略

| 状态类型       | 工具            | 说明                       |
| -------------- | --------------- | -------------------------- |
| **服务端状态** | TanStack Query  | 用户、课程、成绩等         |
| **客户端状态** | Zustand         | 主题、侧边栏、临时 UI 状态 |
| **表单状态**   | React Hook Form | 所有表单                   |

### 7.3 数据获取

```typescript
// ✅ 推荐：使用 TanStack Query
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => userApi.getUser(id),
    staleTime: 5 * 60 * 1000, // 5 分钟
  })
}

// ✅ 推荐：使用 mutation
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
```

### 7.4 错误边界

```typescript
// ✅ 推荐：使用错误边界
import { ErrorBoundary } from 'react-error-boundary'

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Router />
    </ErrorBoundary>
  )
}
```

---

## 八、后端开发规范

### 8.1 路由组织

```typescript
// backend/src/modules/info-management/routes/user.routes.ts
import { Router } from 'express'
import { UserController } from '../controllers/user.controller'
import { authMiddleware } from '@/shared/middleware/auth'
import { validateRequest } from '@/shared/middleware/validate'
import { createUserSchema } from '../schemas/user.schema'

const router = Router()
const controller = new UserController()

router.get('/', authMiddleware, controller.getUsers)
router.get('/:id', authMiddleware, controller.getUserById)
router.post('/', authMiddleware, validateRequest(createUserSchema), controller.createUser)
router.patch('/:id', authMiddleware, controller.updateUser)
router.delete('/:id', authMiddleware, controller.deleteUser)

export default router
```

### 8.2 Service 层

```typescript
// backend/src/modules/info-management/services/user.service.ts
import { PrismaClient } from '@prisma/client'
import { AppError } from '@/shared/errors/AppError'

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, roles: true },
    })

    if (!user) {
      throw new AppError(404, '用户不存在')
    }

    return user
  }
}
```

### 8.3 错误处理

```typescript
// backend/src/shared/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: number
  ) {
    super(message)
  }
}

// backend/src/shared/middleware/errorHandler.ts
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code || err.statusCode,
      message: err.message,
    })
  }

  console.error(err)
  return res.status(500).json({
    code: 500,
    message: '服务器内部错误',
  })
}
```

### 8.4 事务处理

```typescript
// ✅ 推荐：使用 Prisma 事务
async function createUserWithProfile(data: CreateUserDTO) {
  return this.prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: data.username,
        password: await hashPassword(data.password),
      },
    })

    await tx.student.create({
      data: {
        userId: user.id,
        studentNumber: data.studentNumber,
        majorId: data.majorId,
      },
    })

    return user
  })
}
```

---

## 九、测试规范

### 9.1 测试策略

| 测试类型 | 工具               | 覆盖率目标    |
| -------- | ------------------ | ------------- |
| 单元测试 | Vitest             | ≥ 80%         |
| 集成测试 | Vitest + Supertest | 核心流程 100% |
| E2E 测试 | Playwright         | 关键路径      |

### 9.2 单元测试示例

```typescript
// backend/src/modules/info-management/services/user.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { UserService } from './user.service'
import { prismaMock } from '@/test/prisma-mock'

describe('UserService', () => {
  let service: UserService

  beforeEach(() => {
    service = new UserService(prismaMock)
  })

  it('should get user by id', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: '1',
      username: 'test',
    })

    const user = await service.getUserById('1')

    expect(user).toEqual({ id: '1', username: 'test' })
  })

  it('should throw error when user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    await expect(service.getUserById('999')).rejects.toThrow('用户不存在')
  })
})
```

### 9.3 E2E 测试示例

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[name="username"]', 'admin')
    await page.fill('[name="password"]', 'Admin123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
  })
})
```

---

## 十、性能优化

### 10.1 前端优化

| 优化项       | 实践                                 |
| ------------ | ------------------------------------ |
| **代码分割** | 使用 `React.lazy()` + `Suspense`     |
| **图片优化** | 使用 WebP 格式，懒加载               |
| **缓存**     | TanStack Query 缓存策略              |
| **虚拟列表** | 大列表使用 `@tanstack/react-virtual` |
| **防抖节流** | 搜索、滚动等场景                     |

### 10.2 后端优化

| 优化项       | 实践                         |
| ------------ | ---------------------------- |
| **N+1 查询** | 使用 Prisma `include` 预加载 |
| **索引**     | 为常用查询字段添加索引       |
| **缓存**     | Redis 缓存热点数据           |
| **分页**     | 所有列表接口必须分页         |
| **连接池**   | 合理配置数据库连接池         |

### 10.3 数据库索引

```prisma
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String?  @unique
  status    UserStatus

  @@index([status])           // 状态筛选
  @@index([createdAt])        // 时间排序
  @@index([status, createdAt]) // 复合索引
}
```

---

## 十一、安全规范

### 11.1 认证与授权

| 项目           | 规范                              |
| -------------- | --------------------------------- |
| **认证**       | JWT Bearer Token                  |
| **Token 过期** | Access Token 2h，Refresh Token 7d |
| **密码**       | bcrypt 加密，强度 10              |
| **会话管理**   | Redis 存储会话，支持强制登出      |

### 11.2 安全最佳实践

| 项目           | 实践                         |
| -------------- | ---------------------------- |
| **输入验证**   | Zod schema 验证所有输入      |
| **SQL 注入**   | 使用 Prisma 参数化查询       |
| **XSS**        | 前端转义用户输入             |
| **CSRF**       | SameSite Cookie + CSRF Token |
| **CORS**       | 严格配置白名单               |
| **Rate Limit** | 登录、注册等接口限流         |

### 11.3 敏感操作日志

以下操作必须记录到 SystemLog：

- 登录/登出
- 密码修改/重置
- 用户创建/删除
- 角色分配/撤销
- 权限变更
- 成绩修改

---

## 十二、开发环境

### 12.1 服务地址

| 服务            | 地址                  |
| --------------- | --------------------- |
| 前端            | http://localhost:5173 |
| 后端 API        | http://localhost:3000 |
| Adminer         | http://localhost:8080 |
| Redis Commander | http://localhost:8081 |

### 12.2 测试账号

| 账号    | 密码       | 角色       |
| ------- | ---------- | ---------- |
| admin   | Admin123   | 超级管理员 |
| teacher | teacher123 | 教师       |
| student | student123 | 学生       |

### 12.3 常用命令

```bash
# 启动开发环境
make dev

# 运行测试
make test

# 代码检查
make lint

# 类型检查
make typecheck

# 数据库迁移
make migrate

# 生成 Prisma Client
make generate
```

---

## 十三、Code Review 标准

### 13.1 提交前检查

```bash
# Lint 检查
make lint

# 类型检查
make typecheck

# 单元测试
make test

# Prisma 验证（如果修改了 schema）
cd backend && npx prisma format && npx prisma validate
```

### 13.2 Review 检查项

| 类别     | 检查项                               |
| -------- | ------------------------------------ |
| **功能** | 是否实现需求？是否处理边界情况？     |
| **类型** | 是否使用具体类型？禁止 `any`         |
| **性能** | 是否有 N+1 查询？是否需要索引？      |
| **安全** | 输入是否验证？权限是否检查？         |
| **测试** | 是否有单元测试？覆盖率如何？         |
| **文档** | 复杂逻辑是否有注释？API 是否有文档？ |

### 13.3 Review 严重程度

| 级别            | 说明                   | 处理             |
| --------------- | ---------------------- | ---------------- |
| 🚨 **Critical** | 安全漏洞、功能无法使用 | 必须修复才能合并 |
| ⚠️ **Major**    | 性能问题、代码不一致   | 应该修复         |
| 📝 **Minor**    | 代码风格、命名规范     | 建议改进         |

---

## 十四、子系统状态

| 组  | 子系统       | 状态        | 负责人 |
| --- | ------------ | ----------- | ------ |
| A   | 基础信息管理 | 🚧 部分完成 | -      |
| B   | 自动排课     | ❌ 未开始   | -      |
| C   | 智能选课     | ❌ 未开始   | -      |
| D   | 论坛交流     | ❌ 未开始   | -      |
| E   | 在线测试     | ❌ 未开始   | -      |
| F   | 成绩管理     | ❌ 未开始   | -      |

---

## 十五、常见问题

**Q: 组员提交代码后，组长需要做什么？**

A: 审核代码 → 测试功能 → 合并到 dev/X → 提交 PR 到 develop

**Q: 如果需要修改数据库怎么办？**

A: 修改 `backend/prisma/schema.prisma`，运行 `npx prisma migrate dev`，通知 Travis

**Q: 如何处理跨组依赖？**

A: 在飞书大群沟通，或直接联系相关组长

**Q: develop 分支什么时候合并到 main？**

A: 需要所有组长协商，确认功能稳定后再操作

**Q: 遇到技术问题怎么办？**

A:

1. 查看本文档和飞书知识库
2. 在飞书群提问
3. 联系相关技术负责人

---

**有任何问题，直接在飞书大群提出！** 🚀
