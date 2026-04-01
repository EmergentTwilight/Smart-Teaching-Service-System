---
filename: development-specifications.md
title: STSS 开发规范
status: active
version: 2.1.0
last_updated_at: 2026-04-01
last_updated_by: 程韬
description: 智慧教学服务系统开发规范，包含技术栈、项目结构、Git规范、代码规范、API设计等
---

# STSS 开发规范

> 智慧教学服务系统（Smart Teaching Service System）
> 版本：2.1.0 | 更新时间：2026-04-01

---

## 一、项目概述

| 项目信息   | 详情                                                              |
| ---------- | ----------------------------------------------------------------- |
| **名称**   | Smart Teaching Service System（智慧教学服务系统）                 |
| **仓库**   | https://github.com/EmergentTwilight/Smart-Teaching-Service-System |
| **团队**   | 36 人，6 组（A-F）                                                |
| **包管理** | pnpm 10（Monorepo）                                               |

---

## 二、技术栈

### 2.1 前端

| 技术           | 版本 | 说明        |
| -------------- | ---- | ----------- |
| React          | 19   | 最新版      |
| TypeScript     | 5.7  | strict mode |
| Vite           | 6    | 构建工具    |
| Ant Design     | 5    | UI 组件库   |
| Zustand        | 5    | 客户端状态  |
| TanStack Query | 5    | 服务端状态  |
| React Router   | 7    | 路由        |
| Axios          | 1.7  | HTTP 客户端 |
| Zod            | 3    | Schema 校验 |
| Day.js         | 1.11 | 日期处理    |

### 2.2 后端

| 技术       | 版本 | 说明        |
| ---------- | ---- | ----------- |
| Node.js    | 22   | 运行时      |
| Express    | 5    | Web 框架    |
| TypeScript | 5.7  | strict mode |
| Prisma     | 6    | ORM         |
| PostgreSQL | 18   | 主数据库    |
| Redis      | 7    | 缓存、会话  |
| JWT        | 9.0  | 认证        |
| bcryptjs   | 3.0  | 密码加密    |
| Zod        | 3    | 请求校验    |
| Nodemailer | 8.0  | 邮件发送    |

### 2.3 开发工具

| 工具           | 用途                    |
| -------------- | ----------------------- |
| ESLint         | 代码检查（flat config） |
| Prettier       | 代码格式化              |
| Husky          | Git hooks               |
| lint-staged    | 暂存区检查              |
| commitlint     | 提交信息规范            |
| Vitest         | 单元测试                |
| Playwright     | E2E 测试                |
| Docker Compose | 开发环境                |

---

## 三、项目结构

```
STSS/
├── frontend/                    # @stss/web - 前端
│   ├── src/
│   │   ├── modules/             # 按子系统分模块
│   │   │   ├── info-management/     # A组 - 基础信息管理
│   │   │   ├── course-arrangement/  # B组 - 自动排课
│   │   │   ├── course-selection/    # C组 - 智能选课
│   │   │   ├── forum/               # D组 - 论坛交流
│   │   │   ├── online-testing/      # E组 - 在线测试
│   │   │   └── score-management/    # F组 - 成绩管理
│   │   ├── shared/               # 公共代码
│   │   │   ├── components/           # UI 组件
│   │   │   ├── hooks/                # 通用 hooks
│   │   │   ├── utils/                # 工具函数
│   │   │   ├── stores/               # Zustand stores
│   │   │   ├── constants/            # 常量
│   │   │   └── types/                # 类型定义
│   │   └── __tests__/             # 测试
│   ├── public/
│   ├── tests/                    # E2E 测试
│   └── package.json
│
├── backend/                     # @stss/server - 后端
│   ├── src/
│   │   ├── modules/              # 按子系统分模块
│   │   │   └── info-management/    # A组（目前只有A组）
│   │   │       ├── *.controller.ts
│   │   │       ├── *.service.ts
│   │   │       ├── *.routes.ts
│   │   │       └── *.types.ts
│   │   ├── shared/               # 公共代码
│   │   │   └── middleware/         # 中间件
│   │   ├── config/               # 配置
│   │   └── app.ts                # 入口
│   ├── prisma/                   # 数据库
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── package.json
│
├── shared/                      # @stss/shared - 共享类型
│   └── src/
│
├── docs/                        # 项目文档
│   ├── project-requirements.md
│   ├── database-design.md
│   ├── development-specifications.md
│   └── apis/
│
├── docker-compose.yml           # Docker 开发环境
├── Makefile                     # 常用命令
├── pnpm-workspace.yaml          # Monorepo 配置
└── package.json                 # Root package
```

---

## 四、Git 规范

### 4.1 分支结构

```
main                    # 生产环境（受保护）
│
├── develop             # 开发主分支（受保护）
│   │
│   ├── dev/A           # A组集成分支
│   │   ├── feat/A-*
│   │   ├── fix/A-*
│   │   └── refactor/A-*
│   │
│   ├── dev/B           # B组集成分支
│   ├── dev/C           # C组集成分支
│   ├── dev/D           # D组集成分支
│   ├── dev/E           # E组集成分支
│   └── dev/F           # F组集成分支
│
└── docs/*              # 文档分支
```

### 4.2 分支保护

| 分支      | 规则                                   |
| --------- | -------------------------------------- |
| `main`    | 禁止直接推送，必须通过 PR，需 1 review |
| `develop` | 禁止直接推送，必须通过 PR              |
| `dev/*`   | 组长可推送，建议使用 PR                |

### 4.3 分支命名

| 类型 | 格式                              | 示例                       |
| ---- | --------------------------------- | -------------------------- |
| 功能 | `feat/<子系统>-<功能>-<日期>`     | `feat/A-user-crud-0401`    |
| 修复 | `fix/<子系统>-<描述>-<日期>`      | `fix/A-login-0401`         |
| 重构 | `refactor/<子系统>-<描述>-<日期>` | `refactor/B-schedule-0401` |
| 文档 | `docs/<描述>-<日期>`              | `docs/api-update-0401`     |

### 4.4 Commit 规范

```bash
<type>(<scope>): <subject>
```

**Type:**

| Type       | 说明     | 示例                               |
| ---------- | -------- | ---------------------------------- |
| `feat`     | 新功能   | `feat(A): add user CRUD API`       |
| `fix`      | Bug 修复 | `fix(A): resolve login issue`      |
| `refactor` | 重构     | `refactor(B): optimize scheduler`  |
| `docs`     | 文档     | `docs: update API documentation`   |
| `test`     | 测试     | `test(E): add unit tests`          |
| `chore`    | 其他     | `chore(deps): update dependencies` |

**Scope:**

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

### 4.5 工作流程

```bash
# 1. 从 dev/X 创建功能分支
git checkout dev/A
git pull origin dev/A
git checkout -b feat/A-user-crud-0401

# 2. 开发
git add .
git commit -m "feat(A): add user CRUD API"

# 3. 合并到 dev/X
git checkout dev/A
git merge feat/A-user-crud-0401 --no-ff
git push origin dev/A

# 4. 组长提交 PR 到 develop
# 在 GitHub 上创建 PR: dev/A → develop
```

---

## 五、API 规范

### 5.1 RESTful 规范

| 方法     | 路径                | 说明     |
| -------- | ------------------- | -------- |
| `GET`    | `/api/v1/users`     | 获取列表 |
| `GET`    | `/api/v1/users/:id` | 获取单个 |
| `POST`   | `/api/v1/users`     | 创建     |
| `PATCH`  | `/api/v1/users/:id` | 部分更新 |
| `DELETE` | `/api/v1/users/:id` | 删除     |

### 5.2 统一响应格式

**成功：**

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

**分页：**

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

**错误：**

```json
{
  "code": 40001,
  "message": "参数校验失败",
  "errors": [{ "field": "username", "message": "用户名不能为空" }]
}
```

### 5.3 HTTP 状态码

| 状态码 | 说明               |
| ------ | ------------------ |
| 200    | 成功               |
| 201    | 创建成功           |
| 204    | 删除成功（无返回） |
| 400    | 参数错误           |
| 401    | 未认证             |
| 403    | 无权限             |
| 404    | 资源不存在         |
| 409    | 资源冲突           |
| 422    | 业务规则不满足     |
| 429    | 请求过于频繁       |
| 500    | 服务器错误         |

---

## 六、代码规范

### 6.1 命名规范

| 类型 | 规范        | 示例                   |
| ---- | ----------- | ---------------------- |
| 变量 | camelCase   | `userName`             |
| 函数 | camelCase   | `getUserById`          |
| 类   | PascalCase  | `UserService`          |
| 组件 | PascalCase  | `UserCard`             |
| 文件 | kebab-case  | `user-card.tsx`        |
| 常量 | UPPER_SNAKE | `MAX_PAGE_SIZE`        |
| 类型 | PascalCase  | `UserResponse`         |
| 接口 | PascalCase  | `IUser`（可选 I 前缀） |

### 6.2 TypeScript 规范

```typescript
// ✅ 禁止 any，使用具体类型
interface User {
  id: string
  username: string
}

// ✅ 使用 Zod 进行运行时校验
const createUserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
})

// ✅ 导出类型
export type CreateUserDTO = z.infer<typeof createUserSchema>
```

### 6.3 注释规范

**基本原则：** 注释用中文，解释"为什么"而非"做什么"

```typescript
/**
 * 用户服务
 * 处理用户相关的业务逻辑
 */
export class UserService {
  /**
   * 根据ID获取用户
   * @param id 用户ID
   * @returns 用户信息
   */
  async getUserById(id: string): Promise<User> {
    // 使用 include 预加载关联数据，避免 N+1 查询
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

---

## 七、开发环境

### 7.1 服务地址

| 服务       | 地址                  |
| ---------- | --------------------- |
| 前端       | http://localhost:5173 |
| 后端 API   | http://localhost:3000 |
| Adminer    | http://localhost:8080 |
| Redis      | localhost:6379        |
| PostgreSQL | localhost:5432        |

### 7.2 测试账号

| 账号    | 密码       | 角色       |
| ------- | ---------- | ---------- |
| admin   | Admin123   | 超级管理员 |
| teacher | teacher123 | 教师       |
| student | student123 | 学生       |

### 7.3 常用命令

```bash
# Docker 环境
make up          # 启动所有服务
make down        # 停止所有服务
make logs        # 查看日志
make ps          # 查看容器状态

# 本地开发
pnpm install                     # 安装依赖
pnpm --filter @stss/server dev   # 启动后端
pnpm --filter @stss/web dev      # 启动前端

# 代码质量
pnpm lint        # Lint 检查
pnpm typecheck   # 类型检查

# 数据库
pnpm --filter @stss/server db:generate   # 生成 Prisma Client
pnpm --filter @stss/server db:push       # 推送 schema 变更
pnpm --filter @stss/server db:studio     # 打开 Prisma Studio
pnpm --filter @stss/server db:seed      # 运行 seed

# 测试
pnpm --filter @stss/server test   # 后端单元测试
pnpm --filter @stss/web test      # 前端单元测试
```

---

## 八、测试规范

### 8.1 测试策略

| 测试类型 | 工具       | 覆盖率目标 |
| -------- | ---------- | ---------- |
| 单元测试 | Vitest     | ≥ 80%      |
| E2E 测试 | Playwright | 关键路径   |

### 8.2 单元测试示例

```typescript
// backend/src/modules/info-management/__tests__/user.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { UserService } from '../services/user.service'

describe('UserService', () => {
  let service: UserService

  beforeEach(() => {
    service = new UserService()
  })

  it('should get user by id', async () => {
    const user = await service.getUserById('test-id')
    expect(user).toBeDefined()
  })

  it('should throw error when user not found', async () => {
    await expect(service.getUserById('invalid-id')).rejects.toThrow('用户不存在')
  })
})
```

---

## 九、安全规范

### 9.1 认证与授权

| 项目           | 规范                     |
| -------------- | ------------------------ |
| **认证**       | JWT Bearer Token         |
| **Token 过期** | Access 2h，Refresh 7d    |
| **密码**       | bcrypt 加密（rounds=10） |
| **会话**       | Redis 存储，支持强制登出 |

### 9.2 安全最佳实践

| 项目           | 实践                    |
| -------------- | ----------------------- |
| **输入验证**   | Zod schema 校验所有输入 |
| **SQL 注入**   | Prisma 参数化查询       |
| **XSS**        | 前端转义用户输入        |
| **CSRF**       | SameSite Cookie         |
| **CORS**       | 严格配置白名单          |
| **Rate Limit** | 登录等接口限流          |

### 9.3 敏感操作日志

以下操作必须记录到 SystemLog：

- 登录/登出
- 密码修改/重置
- 用户创建/删除
- 角色分配/撤销
- 权限变更
- 成绩修改

---

## 十、文档管理

### 10.1 文档结构

```
docs/
├── project-requirements.md      # 项目要求（公共）
├── development-specifications.md # 开发规范（公共）
├── database-design.md           # 数据库设计（公共）
└── apis/                        # API 文档
    ├── shared.md                # 公共接口
    ├── A-information-management.md
    ├── B-automatic-course-management.md
    ├── C-smart-course-selection.md
    ├── D-discussion-forum.md
    ├── E-online-testing.md
    └── F-score-management.md
```

### 10.2 文档分类

| 类型           | 维护方式     | 分支策略                |
| -------------- | ------------ | ----------------------- |
| **公共文档**   | 统一维护     | 只在 `develop` 分支修改 |
| **子系统文档** | 各组独立维护 | 在各组 `dev/X` 分支修改 |

### 10.3 文档元数据

每个文档必须包含以下元数据：

```yaml
---
filename: 文档名称.md
title: 文档标题
status: draft | active | outdated | archived
version: 版本号
last_updated_at: 最后更新日期 (YYYY-MM-DD)
last_updated_by: 最后更新者姓名
description: 文档简述
---
```

### 10.4 更新规则

1. **公共文档**：只能在 `develop` 分支修改，通过 PR 审核
2. **子系统文档**：在各组 `dev/X` 分支随意修改，随代码合并
3. **更新后**：必须更新 `last_updated_at` 和 `last_updated_by`

---

## 十一、子系统状态

| 组  | 子系统       | 状态        | 说明                 |
| --- | ------------ | ----------- | -------------------- |
| A   | 基础信息管理 | 🚧 部分完成 | 认证、用户管理已完成 |
| B   | 自动排课     | ❌ 未开始   | -                    |
| C   | 智能选课     | ❌ 未开始   | -                    |
| D   | 论坛交流     | ❌ 未开始   | -                    |
| E   | 在线测试     | ❌ 未开始   | -                    |
| F   | 成绩管理     | ❌ 未开始   | -                    |

---

## 十二、FAQ

**Q: 组员提交代码后，组长需要做什么？**

A: 审核代码 → 测试功能 → 合并到 dev/X → 提交 PR 到 develop

**Q: 如果需要修改数据库怎么办？**

A: 修改 `backend/prisma/schema.prisma`，运行 `pnpm db:push`，通知 Travis

**Q: 如何处理跨组依赖？**

A: 在飞书大群沟通，或直接联系相关组长

**Q: develop 分支什么时候合并到 main？**

A: 需要所有组长协商，确认功能稳定后再操作

---

**有任何问题，直接在飞书大群提出！** 🚀
