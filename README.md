# STSS - Smart Teaching Service System

> 智慧教学服务系统

一个现代化的教学管理平台，采用完全容器化的开发环境，提供课程管理、自动排课、智能选课、论坛交流、在线测试、成绩管理等功能。

## 技术栈

| 层级         | 技术                                                          |
| ------------ | ------------------------------------------------------------- |
| **前端**     | React 19 + TypeScript 5.7 + Vite 6 + Ant Design 5 + Zustand 5 |
| **后端**     | Node.js 22 + Express 5 + Prisma 6 + TypeScript 5.7            |
| **数据库**   | PostgreSQL 18 + Redis 7                                       |
| **开发环境** | Docker Compose                                                |
| **CI/CD**    | GitHub Actions                                                |

## 快速开始

### 系统要求

- Docker Desktop 或 Docker Engine
- Docker Compose

### 启动项目

```bash
# 克隆项目
git clone https://github.com/EmergentTwilight/Smart-Teaching-Service-System.git
cd Smart-Teaching-Service-System

# 启动所有服务（首次启动约需 2-3 分钟）
docker compose up -d

# 查看服务状态
docker compose ps
```

### 访问服务

| 服务     | 地址                  |
| -------- | --------------------- |
| 前端     | http://localhost:5173 |
| 后端 API | http://localhost:3000 |
| Adminer  | http://localhost:8080 |

### 测试账号

| 账号    | 密码       | 角色       |
| ------- | ---------- | ---------- |
| admin   | Admin123   | 超级管理员 |
| teacher | teacher123 | 教师       |
| student | student123 | 学生       |

## 项目结构

```
STSS/
├── frontend/           # @stss/web - React 前端
│   └── src/
│       ├── modules/    # 按子系统分模块
│       └── shared/     # 公共组件
│
├── backend/            # @stss/server - Express 后端
│   ├── src/
│   │   ├── modules/    # 按子系统分模块
│   │   └── shared/     # 公共模块
│   └── prisma/         # 数据库 Schema
│
├── shared/             # @stss/shared - 共享类型
├── docs/               # 项目文档
└── docker-compose.yml  # Docker 配置
```

## 核心功能

### 6 个子系统

| 子系统              | 功能                         | 状态        |
| ------------------- | ---------------------------- | ----------- |
| **A. 基础信息管理** | 用户、角色、权限、院系、专业 | 🚧 部分完成 |
| **B. 自动排课**     | 教室资源、自动排课算法       | ⬜ 未开始   |
| **C. 智能选课**     | 培养方案、选课退选、AI 辅助  | ⬜ 未开始   |
| **D. 论坛交流**     | 帖子、评论、公告             | ⬜ 未开始   |
| **E. 在线测试**     | 题库、试卷、答题、评分       | ⬜ 未开始   |
| **F. 成绩管理**     | 成绩录入、GPA 统计           | ⬜ 未开始   |

## 常用命令

```bash
# Docker 环境
make up           # 启动所有服务
make down         # 停止所有服务
make logs         # 查看日志
make shell-server # 进入后端容器

# 本地开发（需要在容器内执行）
pnpm lint         # Lint 检查
pnpm typecheck    # 类型检查
pnpm test         # 运行测试
```

## 开发规范

### 分支管理

```
main                    # 生产环境
│
├── develop             # 开发主分支
│   │
│   ├── dev/A           # A组集成分支
│   ├── dev/B           # B组集成分支
│   ├── dev/C           # C组集成分支
│   ├── dev/D           # D组集成分支
│   ├── dev/E           # E组集成分支
│   └── dev/F           # F组集成分支
│
└── docs/*              # 文档分支
```

### Commit 规范

```bash
<type>(<scope>): <subject>

# 示例
feat(A): add user CRUD API
fix(A): resolve login issue
docs: update README
```

## 文档

- [项目要求](./docs/project-requirements.md)
- [开发规范](./docs/development-specifications.md)
- [数据库设计](./docs/database-design.md)
- [API 文档](./docs/apis/)

## 相关链接

- **GitHub**: https://github.com/EmergentTwilight/Smart-Teaching-Service-System
- **飞书文档**: [开发指南](https://tcncx9czflpz.feishu.cn/wiki/OAxZwur1VicbthkbJDgcoIaSnYb) | [数据库设计](https://tcncx9czflpz.feishu.cn/wiki/EDEKwJ9akirkkkkv52bcyUW0nmc)
