# C 组成员 1 工作指导：C1 + C2 后端

> 适用成员：成员 1
> 对应 skill：`$stss-c-member1-backend-curriculum-course-search`
> 负责范围：C1 培养方案与学分进展、C2 课程搜索与课程详情后端
> 工作原则：只做 C1/C2 后端，不实现 C3 选课事务、C4/C5 管理导出、C6 AI 或完整前端页面。

## 1. 工作前必须阅读

开始编码前按顺序阅读或对照：

1. `docs/srs/C-smart-course-selection-srs.md`
2. `docs/apis/shared.md`
3. `docs/apis/C-smart-course-selection.md`
4. `docs/modules/course-selection-design.md`
5. `docs/tasks/C-work-breakdown.md`
6. `docs/agent-guides/C-coding-agent-guidelines.md`
7. `docs/database-design.md`
8. `docs/project-requirements.md`
9. `docs/development-specifications.md`
10. `backend/src/modules/course-selection/README.md`
11. `AGENTS.md`
12. `README.md`

如文档或代码出现冲突，按以下优先级处理：

```text
项目要求/数据库设计 > C 组 SRS > shared/C API > 模块设计 > 分工文档 > agent guidelines > 当前代码
```

不要因为当前 scaffold 返回 TODO/501，就自行改变 API 契约；应先对齐 `docs/apis/C-smart-course-selection.md`。

## 2. Git 操作建议

### 2.1 分支管理

从 `dev/C` 创建成员 1 功能分支，沿用项目已有 `feat/A-...`、`fix/B-...`、`docs/...` 风格：

```bash
git checkout dev/C
git pull origin dev/C
git checkout -b feat/C-curriculum-course-search-<MMDD>
```

推荐分支名：

```text
feat/C-curriculum-course-search-<MMDD>
feat/C-curriculum-progress-<MMDD>
fix/C-course-search-contract-<MMDD>
docs/C-member1-notes-<MMDD>
```

不要直接从 `main` 或 `develop` 开 C1/C2 功能分支；不要把 C1/C2 后端未完成代码直接推到 `main`、`develop`。如果需要拆分大任务，优先拆成“培养方案/学分进展”和“课程搜索/可选课程”两个功能分支，减少与其他成员冲突。

### 2.2 提交规范

Commit message 遵循 `README.md`：

```text
<type>(<scope>): <subject>
```

推荐使用 `C` 作为 scope，并在 subject 写清 C1/C2 内容；若负责人允许子模块 scope，可使用 `C1,C2`。

```text
feat(C): add curriculum query backend
feat(C): add course offering search filters
fix(C): align available offering eligibility reasons
docs(C): update member1 backend handoff notes
```

一次提交只覆盖一个清晰主题。不要把 C1/C2 后端实现、C3 事务修改、前端页面修改混在同一个 commit 中。

### 2.3 PR 建议

优先从成员功能分支向 `dev/C` 开 PR。若组内暂时不强制 PR，也应在合并说明中保留同等信息。

PR 描述必须包含：

```text
1. 对应子模块：C1/C2。
2. 覆盖需求：例如 FR-C-01~FR-C-13、FR-C-15、FR-C-18、FR-C-19。
3. 修改文件清单。
4. 已完成内容。
5. 未完成 TODO 和依赖项，例如 TODO-C-01、TODO-C-02、TODO-C-05。
6. Docker wrapper 校验命令和结果。
7. 手动测试步骤。
8. 是否修改 API 契约、数据库/Prisma schema、非 C 组文件。
```

PR 合并前先同步 `dev/C`，解决冲突后再请求负责人 review。不要在未说明的情况下修改其他成员文件。

## 3. 需求与接口范围

成员 1 覆盖：

| 子模块 | 需求编号 | 主要能力 |
|---|---|---|
| C1 | `FR-C-01` 至 `FR-C-07` | 当前学生培养方案、课程类别、建议学期、学分进展。 |
| C2 | `FR-C-08` 至 `FR-C-13`、`FR-C-15`、`FR-C-18`、`FR-C-19` | 课程搜索、开课列表、课程详情、可选课程只读 eligibility。 |

主要接口：

```text
GET /api/v1/course-selection/curriculum/me
GET /api/v1/course-selection/curriculum/me/progress
GET /api/v1/course-selection/courses
GET /api/v1/course-selection/offerings
GET /api/v1/course-selection/offerings/available
GET /api/v1/course-selection/offerings/:id
```

字段必须以 API 文档为准。外部请求和响应使用 `snake_case`，service 内部可以使用 `camelCase`。

特别注意：

- `/offerings/available` 的可选性原因使用文档中的 `eligibility.reasons`。
- 可选课程接口只做只读 eligibility 计算；最终选课成功仍由 C3 后端事务决定。
- 培养方案“确认入口”如需持久化，属于 `TODO-C-01`，不得在 C 模块擅自新增表。
- 公共课最低学分来源属于 `TODO-C-02`，实现时只能按现有字段派生或写清 TODO。

## 4. 允许修改的文件

优先修改：

```text
backend/src/modules/course-selection/curriculum.controller.ts
backend/src/modules/course-selection/curriculum.service.ts
backend/src/modules/course-selection/course-search.controller.ts
backend/src/modules/course-selection/course-search.service.ts
backend/src/modules/course-selection/course-selection.schemas.ts
backend/src/modules/course-selection/course-selection.types.ts
backend/src/modules/course-selection/README.md
```

必要时只读：

```text
backend/src/modules/course-selection/course-selection.routes.ts
backend/src/modules/course-selection/enrollment.service.ts
backend/src/modules/course-selection/timetable.service.ts
backend/src/modules/course-selection/roster.service.ts
backend/src/modules/course-selection/selection-period.service.ts
backend/src/modules/course-selection/ai-advisor.service.ts
frontend/src/modules/course-selection/**
```

除非负责人明确要求，不修改：

```text
prisma/schema.prisma
package.json
pnpm-lock.yaml
frontend/src/modules/course-selection/pages/**
backend/src/modules/info-management/**
backend/src/modules/course-arrangement/**
backend/src/modules/forum/**
backend/src/modules/score-management/**
```

## 5. 具体要完成的工作

优先级建议：

1. 对齐 C1/C2 DTO 和 schema，确认响应结构与 API 文档一致。
2. 实现当前登录学生培养方案查询：根据学生专业、年级匹配 `Curriculum`，返回 `course_groups`、课程类别和建议学期。
3. 实现学分进展：基于当前学生有效 `Enrollment` 和培养方案课程统计 `required/elective/general` 等分类学分。
4. 实现课程目录与开课列表查询：支持 `keyword`、教师、学期、课程类型、状态、分页。
5. 实现课程开设详情：返回课程、学期、教师、容量、已选人数、排课、先修信息。
6. 实现 `/offerings/available` 只读 eligibility：返回容量、已选、冲突、先修、培养方案适配、当前阶段等原因。
7. 补充针对空数据、无培养方案、排课缺失、先修接口未接入等场景的明确错误或 TODO。

实现时可读取这些模型：

```text
Student
Course
CourseOffering
Teacher
Schedule
Curriculum
CurriculumCourse
CoursePrerequisite
Enrollment（只读）
SelectionPeriod（只读，用于 eligibility）
Semester
```

## 6. 禁止事项

成员 1 不得做：

```text
1. 创建、修改或退选 Enrollment。
2. 更新 CourseOffering.enrolled_count。
3. 实现 POST /enrollments 或 PATCH /enrollments/:id/drop。
4. 实现教师名单、Excel 导出、SelectionPeriod 管理、手动加课。
5. 实现 AI 推荐或解释逻辑。
6. 新增 StudentPlan、AIRecommendation、CourseSelectionQueue 等业务表。
7. 为了课程详情返回教师 roster 或学生名单敏感数据。
8. 修改 A/B/D/E/F 组业务逻辑。
```

如果需要 C3/C4/C5/C6 支持，写清 TODO 或在 PR 说明中列为依赖。

## 7. 推荐 AI 工作流

建议每次只让 AI 处理一个小范围，不要一次要求“实现整个 C1/C2”。

### 7.1 开始任务

给 AI 的开场提示建议：

```text
使用 $stss-c-course-selection 和 $stss-c-member1-backend-curriculum-course-search。
请先阅读 C 组 SRS、C API、C-work-breakdown、backend course-selection README。
本次只处理 C1/C2 后端，不实现 C3 选课事务或任何前端页面。
```

### 7.2 拆分实现

推荐拆成这些独立 AI 任务：

1. “检查 C1/C2 DTO、schema 与 API 文档是否一致，只给出需要改的点。”
2. “实现 `GET /curriculum/me`，只改 `curriculum.*` 和必要 C1 类型，不改 Prisma schema。”
3. “实现 `GET /curriculum/me/progress`，只读 `Enrollment`，不创建或修改选课记录。”
4. “实现 `GET /courses` 和 `GET /offerings` 的分页筛选，避免大表无分页查询。”
5. “实现 `/offerings/available` 只读 eligibility，并明确最终选课仍由 C3 事务判断。”
6. “补充 C1/C2 后端手动测试步骤和剩余 TODO。”

### 7.3 AI 输出复核

每轮 AI 修改后检查：

- 是否只改 C1/C2 后端文件。
- 是否新增了未授权业务表或 Prisma schema 修改。
- 是否出现危险假实现，如 `return { success: true }`。
- 是否使用了文档未定义字段。
- 是否让学生端通过请求参数传 `student_id` 查询他人培养方案。
- 是否保留了必要 TODO-C-01、TODO-C-02、TODO-C-05、TODO-C-07。

## 8. 验证要求

必须通过 Docker wrapper，不得在宿主机直接运行 `pnpm/npm/node/tsc/prisma`。

后端标准命令：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

建议手动验证：

```text
1. 用 student 登录态请求 /curriculum/me，确认只返回当前学生培养方案。
2. 请求 /curriculum/me/progress，确认分类学分和已选状态一致。
3. 请求 /courses 和 /offerings，确认分页、筛选和字段名与 API 文档一致。
4. 请求 /offerings/available?include_unavailable=true，确认 eligibility.reasons 可展示不可选原因。
5. 用无培养方案学生测试，确认返回明确错误或文档约定的提示。
```

## 9. 交付说明模板

提交或交接时必须说明：

```text
1. 修改文件清单和每个文件作用。
2. 完成的 FR-C 编号。
3. 是否只涉及成员 1 的 C1/C2 后端。
4. 是否修改 API 契约或权限边界。
5. 是否修改数据库或 Prisma schema。
6. 是否触及 C3/C4/C5/C6、前端或非 C 组文件。
7. 新增或保留的 TODO。
8. 实际执行的 Docker wrapper 命令和结果。
9. 手动测试步骤。
10. 需要负责人或其他成员确认的问题。
```
