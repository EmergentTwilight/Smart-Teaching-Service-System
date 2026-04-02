# STSS - Smart Teaching Service System
# Docker Compose 开发环境命令

COMPOSE_FILE = docker-compose.yml

# 启动所有服务
up:
	docker compose -f $(COMPOSE_FILE) up

# 后台启动
up-d:
	docker compose -f $(COMPOSE_FILE) up -d

# 停止服务
down:
	docker compose -f $(COMPOSE_FILE) down

# 构建镜像
build:
	docker compose -f $(COMPOSE_FILE) build

# 查看日志
logs:
	docker compose -f $(COMPOSE_FILE) logs -f

# 查看容器状态
ps:
	docker compose -f $(COMPOSE_FILE) ps

# 清理（包括 volumes）
clean:
	docker compose -f $(COMPOSE_FILE) down -v

# 重启所有服务
restart:
	docker compose -f $(COMPOSE_FILE) restart

# 进入后端容器
shell-server:
	docker exec -it stss-server sh

# 进入 E 组 Rust 后端容器
shell-e-server:
	docker exec -it stss-e-server sh

# 进入前端容器
shell-web:
	docker exec -it stss-web sh

# 运行数据库 seed
db-seed:
	docker exec -it stss-server pnpm db:seed

# 打开 Prisma Studio
db-studio:
	docker exec -it stss-server pnpm db:studio

# Lint 检查
lint:
	docker exec stss-server pnpm lint
	docker exec stss-web pnpm lint

# 启动 E 组 Rust 后端（含依赖）
up-e:
	docker compose -f $(COMPOSE_FILE) up -d postgres redis e-server

# 前端切换到 E 组 Rust API（3001）并重建
web-use-e:
	set WEB_API_URL=http://localhost:3001/api/v1&& docker compose -f $(COMPOSE_FILE) up -d web

# 前端切回默认 Node API（3000）并重建
web-use-node:
	set WEB_API_URL=http://localhost:3000/api/v1&& docker compose -f $(COMPOSE_FILE) up -d web

# 仅 E 组路径走 Rust，其余继续走 Node（推荐）
web-split-e:
	set WEB_API_URL=http://localhost:3000/api/v1&& set WEB_E_API_URL=http://localhost:3001/api/v1&& set WEB_E_API_PREFIXES=/online-testing&& docker compose -f $(COMPOSE_FILE) up -d web

# 查看 E 组 Rust 后端日志
logs-e:
	docker compose -f $(COMPOSE_FILE) logs -f e-server

.PHONY: up up-d down build logs ps clean restart shell-server shell-e-server shell-web db-seed db-studio lint up-e web-use-e web-use-node web-split-e logs-e
