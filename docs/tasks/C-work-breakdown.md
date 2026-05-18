# C 组工作拆分与协作计划

> 模块：Smart Course Selection / 智能选课<br>
> 分支：`dev/C`<br>
> 本文面向 C 组负责人和五名组员，用于分工、排期、PR 审查和 agent 任务约束。C 组 SRS 是最高依据；本文不替代 SRS。

## 1. 总体工作方式

C 组采用“负责人定边界，组员分模块，agent 做脚手架和局部实现”的方式推进。负责人不直接包办所有代码，而是负责：

```text
1. 维护 SRS、模块设计、分工文档和 agent 指南。
2. 固定 C 组 API 口径和权限边界。
3. 审查数据库使用是否偏离设计。
4. 审查选课事务、容量一致性和 AI 边界。
5. 将各组员功能分支合并到 dev/C。
```

组员在各自功能分支中完成对应模块，不应跨模块大范围改动。coding agent 可以辅助编码，但必须遵循 `docs/agent-guides/C-coding-agent-guidelines.md`。

## 2. 分支策略

默认集成分支为：

```bash
dev/C
```

功能分支建议：

```bash
feat/C-curriculum
feat/C-course-search
feat/C-enrollment-core
feat/C-results-roster
feat/C-period-admin
feat/C-ai-advisor
feat/C-student-frontend
feat/C-admin-teacher-frontend
```

`dev/C` 这种带斜杠的分支名符合其他组的命名习惯，建议继续沿用。若 GitHub 网页访问手写 URL 时出现解析问题，优先使用 GitHub 分支选择器、复制网页自动生成的分支 URL，或用 CLI 验证：

```bash
git fetch origin
git ls-remote --heads origin dev/C
git branch -r | grep 'origin/dev/C'
```

不建议仅因网页 URL 不好手写就改成 `dev-C`，否则会与其他组 `x/x` 风格不一致。只有在仓库工具、CI 或权限系统明确无法处理 `dev/C` 时，才由负责人统一决定是否迁移到 `dev-C`。

## 3. 子模块划分

| 子模块 | 名称 | 核心交付 |
|---|---|---|
| C1 | 培养方案与学分进展 | 当前学生培养方案、课程类别、建议学期、分类学分进度。 |
| C2 | 课程搜索与课程详情 | 课程搜索、课程开设列表、课程详情、可选/不可选原因。 |
| C3 | 选课/退选核心流程 | 选课事务、退选事务、容量控制、重复选课、时间冲突、最大学分、先修课检查。 |
| C4 | 结果、课表与名单导出 | 学生选课结果、个人课表、教师学生名单和 Excel 导出。 |
| C5 | 选课管理与并发控制 | 初选/补退选/调整阶段管理、手动加课、连接数控制、长时间无操作强制退出预留。 |
| C6 | AI 辅助选课 | 推荐课程、推荐理由、冲突解释、学分影响说明。 |

## 4. 建议人员分工

| 角色 | 主要负责 | 重点文件 |
|---|---|---|
| C 组负责人 | 需求、文档、API 口径、事务规则、PR Review、最终联调。 | `docs/srs/`、`docs/modules/`、`docs/tasks/`、`docs/agent-guides/`、C 组 README。 |
| 成员 1 | C1 + C2 后端：培养方案、学分进展、课程搜索、课程详情、可选课程列表。 | `curriculum.*`、`course-search.*`、`course-selection.types.ts`、`course-selection.schemas.ts`。 |
| 成员 2 | C3 后端：选课/退选核心事务。 | `enrollment.controller.ts`、`enrollment.service.ts`、相关 schema/types。 |
| 成员 3 | C4 + C5 后端：选课结果、课表、选课阶段、手动加课、教师名单导出。 | `enrollment-results.*`、`selection-period.*`、`roster.*`、`timetable.*`。 |
| 成员 4 | 学生端前端：培养方案、课程搜索、选课、结果、课表页面。 | `StudentCourseSelectionPage.tsx`、`StudentCurriculumPage.tsx`、`StudentTimetablePage.tsx`、学生端 components/hooks/api。 |
| 成员 5 | 教师/教务端前端 + AI 面板；C6 后端接口契约和兜底模板由成员 5 在单独 AI 后端任务中承接，完整模型算法或外部 AI 服务接入需负责人另行确认。 | `TeacherRosterPage.tsx`、`AdminSelectionPeriodPage.tsx`、`AdminManualEnrollmentPage.tsx`、`CourseSelectionAiPage.tsx`、`AiAdvisorPanel.tsx`、`ai-advisor.*`。 |

若组员数量或能力分布变化，优先保证 C3 选课事务和 C5 阶段管理有人负责，因为这两部分最容易影响数据一致性。

## 5. 阶段计划

### M0：文档和框架

交付内容：

```text
1. C 组 SRS 导入 docs/srs/C-smart-course-selection-srs.md。
2. 生成模块设计、分工和 agent 指南。
3. 维护 docs/apis/C-smart-course-selection.md。
4. 搭建 backend/src/modules/course-selection/ 和 frontend/src/modules/course-selection/ 骨架。
5. 复杂业务保留可分配 TODO。
```

验收标准：

```text
1. 项目能启动。
2. TypeScript 不出现明显语法错误。
3. 路由和页面入口存在。
4. README 说明已实现内容和未实现 TODO。
```

### M1：学生端 MVP

交付内容：

```text
1. 查询当前学生培养方案。
2. 搜索课程和查看课程详情。
3. 查询可选课程。
4. 提交选课。
5. 退选课程。
6. 查询本人选课结果。
7. 查看本人课表。
```

验收标准：

```text
1. 学生端从登录态识别当前学生。
2. 选课和退选由后端校验。
3. 容量、重复选课、时间冲突和阶段关闭场景能返回明确错误。
4. 前端能显示成功和失败原因。
```

### M2：教师与教务功能

交付内容：

```text
1. 教师查看本人课程学生名单。
2. 教师导出 Excel。
3. 教务管理 SelectionPeriod。
4. 教务手动加课。
```

验收标准：

```text
1. 教师不能导出非本人课程。
2. 普通学生不能访问教务接口。
3. 手动加课记录原因。
4. 手动加课仍默认检查容量、冲突、重复和学分限制。
```

### M3：AI 与并发强化

交付内容：

```text
1. AI 推荐课程。
2. AI 解释冲突和学分影响。
3. 连接数控制预留或实现。
4. 长时间无操作强制退出预留或实现。
5. 200 在线用户场景的测试说明。
```

验收标准：

```text
1. AI 不直接写入 Enrollment。
2. AI 不绕过硬性规则。
3. AI 服务失败不影响普通选课流程。
4. 并发选同一课程不会超容量。
```

## 6. 各子模块任务细化

### C1 培养方案与学分进展

职责：

```text
1. 根据当前学生专业和年级匹配 Curriculum。
2. 展示 CurriculumCourse 中的课程类别和建议修读学期。
3. 统计当前学生已选课程学分进度。
4. 给 C6 AI 提供培养方案和学分结构输入。
```

不得做：

```text
1. 不新增 StudentPlan 或类似个性化培养方案业务表。
2. 不维护 Course、Major、Student 的副本。
```

### C2 课程搜索与课程详情

职责：

```text
1. 按课程名称、课程代码、教师、学期、课程类型搜索 CourseOffering。
2. 展示课程详情、容量、已选人数、教师、时间地点和先修要求。
3. 标识可选/不可选原因。
4. 为 C3 选课入口提供 CourseOffering ID。
```

不得做：

```text
1. 不直接修改课程主数据。
2. 不在前端伪造容量、状态或教师信息。
```

### C3 选课/退选核心流程

职责：

```text
1. 实现 POST 选课和 PATCH 退选对应业务。
2. 检查 SelectionPeriod、CourseOffering 状态、容量、重复选课、时间冲突、最大学分和先修课。
3. 保证 Enrollment 与 CourseOffering.enrolled_count 事务一致。
4. 给前端返回明确错误码和错误原因。
```

这是 C 组最关键模块。任何“前端已经校验，所以后端省略校验”的实现都不得合并。

### C4 结果、课表与名单导出

职责：

```text
1. 学生查看本人选课结果。
2. 学生查看个人课表。
3. 教师查看本人课程学生名单。
4. 教师导出 Excel。
```

文件边界：

```text
1. /enrollments/me 由 C4 的 enrollment-results.controller.ts / enrollment-results.service.ts 承载。
2. C3 的 enrollment.controller.ts / enrollment.service.ts 仅承载 POST 选课与 PATCH 退选事务。
```

权限要求：

```text
1. 学生只能查本人。
2. 教师只能查本人任课课程。
3. 名单查询与导出当前仅开放给任课教师；如需 academic_admin 例外，必须先同步更新 API 文档、权限映射和审计要求。
```

### C5 选课管理与并发控制

职责：

```text
1. 管理初选、补退选、调整阶段。
2. 设置开始时间、结束时间、启用状态和最大学分。
3. 支持教务手动加课。
4. 预留或实现连接数控制和长时间无操作强制退出。
```

注意：

```text
SelectionPeriod 判断必须以服务端时间为准，不能依赖客户端时间。
```

### C6 AI 辅助选课

职责：

```text
1. 基于培养方案、已选课程、可选课程、课程容量和课表安排生成建议。
2. 解释推荐理由、冲突风险和学分影响。
3. AI 不可用时返回降级提示，普通选课流程仍可用。
```

不得做：

```text
1. AI 不得直接创建 Enrollment。
2. AI 不得绕过容量、时间冲突、选课阶段、先修课和权限规则。
```

## 7. PR 合并规则

每个功能分支合并到 `dev/C` 前，PR 描述必须包含：

```text
1. 修改文件清单。
2. 对应子模块编号，例如 C3。
3. 对应 SRS 需求编号，例如 FR-C-05。
4. 已完成内容。
5. 未完成 TODO。
6. 手动测试步骤。
7. 是否修改了非 C 组文件。
8. 是否涉及数据库 schema。
```

原则上禁止：

```text
1. 直接向 main 或 develop 推送 C 组代码。
2. 在未说明的情况下修改 A/B/D/E/F 组业务逻辑。
3. 在 feature 分支中自行新增业务表。
4. 合并没有明确 TODO、没有测试说明、没有权限说明的代码。
```

## 8. 推荐提交顺序

```text
1. docs(C): add course selection design and agent guidelines
2. docs(C): add course selection api contract
3. chore(C): scaffold course-selection backend and frontend modules
4. feat(C1,C2): add curriculum and course search queries
5. feat(C3): add enrollment and drop transaction
6. feat(C4): add timetable and teacher roster export
7. feat(C5): add selection period admin and manual enrollment
8. feat(C6): add AI advisor scaffold and recommendation explanation
9. test(C): add manual test cases and concurrency notes
```

## 9. 负责人最终联调清单

```text
1. docker compose up -d 后服务能启动。
2. 前端学生端能进入 C 组选课页面。
3. 后端 /api/v1/course-selection 路由已挂载。
4. 学生不能操作他人选课记录。
5. 教师不能导出非本人课程名单。
6. 选课容量不会超卖。
7. 退选后人数和状态一致。
8. 选课阶段关闭时无法选课。
9. AI 推荐不能直接改变选课结果。
10. README 和 TODO 能指导后续维护。
```
