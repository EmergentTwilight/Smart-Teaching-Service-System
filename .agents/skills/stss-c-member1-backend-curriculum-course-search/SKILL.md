---
name: stss-c-member1-backend-curriculum-course-search
description: STSS C 组成员 1 专用 skill。负责 C1+C2 后端：培养方案、学分进展、课程搜索、课程详情、可选课程列表。Codex 只能在该成员责任范围内编码，不得实现 C3 选课事务、C4/C5 管理导出、C6 AI 或前端页面完整业务。
---

# STSS C 组成员 1 Skill：C1 + C2 后端

本 skill 用于约束成员 1 的 Codex 任务。成员 1 负责 **C1 培养方案与学分进展** 和 **C2 课程搜索与课程详情** 的后端开发。
使用本 skill 时，Codex 只能完成成员 1 责任范围内的后端代码、类型、schema、TODO 和必要文档说明，不得越界完成其他成员负责的功能。

## 1. 必读文档

执行任务前必须对照：

1. `docs/srs/C-smart-course-selection-srs.md`
2. `docs/apis/C-smart-course-selection.md`
3. `docs/modules/course-selection-design.md`
4. `docs/tasks/C-work-breakdown.md`
5. `docs/agent-guides/C-coding-agent-guidelines.md`
6. `docs/database-design.md`
7. `docs/project-requirements.md`
8. `docs/development-specifications.md`
9. `AGENTS.md`
10. `README.md`

如代码和文档冲突，应报告冲突，并优先按 SRS、API 文档、数据库设计和分工文档修正。

## 2. 成员 1 责任范围

成员 1 主要负责：

```text
C1 培养方案与学分进展
C2 课程搜索与课程详情
```

允许重点修改：

```text
backend/src/modules/course-selection/curriculum.controller.ts
backend/src/modules/course-selection/curriculum.service.ts
backend/src/modules/course-selection/course-search.controller.ts
backend/src/modules/course-selection/course-search.service.ts
backend/src/modules/course-selection/course-selection.schemas.ts
backend/src/modules/course-selection/course-selection.types.ts
backend/src/modules/course-selection/README.md
docs/apis/C-smart-course-selection.md（仅限 C1/C2 接口必要说明）
```

必要时可以读取，但不应主动修改：

```text
backend/src/modules/course-selection/course-selection.routes.ts
backend/src/modules/course-selection/enrollment.service.ts
backend/src/modules/course-selection/timetable.service.ts
backend/src/modules/course-selection/roster.service.ts
backend/src/modules/course-selection/selection-period.service.ts
backend/src/modules/course-selection/ai-advisor.service.ts
frontend/src/modules/course-selection/**
```

## 3. 具体任务

成员 1 可以实现或完善：

```text
1. 当前学生培养方案查询。
2. 当前学生培养方案课程列表。
3. 专业、年级与 Curriculum 的匹配逻辑。
4. CurriculumCourse 中课程类别、建议修读学期、课程学分展示。
5. 当前学生已选课程学分进展查询。
6. 按课程名称、课程代码、教师、学期、课程类型搜索 CourseOffering。
7. 课程开设详情查询。
8. 课程容量、已选人数、教师、时间地点、先修课程的只读展示。
9. 可选/不可选原因的后端字段骨架。
10. 为 C3 选课提供 CourseOffering ID。
```

## 4. 禁止越界

成员 1 不得实现：

```text
1. C3 选课/退选事务。
2. Enrollment 创建、退选、容量扣减和 enrolled_count 原子更新。
3. 完整时间冲突校验。
4. C4 课表、教师名单、Excel 导出。
5. C5 SelectionPeriod 管理、手动加课、限流、强退。
6. C6 AI 推荐和解释逻辑。
7. 学生端、教师端、教务端完整前端页面。
8. A/B/D/E/F 组任何业务逻辑。
9. 新增数据库业务表。
10. 修改 Prisma schema，除非负责人明确授权。
```

如果发现当前功能需要依赖其他成员模块，应写 TODO 或接口约定，不得直接替其他成员完成。

## 5. 数据库与模型约束

成员 1 可以使用或读取：

```text
Student
Course
CourseOffering
Teacher
Schedule
Curriculum
CurriculumCourse
CoursePrerequisite
Enrollment（只读，用于学分进展或已选状态）
Semester
```

不得新增：

```text
StudentCoursePlan
AIRecommendation
CourseSelectionQueue
ManualEnrollmentRequest
CourseSelectionApplication
```

培养方案规划不得新建个性化 StudentPlan 表。若需要表达“学生选课计划”，应基于 `Curriculum`、`CurriculumCourse` 和当前 `Enrollment` 进行只读计算或 TODO 标注。

## 6. API 契约要求

必须对齐 `docs/apis/C-smart-course-selection.md`。

成员 1 相关接口主要包括：

```text
GET /api/v1/course-selection/curriculum/me
GET /api/v1/course-selection/curriculum/me/progress
GET /api/v1/course-selection/courses
GET /api/v1/course-selection/offerings
GET /api/v1/course-selection/offerings/available
GET /api/v1/course-selection/offerings/:id
```

对外字段遵循 API 文档，以 snake_case 为主。
内部 service 可以使用 camelCase。schema/controller 层负责转换。

常见字段：

```text
semester_id
course_type
teacher_id
page_size
course_offering_id
```

## 7. 权限边界

学生接口：

```text
1. 必须登录。
2. 当前学生身份必须来自认证上下文。
3. 不得信任前端传入 student_id 或 studentId 查询他人培养方案。
```

课程详情接口：

```text
1. 可按 API 文档允许学生、教师、教务只读查看。
2. 不得返回学生名单等 roster 敏感信息。
```

成员 1 不得为了课程详情而开放教师名单或 Enrollment 敏感字段。

## 8. TODO 规则

如果涉及其他成员工作，必须写 TODO。

示例：

```ts
// TODO(C3, FR-C-xx, NFR-C-xx):
// 本接口只返回可选/不可选原因的候选字段。
// 完整容量事务、重复选课、Schedule 冲突和 max_credits 校验由成员 2 在 enrollment.service.ts 中实现。
```

成员 1 的 TODO 示例：

```ts
// TODO(C1, FR-C-xx):
// 根据当前学生专业和年级匹配 Curriculum，并返回课程类别、建议修读学期和学分要求。
// 不新增 StudentPlan，不维护 Course/Student 主数据副本。
```

## 9. Docker 校验

必须使用 `$stss-docker-checks`，所有命令通过：

```bash
./scripts/codex-docker-run.sh '<command>'
```

后端标准校验：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

不得在宿主机直接运行 pnpm、npm、node、tsc、prisma。

## 10. 输出要求

完成任务后必须输出：

```text
1. 修改文件清单。
2. 每个文件的作用。
3. 已实现的功能。
4. 本次是否只涉及成员 1 责任范围。
5. 是否触及 C3/C4/C5/C6、前端或非 C 组文件，如触及必须说明原因。
6. 新增或保留的 TODO。
7. 是否修改 API 契约。
8. 是否修改权限边界。
9. 是否修改数据库或 Prisma schema。
10. 实际执行的 Docker wrapper 命令和结果。
11. 手动测试步骤。
12. 剩余风险、需要负责人确认的问题，以及需要其他成员处理的事项。
```
