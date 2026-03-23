# STSS - Smart Teaching Service System

> 智慧教学服务系统

一个现代化的教学管理平台，采用完全容器化的开发环境，提供课程管理、自动排课、智能选课、论坛交流、在线测试、成绩管理等功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19 + TypeScript + Vite 6 + Ant Design 5 + Zustand 5 |
| **后端** | Node.js 22 + Express 5 + Prisma 7 |
| **数据库** | PostgreSQL 18 |
| **开发环境** | Docker Compose |

## 开发环境设置

### 勉拉要求

- Docker Desktop 或 Docker Engine
- Docker Compose

### 启动项目

```bash
git clone <repository-url>
cd Smart-Teaching-Service-System

# 启动所有服务
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

## 项目结构

```
STSS/
├── frontend/              # 前端服务（React + Vite）
│   ├── src/
│   │   ├── modules/       # 按子系统分模块
│   │   ├── shared/        # 公共组件
│   │   ├── stores/        # 状态管理
│   │   └── router/
│   └── package.json
├── backend/               # 后端服务（Express + Prisma）
│   ├── src/
│   │   ├── modules/       # 按子系统分模块
│   │   ├── shared/        # 公共模块
│   │   └── prisma/        # 数据库 Schema
│   └── package.json
├── shared/                # 前后端共享类型定义
├── docker-compose.dev.yml
└── docker-compose.yml
```

## 核心功能

### 6 个子系统

| 子系统 | 功能 | 描述 |
|------|------|------|
| **A - 基础信息管理** | 用户、课程、教室管理 | 用户认证、权限管理、院系专业信息 |
| **B - 自动排课** | 排课算法、课表生成 | 教室资源调度、冲突检测 |
| **C - 智能选课** | 选课系统、容量控制 | 先修课程检查、选课时间段管理 |
| **D - 论坛交流** | 帖子、评论、附件 | 课程讨论、问题解答、公告发布 |
| **E - 在线测试** | 题库、组卷、考试 | 选择题、判断题、自动评分 |
| **F - 成绩管理** | 成绩录入、统计分析 | 成绩修改、GPA 计算 |

## 数据库模型

### 核心表

| 模块 | 主要表 | 说明 |
|------|------|------|
| **用户管理** | User, Student, Teacher, Admin | 用户基础信息和角色管理 |
| **权限系统** | Role, Permission, UserRole, RolePermission | RBAC 权限控制 |
| **课程管理** | Course, CourseOffering, Semester | 课程基本信息和开课记录 |
| **选课管理** | Enrollment, SelectionPeriod | 学生选课记录和选课时间段 |
| **论坛管理** | ForumPost, ForumComment, ForumAttachment | 课程讨论和帖子管理 |
| **测试管理** | Question, QuestionOption, TestPaper, TestQuestion, TestResult, Answer | 题库、试卷和答题管理 |
| **成绩管理** | Score, ScoreModificationLog, GPARecord | 成绩录入和修改记录、GPA 统计 |

## 开发规范

### 代码质量

- **提交前必须通过 lint 检查** `npm run lint`
- 代码规范： TypeScript strict mode, ESLint + Prettier
- 命名规范: camelCase（前端）/ snake_case（数据库）
- 分支管理: Git Flow + PR/Commit 规范

- **飞书文档**: [开发指南](https://tcncx9czflpz.feishu.cn/wiki/OAxZwur1VicbthkbJDgcoIaSnYb)

## 相关链接

- **GitHub**: https://github.com/EmergentTwilight/Smart-Teaching-Service-System
- **飞书文档**: [数据库设计](https://tcncx9czflpz.feishu.cn/wiki/EDEKwJ9akirkkkkv52bcyUW0nmc)

---

**当前分支**: `main`
**开发状态**: 进行中
