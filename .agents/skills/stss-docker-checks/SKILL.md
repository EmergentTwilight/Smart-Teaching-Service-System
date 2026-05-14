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
5. 本项目默认 Codex 校验服务为 `test-server`，默认容器内工作目录为 `/app`。不要使用容器名 `stss-test-server`，应使用 Compose service 名 `test-server`。