# STSS - Smart Teaching Service System

> 智慧教学服务系统

一个现代化的教学管理平台，采用完全容器化的开发环境，提供课程管理、自动排课、智能选课、论坛交流、在线测试、成绩管理等功能。

## 技术栈

| 层级         | 技术                                                      |
| ------------ | --------------------------------------------------------- |
| **前端**     | React 19 + TypeScript + Vite 6 + Ant Design 5 + Zustand 5 |
| **后端**     | Node.js 22 + Express 5 + Prisma 7                         |
| **数据库**   | PostgreSQL 18 + Redis 7                                   |
| **开发环境** | Docker Compose                                            |
| **CI/CD**    | GitHub Actions                                            |

## 开发环境设置

### 系统要求

- Docker Desktop 或 Docker Engine
- Docker Compose

### 启动项目

```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 访问服务
# Frontend:  http://localhost:5173
# Backend:   http://localhost:3000
# Adminer:   http://localhost:8080
```

### 测试账号

| 用户名 | 密码     | 角色       |
| ------ | -------- | ---------- |
| admin  | Admin123 | 超级管理员 |

## 项目结构

```
.
├── frontend/          # React + Vite 前端
├── backend/           # Express + Prisma 后端
├── shared/            # 共享类型定义
├── prisma/            # 数据库 Schema
└── docker-compose.yml # 容器编排
```

## 核心功能

### 6 个子系统

| 子系统              | 功能                         | 状态      |
| ------------------- | ---------------------------- | --------- |
| **A. 基础信息管理** | 用户、角色、权限、部门、课程 | ✅ 已完成 |
| **B. 自动排课**     | 教室资源、自动排课算法       | 🚧 开发中 |
| **C. 智能选课**     | 培养方案、选课退选、AI 辅助  | 🚧 开发中 |
| **D. 论坛交流**     | 帖子、评论、公告             | 📋 待开发 |
| **E. 在线测试**     | 题库、试卷、答题、评分       | 📋 待开发 |
| **F. 成绩管理**     | 成绩录入、GPA 统计           | 📋 待开发 |

## CI/CD

项目使用 GitHub Actions 进行持续集成：

**Code Quality** (所有分支):

- ✅ ESLint 代码检查
- ✅ TypeScript 类型检查
- ✅ Prisma Schema 验证
- ✅ 单元测试 (Vitest)

## 开发规范

### 代码质量

- 提交前必须通过 lint 检查: `pnpm lint`
- TypeScript strict mode
- ESLint + Prettier
- Git Flow + Conventional Commits

### 分支管理

- `main` - 生产分支
- `develop` - 开发分支
- `feature/*` - 功能分支
- `hotfix/*` - 紧急修复

## 相关链接

- **GitHub**: https://github.com/EmergentTwilight/Smart-Teaching-Service-System
- **飞书文档**: [开发指南](https://tcncx9czflpz.feishu.cn/wiki/OAxZwur1VicbthkbJDgcoIaSnYb) | [数据库设计](https://tcncx9czflpz.feishu.cn/wiki/EDEKwJ9akirkkkkv52bcyUW0nmc)

---

**当前分支**: `develop`
**开发状态**: 🚧 进行中
