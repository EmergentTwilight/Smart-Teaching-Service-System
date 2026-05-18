---
name: stss-c-member4-frontend-student
description: STSS C 组成员 4 专用 skill。负责学生端前端：培养方案、课程搜索、选课、结果、课表页面及学生端 components/hooks/api。Codex 不得实现后端业务事务、教师/教务页面、AI 管理面板或其他组模块。
---

# STSS C 组成员 4 Skill：学生端前端

本 skill 用于约束成员 4 的 Codex 任务。成员 4 负责 C 组 **学生端前端**：培养方案、课程搜索、选课、结果和课表页面。
Codex 必须只实现学生端前端范围内的页面、组件、hooks、api client 和类型，不得越界实现后端业务或教师/教务端功能。

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

## 2. 成员 4 责任范围

成员 4 主要负责：

```text
学生端前端：培养方案、课程搜索、选课、结果、课表页面
```

允许重点修改：

```text
frontend/src/modules/course-selection/pages/StudentCourseSelectionPage.tsx
frontend/src/modules/course-selection/pages/StudentCurriculumPage.tsx
frontend/src/modules/course-selection/pages/StudentTimetablePage.tsx
frontend/src/modules/course-selection/components/CourseOfferingTable.tsx
frontend/src/modules/course-selection/components/CourseDetailDrawer.tsx
frontend/src/modules/course-selection/components/CreditProgressCard.tsx
frontend/src/modules/course-selection/components/TimetableGrid.tsx
frontend/src/modules/course-selection/components/SelectionPeriodStatusTag.tsx
frontend/src/modules/course-selection/hooks/useAvailableOfferings.ts
frontend/src/modules/course-selection/hooks/useMyEnrollments.ts
frontend/src/modules/course-selection/hooks/useSelectionPeriod.ts
frontend/src/modules/course-selection/api/courses.ts
frontend/src/modules/course-selection/api/curriculum.ts
frontend/src/modules/course-selection/api/enrollments.ts
frontend/src/modules/course-selection/types/course.ts
frontend/src/modules/course-selection/types/curriculum.ts
frontend/src/modules/course-selection/types/enrollment.ts
frontend/src/modules/course-selection/types/period.ts
frontend/src/modules/course-selection/README.md（仅限学生端说明）
```

必要时可以读取：

```text
frontend/src/modules/course-selection/api/roster.ts
frontend/src/modules/course-selection/api/periods.ts
frontend/src/modules/course-selection/api/ai-advisor.ts
frontend/src/modules/course-selection/pages/TeacherRosterPage.tsx
frontend/src/modules/course-selection/pages/AdminSelectionPeriodPage.tsx
frontend/src/modules/course-selection/pages/AdminManualEnrollmentPage.tsx
frontend/src/modules/course-selection/pages/CourseSelectionAiPage.tsx
backend/src/modules/course-selection/**
```

但不得主动实现这些模块业务。

## 3. 具体任务

成员 4 可以实现或完善：

```text
1. 学生培养方案页面。
2. 学分进展卡片。
3. 课程搜索页面。
4. 可选课程表格。
5. 课程详情抽屉。
6. 学生提交选课按钮和退选按钮。
7. 学生选课结果页面。
8. 学生个人课表页面。
9. 学生端 API client。
10. 学生端 hooks。
11. 学生端加载、错误、空状态展示。
```

## 4. 禁止越界

成员 4 不得实现：

```text
1. 后端选课事务。
2. 后端容量、重复选课、时间冲突、先修课、max_credits 校验。
3. 教师名单页面和导出逻辑。
4. 教务阶段管理页面和手动加课页面。
5. AI 推荐页面和 AI 面板完整逻辑。
6. A/B/D/E/F 组前端或后端模块。
7. 修改 Prisma schema。
8. 新增数据库业务表。
```

如果学生端需要后端支持，应写 TODO 或提出 API 需求，不得直接改后端完成复杂业务。

## 5. 前端安全边界

学生端前端只能做预提示。最终结果以后端返回为准。

禁止：

```text
1. 前端本地直接把课程标为已选，不等待后端确认。
2. 前端自行决定选课成功。
3. 前端传 student_id/studentId 决定操作哪个学生。
4. 前端伪造容量、状态或教师信息。
5. 绕过 API 文档直接调用未定义接口。
```

允许：

```text
1. 显示后端返回的可选/不可选原因。
2. 做客户端友好提示，例如时间冲突提示。
3. 显示后端返回的错误码和错误原因。
4. 在提交后等待 POST /enrollments 或 PATCH /drop 的结果。
```

## 6. API 契约要求

必须对齐 `docs/apis/C-smart-course-selection.md`。

学生端主要调用：

```text
GET /api/v1/course-selection/curriculum/me
GET /api/v1/course-selection/curriculum/me/progress
GET /api/v1/course-selection/courses
GET /api/v1/course-selection/offerings
GET /api/v1/course-selection/offerings/available
GET /api/v1/course-selection/offerings/:id
GET /api/v1/course-selection/enrollments/me
POST /api/v1/course-selection/enrollments
PATCH /api/v1/course-selection/enrollments/:id/drop
GET /api/v1/course-selection/timetable/me
```

请求字段按文档使用 snake_case，例如：

```text
course_offering_id
semester_id
page_size
```

不要在学生端请求体中发送：

```text
student_id
studentId
```

## 7. 与后端成员协作

如果发现 API 不足，应写清需求：

```ts
// TODO(C2, FR-C-13, FR-C-15, NFR-C-07):
// 需要 GET /offerings/available 返回 unavailable_reason 字段，用于展示课程不可选原因。
// 前端暂时只展示后端已有字段，不自行计算最终可选状态。
```

不要为了前端展示而直接修改后端复杂逻辑。

## 8. Docker 校验

必须使用 `$stss-docker-checks`。

前端标准校验：

```bash
CODEX_DOCKER_SERVICE=web CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
```

如任务也影响共享类型或后端 API 类型，负责人或相关后端成员应另行运行：

```bash
CODEX_DOCKER_SERVICE=server CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

成员 4 不得在宿主机直接运行 pnpm、npm、node、tsc。

## 9. TODO 规则

未实现的后端依赖或跨成员功能必须写 TODO，不得直接实现。

示例：

```ts
// TODO(C3, FR-C-16, FR-C-22, NFR-C-04):
// 选课按钮等待后端 POST /enrollments 完整事务实现。
// 前端不得自行判断选课成功，只展示后端返回结果。
```

## 10. 输出要求

完成任务后必须输出：

```text
1. 修改文件清单。
2. 每个文件的作用。
3. 已实现的功能。
4. 是否只涉及学生端前端。
5. 是否修改 API client 或类型。
6. 是否修改后端，如修改必须说明原因。
7. 是否修改教师/教务/AI 前端或非 C 组文件，如修改必须说明原因。
8. 是否修改数据库或 Prisma schema。
9. 新增或保留的 TODO。
10. 实际执行的 Docker wrapper 命令和结果。
11. 手动测试步骤。
12. 剩余依赖后端或其他成员完成的事项，以及需要负责人确认的问题。
```
