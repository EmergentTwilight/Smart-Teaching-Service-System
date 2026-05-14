# STSS Codex 指令

## STSS Docker 校验规则

本项目使用 Docker Compose 作为 Codex 的默认验证环境。Codex 不应在宿主机或原始 WSL 环境中直接运行项目工具链命令。

禁止直接在宿主机运行以下命令：

- `npm ...`
- `pnpm ...`
- `yarn ...`
- `node ...`
- `npx ...`
- `tsc`
- `prisma`
- `jest`
- `vitest`
- `npm run ...`
- `pnpm run ...`
- `pnpm --filter ...`
- `pnpm -r ...`

所有 test、lint、typecheck、build、Prisma、migration、package script 验证命令，都必须通过统一 wrapper 执行：

```bash
./scripts/codex-docker-run.sh '<command>'
````

### 默认 Docker 服务

当前 STSS Docker Compose 服务名如下：

* `server`：后端开发服务，暴露 `localhost:3000`
* `web`：前端开发服务，暴露 `localhost:5173`
* `test-server`：Codex 校验、typecheck、build、test 的默认服务
* `postgres`：PostgreSQL
* `redis`：Redis
* `adminer`：数据库管理界面，暴露 `localhost:8080`

Codex 默认应使用：

```bash
CODEX_DOCKER_SERVICE=test-server
CODEX_DOCKER_WORKDIR=/app
```

注意：`stss-test-server`、`stss-server`、`stss-web` 是容器名，不是 Docker Compose service 名。`docker compose exec` 和本项目 wrapper 应使用 service 名，例如 `test-server`、`server`、`web`。

### 推荐命令

检查容器服务：

```bash
docker compose ps
docker compose config --services
```

运行后端类型检查：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/server typecheck'
```

运行前端类型检查：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
```

运行后端构建：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/server build'
```

运行前端构建：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/web build'
```

查看 workspace 包名：

```bash
./scripts/codex-docker-run.sh 'pnpm list -r --depth -1'
```

如果 `@stss/server` 或 `@stss/web` 不是实际包名，Codex 应先通过上面的命令确认包名，再调整 `--filter`，不得退回宿主机直接运行 `pnpm`。

### 特殊情况

默认使用 `test-server`：

```bash
./scripts/codex-docker-run.sh '<command>'
```

只有在明确需要前端运行服务环境时，才使用：

```bash
CODEX_DOCKER_SERVICE=web ./scripts/codex-docker-run.sh '<command>'
```

只有在明确需要后端运行服务环境时，才使用：

```bash
CODEX_DOCKER_SERVICE=server ./scripts/codex-docker-run.sh '<command>'
```

### 失败处理

如果命令失败，Codex 必须报告：

1. 实际运行的 wrapper 命令；
2. 实际使用的 Docker Compose service；
3. 容器内工作目录；
4. 原始错误输出；
5. 判断失败原因是代码问题、依赖问题、Docker 环境问题，还是命令写错；
6. 最小修复建议。

如果失败原因是宿主机缺少 `pnpm`、`npm`、`node`、`tsc` 或 `prisma`，说明运行方式错误，必须改用：

```bash
./scripts/codex-docker-run.sh '<command>'
```

不得为了修复宿主机环境而修改项目代码。