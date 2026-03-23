# STSS 智慧教学服务系统 - 项目移交说明

## 📋 项目概述

**项目名称**：智慧教学服务系统 (Smart Teaching Service System, STSS)

**项目类型**：课程项目 - 团队协作开发

**技术栈**：

- **前端**：React 19 + TypeScript + Ant Design + Vite
- **后端**：Node.js 22 + Express + Prisma + PostgreSQL
- **架构**：Monorepo (pnpm workspace)

**代码仓库**：https://github.com/EmergentTwilight/Smart-Teaching-Service-System

---

## 🎯 当前项目状态

### ✅ 已完成（基础版本）

#### 1. 项目基础设施

- [x] Monorepo 项目结构 (backend/frontend/shared)
- [x] Docker 开发环境 (docker-compose.yml)
- [x] CI/CD 配置 (GitHub Actions)
- [x] 代码规范工具 (ESLint + Prettier + Husky + Commitlint)
- [x] API 文档 (Swagger/OpenAPI)
- [x] 本地开发检查流程 (pre-commit + pre-push hooks)

#### 2. 数据库设计

- [x] 完整的 Prisma Schema (6个子系统全部定义)
- [x] 用户系统 (User/Student/Teacher/Admin)
- [x] 课程系统 (Course/Major/Department)
- [x] 选课系统 (CourseSelection)
- [x] 成绩系统 (Score)
- [x] 论坛系统 (Post/Reply/Like)
- [x] 考试系统 (Exam/Question/TestPaper)

#### 3. 后端模块 (A组已完成)

- [x] **认证模块** (auth)
  - 登录/注册/登出
  - JWT 双令牌机制 (access token + refresh token)
  - 密码强度验证
  - 令牌刷新

- [x] **用户管理** (users)
  - CRUD 操作
  - 角色分配
  - 分页查询

- [x] **院系管理** (departments)
  - 院系列表
  - 院系详情

- [x] **课程管理** (courses)
  - CRUD 操作
  - 关联院系和教师
  - 分页查询

#### 4. 前端模块 (A组已完成)

- [x] 登录页面
- [x] 用户管理页面 (列表/表单)
- [x] 主布局 (侧边栏/顶栏)
- [x] 路由配置
- [x] 状态管理 (Zustand + React Query)
- [x] API 请求封装

---

## 👥 小组分工

### A组 - 信息管理 (已完成基础版本)

**模块路径**：`backend/src/modules/info-management/`, `frontend/src/modules/info-management/`

**已实现功能**：

- ✅ 认证系统 (登录/注册/登出)
- ✅ 用户管理 CRUD
- ✅ 院系管理 (查询)
- ✅ 课程管理 CRUD

**后续任务**：

- [ ] 完善用户个人资料页面
- [ ] 添加用户头像上传
- [ ] 完善院系管理 (增删改)
- [ ] 添加操作日志查询
- [ ] 优化前端表单体验

---

### B组 - 课程规划

**模块路径**：`backend/src/modules/course-arrangement/`, `frontend/src/modules/course-arrangement/`

**数据库模型**：已定义 (CourseArrangement, TimeSlot, Classroom)

**任务说明**：

1. **课程排课功能**
   - 创建排课计划
   - 分配教室和时间
   - 避免冲突检测

2. **教室管理**
   - 教室信息维护
   - 教室占用查询
   - 教室预约

3. **课表生成**
   - 自动排课算法
   - 手动调整
   - 课表导出

**开发参考**：

- 参考 A 组的模块结构 (routes/controller/service/types)
- 使用 Prisma 已定义的模型
- 遵循代码注释规范（中文）

---

### C组 - 选课系统

**模块路径**：`backend/src/modules/course-selection/`, `frontend/src/modules/course-selection/`

**数据库模型**：已定义 (CourseSelection, SelectionPeriod)

**任务说明**：

1. **选课功能**
   - 学生选课
   - 退课
   - 选课限制 (人数/时间/冲突)
   - 选课结果查询

2. **选课时段管理**
   - 创建选课批次
   - 设置开始/结束时间
   - 批次状态管理

3. **选课统计**
   - 选课人数统计
   - 课程热度分析
   - 选课情况导出

**开发参考**：

- 注意并发选课的库存扣减问题
- 需要添加事务保护
- 考虑选课冲突检测逻辑

---

### D组 - 成绩管理

**模块路径**：`backend/src/modules/score-management/`, `frontend/src/modules/score-management/`

**数据库模型**：已定义 (Score, GradeComposition)

**任务说明**：

1. **成绩录入**
   - 教师录入成绩
   - 成绩组成设置 (平时/期中/期末)
   - 批量导入成绩

2. **成绩查询**
   - 学生查看自己的成绩
   - 教师查看班级成绩
   - 成绩统计

3. **成绩分析**
   - 成绩分布图
   - 及格率统计
   - 成绩排名

**开发参考**：

- 注意成绩的权限控制
- 成绩修改需要记录日志
- 考虑成绩的隐私性

---

### E组 - 论坛系统

**模块路径**：`backend/src/modules/forum/`, `frontend/src/modules/forum/`

**数据库模型**：已定义 (Post, Reply, Like, PostAttachment)

**任务说明**：

1. **帖子功能**
   - 发布帖子
   - 编辑/删除帖子
   - 帖子分类
   - 帖子搜索

2. **评论回复**
   - 发表评论
   - 回复评论
   - 评论排序

3. **互动功能**
   - 点赞/取消点赞
   - 收藏帖子
   - 举报功能

4. **附件管理**
   - 上传附件
   - 下载附件
   - 附件预览

**开发参考**：

- 注意敏感词过滤
- 考虑楼层显示逻辑
- 实现帖子分页加载

---

### F组 - 在线考试

**模块路径**：`backend/src/modules/online-testing/`, `frontend/src/modules/online-testing/`

**数据库模型**：已定义 (Exam, Question, TestPaper, StudentAnswer)

**任务说明**：

1. **题库管理**
   - 题目录入
   - 题目分类
   - 题目导入/导出

2. **考试管理**
   - 创建考试
   - 设置考试时间
   - 组卷规则
   - 发布考试

3. **考试答题**
   - 学生参加考试
   - 答题计时
   - 自动保存
   - 提交试卷

4. **自动阅卷**
   - 客观题自动评分
   - 主观题人工批改
   - 成绩统计

**开发参考**：

- 注意考试时间控制
- 考虑断网重连问题
- 防止作弊机制

---

## 🛠️ 开发规范

### 1. 代码注释规范

```typescript
/**
 * 函数/类的说明（中文）
 * @param paramName 参数说明
 * @returns 返回值说明
 * @throws 可能抛出的异常
 */
```

### 2. 文件命名规范

```
模块结构：
backend/src/modules/<module>/
├── <resource>.routes.ts      # 路由定义
├── <resource>.controller.ts  # 请求处理
├── <resource>.service.ts     # 业务逻辑
├── <resource>.types.ts       # 类型定义 + Zod schema
└── index.ts                  # 模块导出

frontend/src/modules/<module>/
├── api/
│   └── <resource>.ts         # API 调用
├── pages/
│   ├── <Resource>List.tsx    # 列表页面
│   └── <Resource>Form.tsx    # 表单组件
└── index.ts                  # 模块导出
```

### 3. 提交信息规范

```
<type>(<scope>): <subject>

type: feat|fix|docs|style|refactor|test|chore
scope: A|B|C|D|E|F|shared|db|ci|deps

示例：
feat(B): 添加课程排课功能
fix(C): 修复选课并发问题
docs: 更新开发文档
```

### 4. 分支规范

```
main          # 生产分支（仅通过 PR 合并）
develop       # 开发分支
feature/A-*   # A 组功能分支
feature/B-*   # B 组功能分支
...
```

### 5. 开发流程

```bash
# 1. 拉取最新代码
git checkout develop
git pull origin develop

# 2. 创建功能分支
git checkout -b feature/B-course-arrangement

# 3. 开发（本地自动检查）
# - pre-commit: lint + format
# - pre-push: lint + typecheck + prisma validate

# 4. 提交代码
git add .
git commit -m "feat(B): 添加课程排课功能"
git push origin feature/B-course-arrangement

# 5. 创建 Pull Request → develop
# 6. Code Review 通过后合并
```

---

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 22.0.0
- pnpm >= 10.0.0
- Docker + Docker Compose

### 2. 本地启动

```bash
# 克隆仓库
git clone https://github.com/EmergentTwilight/Smart-Teaching-Service-System.git
cd Smart-Teaching-Service-System

# 安装依赖
pnpm install

# 启动 Docker 环境（数据库 + 后端 + 前端）
make dev
# 或
docker-compose up -d

# 查看日志
docker-compose logs -f

# 访问
# 前端: http://localhost:5173
# 后端: http://localhost:3000
# API 文档: http://localhost:3000/api-docs
```

### 3. 数据库管理

```bash
# 查看数据库
make db-view

# 重置数据库
make db-reset
```

### 4. 开发命令

```bash
# 代码检查
make lint

# 类型检查
make typecheck

# 格式化代码
make format

# 完整 CI 检查（本地）
pnpm lint && pnpm typecheck
```

---

## 📚 重要文档

| 文档         | 路径                                                            | 说明             |
| ------------ | --------------------------------------------------------------- | ---------------- |
| API 文档     | http://localhost:3000/api-docs                                  | Swagger 自动生成 |
| 数据库设计   | `backend/prisma/schema.prisma`                                  | Prisma Schema    |
| 环境变量示例 | `.env.example`                                                  | 环境配置模板     |
| API 版本策略 | `docs/api-versioning.md`                                        | API 版本管理     |
| 开发文档     | https://tcncx9czflpz.feishu.cn/wiki/OAxZwur1VicbthkbJDgcoIaSnYb | 飞书文档         |

---

## 🔧 常见问题

### Q1: 如何添加新的模块？

**A**: 参考 A 组的 `info-management` 模块结构，在 `backend/src/modules/` 和 `frontend/src/modules/` 下创建对应目录。

### Q2: 数据库模型可以修改吗？

**A**: 可以。修改 `backend/prisma/schema.prisma` 后运行：

```bash
cd backend
npx prisma format      # 格式化
npx prisma generate    # 生成客户端
npx prisma db push     # 同步到数据库
```

### Q3: 如何调试 API？

**A**: 访问 http://localhost:3000/api-docs 使用 Swagger UI 测试 API。

### Q4: 前端如何调用后端 API？

**A**: 参考 `frontend/src/modules/info-management/api/users.ts` 的实现方式。

### Q5: 遇到 CI 失败怎么办？

**A**: 本地运行 `pnpm lint && pnpm typecheck` 检查，pre-push hook 会自动运行这些检查。

---

## 📞 联系方式

**项目总负责**：Travis (程韬)

**技术支持**：

- GitHub Issues: https://github.com/EmergentTwilight/Smart-Teaching-Service-System/issues
- 飞书文档: https://tcncx9czflpz.feishu.cn/wiki/OAxZwur1VicbthkbJDgcoIaSnYb

---

## ✅ 验收标准

每个模块开发完成后，需确保：

1. **功能完整性**
   - [ ] 所有 CRUD 操作正常
   - [ ] 边界情况处理
   - [ ] 错误提示友好

2. **代码质量**
   - [ ] 通过 lint 检查
   - [ ] 通过 TypeScript 类型检查
   - [ ] 代码有完整中文注释
   - [ ] 使用 Zod 验证输入

3. **测试**
   - [ ] 本地测试通过
   - [ ] CI 检查通过
   - [ ] 功能演示正常

4. **文档**
   - [ ] API 文档完整（Swagger 注释）
   - [ ] 更新 README（如有必要）

---

**祝各小组开发顺利！🚀**
