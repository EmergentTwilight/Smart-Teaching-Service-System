# E2E 测试运行说明

浏览器 E2E 使用 Playwright，测试目录为 `frontend/tests/e2e`。

## 本地运行

先启动数据库和 Redis，并准备后端数据：

```bash
cd backend
pnpm db:push
pnpm db:seed
pnpm dev
```

后端启动后，在另一个终端运行前端 E2E：

```bash
pnpm test:e2e
```

也可以从仓库根目录运行：

```bash
pnpm test:e2e
```

默认登录账号来自 `backend/prisma/seed.ts`：

```bash
E2E_USERNAME=admin
E2E_PASSWORD=Admin123
```

## CI 运行

GitHub Actions 的 `CI` workflow 会自动执行：

1. 安装依赖并生成 Prisma Client
2. 启动 PostgreSQL 和 Redis 服务
3. 执行 `pnpm db:push && pnpm db:seed`
4. 安装 Playwright Chromium 浏览器
5. 启动后端服务并等待 `/api/health`
6. 执行 `cd frontend && pnpm test:e2e`

如果 E2E 失败，CI 会上传 `frontend/playwright-report/`、`frontend/test-results/` 和 `backend-e2e.log` 作为 artifacts。
