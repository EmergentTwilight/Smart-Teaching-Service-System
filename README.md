# STSS - Smart Teaching Service System

> 智慧教学服务系统

一个现代化的教学管理平台，采用完全容器化的开发环境，提供课程管理、自动排课、智能选课、论坛交流、在线测试、成绩管理等功能。

## 项目概述

- **团队规模**: 36 人，分为 6 个开发组
- **开发方式**: 完全容器化（Docker Compose），本地无 `node_modules`
- **数据库**: PostgreSQL 18，每次启动通过 seeding 初始化
- **架构**: 前后端分离，RESTful API

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19 + TypeScript + Vite 6 + Ant Design 5 + Zustand 5 |
| **后端** | Node.js 22 + Express 5 + Prisma 6 + bcryptjs + JWT |
| **数据库** | PostgreSQL 18 |
| **开发环境** | Docker Compose + Adminer |

## 快速开始

### 前置要求

- Docker Desktop 或 Docker Engine
- Docker Compose
- Make（可选，也可直接用 docker-compose 命令）

### 启动项目

```bash
# 克隆项目
git clone <repository-url>
cd Smart-Teaching-Service-System

# 启动所有服务（首次启动会自动构建镜像、安装依赖、初始化数据库）
make up

# 或后台启动
make up-d
```

### 访问服务

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost:5173 | React 开发服务器 |
| 后端 API | http://localhost:3000 | Express API 服务器 |
| 数据库管理 | http://localhost:8080 | Adminer 界面 |

### 测试账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 超级管理员 |
| teacher | teacher123 | 教师 |
| student | student123 | 学生 |

## 开发命令

### 服务管理

```bash
make up          # 前台启动所有服务
make up-d        # 后台启动所有服务
make down        # 停止所有服务
make restart     # 重启所有服务
make ps          # 查看容器状态
make logs        # 查看实时日志
make clean       # 清理所有数据（包括 volumes）
```

### 容器操作

```bash
make shell-server  # 进入后端容器
make shell-web     # 进入前端容器
```

### 数据库操作

```bash
make db-seed       # 重新运行数据库种子
make db-studio     # 打开 Prisma Studio（可视化数据库）
```

## 项目结构

```
STSS/
├── frontend/              # 前端服务（React + Vite）
│   ├── src/
│   │   ├── modules/       # 按子系统分模块
│   │   ├── shared/        # 公共组件、工具
│   │   ├── stores/        # Zustand 状态管理
│   │   └── main.tsx       # 入口文件
│   ├── Dockerfile
│   └── package.json
├── backend/               # 后端服务（Express + Prisma）
│   ├── src/
│   │   ├── modules/       # 按子系统分模块（info-management 等）
│   │   ├── shared/        # 公共模块（中间件、工具）
│   │   └── index.ts       # 入口文件
│   ├── prisma/            # 数据库 Schema 和 Seed
│   ├── Dockerfile
│   └── package.json
├── shared/                # 前后端共享类型定义
│   └── types/
├── docker/
│   └── postgres/          # 数据库初始化脚本
├── docker-compose.dev.yml # 开发环境配置
├── docker-compose.yml     # 生产环境配置
├── Makefile               # 常用命令
├── DATABASE.md            # E-R 图 + Prisma Schema 说明
├── UML.md                 # 用例图、类图、时序图
├── API.md                 # RESTful API 设计
└── ARCHITECTURE.md        # 架构设计、分支管理、Commit 规范
```

## Docker 服务

| 容器名称 | 镜像 | 功能 | 端口映射 |
|----------|------|------|----------|
| stss-postgres | postgres:18-alpine | PostgreSQL 数据库 | 5432 |
| stss-server | node:22-alpine | 后端 API 服务器 | 3000 |
| stss-web | node:22-alpine | 前端开发服务器 | 5173 |
| stss-adminer | adminer:latest | 数据库管理界面 | 8080 |

网络名称: `stss-network`

## 子系统划分

| 组 | 子系统 | 状态 | 负责模块 |
|----|--------|:----:|----------|
| A | 基础信息管理 | 🚧 部分完成 | 用户、课程、教室管理 |
| B | 自动排课 | ❌ 未开始 | 排课算法、课表生成 |
| C | 智能选课 | ❌ 未开始 | 选课系统、容量控制 |
| D | 论坛交流 | ❌ 未开始 | 帖子、评论、消息 |
| E | 在线测试 | ❌ 未开始 | 题库、组卷、考试 |
| F | 成绩管理 | ❌ 未开始 | 成绩录入、统计分析 |

## 开发规范

### 代码结构

- 前后端均按子系统分模块组织
- 共享类型定义放在 `shared/` 目录
- 遵循现有项目的命名和结构约定

### 代码质量

**提交前必须通过 lint 检查：**

```bash
make lint
```

- 所有代码必须零 error、零 warning
- CI 会自动检查，不通过无法合并

### 数据库操作

- 使用 Prisma ORM，Schema 定义在 `backend/prisma/schema.prisma`
- 数据库变更通过 `db:push`（开发）或 `db:migrate`（生产）
- 数据不持久化，每次启动通过 seeding 初始化

### 分支管理

- `main` - 生产环境
- `develop` - 开发环境
- `feature/*` - 功能分支

### Commit 规范

```
<type>(<scope>): <subject>

# 示例
feat(A): 添加用户管理页面
fix(B): 修复排课冲突检测
docs: 更新 README
```

类型: `feat` `fix` `docs` `style` `refactor` `test` `chore` `perf` `ci` `revert`
范围: `A` `B` `C` `D` `E` `F` `shared` `db` `ci` `deps`

## 常见问题

### 端口冲突

如果默认端口被占用，修改 `docker-compose.dev.yml` 中的端口映射。

### 数据重置

```bash
make clean    # 清理所有数据
make up       # 重新启动
```

### 依赖更新

```bash
make shell-server  # 进入后端容器
pnpm install       # 安装新依赖
exit               # 退出
make restart       # 重启服务
```

## 设计文档

- [DATABASE.md](./DATABASE.md) - 数据库设计
- [UML.md](./UML.md) - UML 图表
- [API.md](./API.md) - API 接口文档
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构设计

## 许可证

MIT License
