---
name: stss-docker-checks
description: 通过 Docker Compose 在 STSS 容器中运行验证命令，确保 Codex 不在宿主机执行。
---

# STSS Docker Checks Skill

**用途**：运行任何验证命令（test/lint/typecheck/build/prisma 等）必须走 Docker。

**规则**：

1. 不要在宿主机直接执行工具链命令。
2. 优先通过 `docker compose exec <service> sh -lc "<command>"` 执行。
3. 如果容器未启动，使用 `docker compose run --rm <service> sh -lc "<command>"`。
4. 检查前先确认：
   - 服务名
   - 容器内工作目录
   - 包管理器
5. 本项目默认 Codex 校验服务默认由 scripts/codex-docker-run.sh 自动选择服务：
   - 后端、Prisma、数据库、root workspace 检查默认使用 server；
   - 前端、Vite、@stss/web 检查默认使用 web；
   - test-server 仅在显式设置 CODEX_DOCKER_SERVICE=test-server 时使用。
6. 默认容器内工作目录为 `/app`。不要使用容器名 `stss-test-server`，应使用 Compose service 名 `test-server`。

## STSS Workspace 构建顺序

本项目是 pnpm workspace，包含：

- `@stss/shared`：共享类型包，位于 `shared/`
- `@stss/server`：后端包，位于 `backend/`
- `@stss/web`：前端包，位于 `frontend/`

后端会依赖 `@stss/shared`。由于 `@stss/shared` 的 `package.json` 中 `types` 指向 `./dist/index.d.ts`，因此在运行后端 typecheck/build/test 前，必须先构建 shared。

后端校验的标准命令不是单独运行：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/server typecheck'
````

而应运行：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

如果运行后端 typecheck/build/test 时出现以下错误：

```text
Cannot find module '@stss/shared' or its corresponding type declarations
```

Codex 不得立即修改业务代码，也不得修改 A/B/C/D/E/F 任一模块逻辑。应先通过 Docker wrapper 构建 shared：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build'
```

然后重新运行后端校验：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/server typecheck'
```

推荐合并为一条命令：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

前端校验通常可直接运行：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
```

除非前端也直接依赖 `@stss/shared` 的构建产物；若前端出现同类 `@stss/shared` 类型解析错误，也应先运行：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build'
```