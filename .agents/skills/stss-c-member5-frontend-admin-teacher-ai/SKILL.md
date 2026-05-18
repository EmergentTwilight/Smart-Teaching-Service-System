---
name: stss-c-member5-frontend-admin-teacher-ai
description: STSS C 组成员 5 专用 skill。负责教师/教务端前端与 AI 面板：教师名单、名单导出、阶段管理、手动加课、AI 推荐展示。Codex 不得实现学生端完整页面、后端业务事务、AI 后端算法或其他组模块。
---

# STSS C 组成员 5 Skill：教师/教务端前端 + AI 面板

本 skill 用于约束成员 5 的 Codex 任务。成员 5 负责 C 组 **教师端、教务端前端，以及 AI 辅助选课展示面板**。
Codex 必须只在成员 5 的前端范围内工作，不得越界实现后端业务、学生端完整页面或 AI 后端算法。

## 1. 必读文档

执行任务前必须对照：

1. `docs/srs/C-smart-course-selection-srs.md`
2. `docs/apis/shared.md`
3. `docs/apis/C-smart-course-selection.md`
4. `docs/modules/course-selection-design.md`
5. `docs/tasks/C-work-breakdown.md`
6. `docs/agent-guides/C-coding-agent-guidelines.md`
7. `docs/database-design.md`
8. `docs/project-requirements.md`
9. `docs/development-specifications.md`
10. `AGENTS.md`
11. `README.md`

冲突处理优先级：

```text
项目要求/数据库设计 > C 组 SRS > shared/C 组 API 文档 > 模块设计 > 分工文档 > agent guidelines > 当前代码
```

## 2. 成员 5 责任范围

成员 5 主要负责：

```text
教师/教务端前端 + AI 面板
```

允许重点修改：

```text
frontend/src/modules/course-selection/pages/TeacherRosterPage.tsx
frontend/src/modules/course-selection/pages/AdminSelectionPeriodPage.tsx
frontend/src/modules/course-selection/pages/AdminManualEnrollmentPage.tsx
frontend/src/modules/course-selection/pages/CourseSelectionAiPage.tsx
frontend/src/modules/course-selection/components/AiAdvisorPanel.tsx
frontend/src/modules/course-selection/components/SelectionPeriodStatusTag.tsx
frontend/src/modules/course-selection/api/roster.ts
frontend/src/modules/course-selection/api/periods.ts
frontend/src/modules/course-selection/api/ai-advisor.ts
frontend/src/modules/course-selection/types/period.ts
frontend/src/modules/course-selection/types/ai.ts
frontend/src/modules/course-selection/types/enrollment.ts
frontend/src/modules/course-selection/README.md（仅限教师/教务/AI 前端说明）
```

必要时可以读取：

```text
frontend/src/modules/course-selection/pages/StudentCourseSelectionPage.tsx
frontend/src/modules/course-selection/api/courses.ts
frontend/src/modules/course-selection/api/enrollments.ts
backend/src/modules/course-selection/**
```

但不得主动实现这些模块业务。

## 3. 具体任务

成员 5 可以实现或完善：

```text
1. 教师课程学生名单页面。
2. 教师名单筛选、分页、状态展示。
3. 教师导出 Excel 的前端入口。
4. 教务 SelectionPeriod 管理页面。
5. 初选、补退选、调整阶段的表单和状态展示。
6. 教务手动加课页面。
7. 手动加课 reason 必填表单校验。
8. AI 推荐展示页面。
9. AI 推荐理由、冲突风险、学分影响说明展示。
10. AI 服务失败时的降级提示。
11. 教师/教务/AI 相关 API client 和类型。
```

## 4. 禁止越界

成员 5 不得实现：

```text
1. 学生端培养方案、课程搜索、选课、课表完整页面。
2. 后端 roster ownership 逻辑。
3. 后端 SelectionPeriod 业务逻辑。
4. 后端手动加课业务逻辑。
5. 后端 AI 推荐算法或模型接入。
6. C3 选课/退选事务。
7. A/B/D/E/F 组业务逻辑。
8. Prisma schema 或数据库业务表。
```

如果前端需要后端支持，应写 TODO 或 API 需求，不得直接改后端完成复杂业务。

## 5. 教师端前端边界

教师名单页面必须遵循：

```text
1. 只能调用文档定义的 roster API。
2. 不在前端绕过教师 ownership。
3. 不显示后端未授权返回的数据。
4. 导出按钮必须调用导出接口，不自行拼接敏感数据绕过后端。
5. 非任课教师被后端拒绝时，前端应展示权限错误。
```

成员 5 不得在前端实现“只要知道 offeringId 就能导出”的逻辑。

## 6. 教务端前端边界

教务阶段管理和手动加课必须遵循：

```text
1. 管理接口仅供 academic_admin 使用；系统管理员不可默认替代教务权限。
2. 手动加课表单必须要求 reason 非空。
3. 前端可以做表单预校验，但后端仍必须最终校验。
4. 前端不得伪造手动加课成功。
5. 前端不得绕过后端容量、冲突、重复、学分和阶段规则。
```

## 7. AI 面板边界

AI 面板只能展示推荐和解释。

AI 推荐和解释接口是学生端接口，仅限 `student` 当前登录上下文使用。成员 5 虽负责 AI 展示面板，但不得让教师端或教务端代替学生调用 AI 接口，也不得在 AI 请求中传入 `student_id` 或 `studentId`。

禁止：

```text
1. AI 面板直接创建 Enrollment。
2. AI 面板绕过普通选课按钮。
3. AI 结果直接改变课程已选状态。
4. AI 不可用时阻断普通选课流程。
5. 教师/教务页面代学生请求 AI 推荐或解释。
6. AI 请求体携带 student_id/studentId。
```

允许：

```text
1. 展示推荐课程。
2. 展示推荐理由。
3. 展示冲突风险。
4. 展示学分影响。
5. 提供“查看课程详情”或“转到选课”入口，但最终选课仍调用普通选课接口。
```

## 8. API 契约要求

必须对齐 `docs/apis/C-smart-course-selection.md`。

成员 5 主要调用：

```text
GET /api/v1/course-selection/teacher/offerings/:id/roster
GET /api/v1/course-selection/teacher/offerings/:id/roster/export
GET /api/v1/course-selection/admin/periods
POST /api/v1/course-selection/admin/periods
PATCH /api/v1/course-selection/admin/periods/:id
POST /api/v1/course-selection/admin/enrollments
POST /api/v1/course-selection/ai-advisor/recommend
POST /api/v1/course-selection/ai-advisor/explain
```

对外字段使用 snake_case：

```text
semester_id
phase
is_active
start_time
end_time
max_credits
student_id
course_offering_id
reason
keyword
page_size
```

AI 推荐和解释请求不得包含 `student_id`/`studentId`，学生身份只能由后端从当前登录上下文解析。

内部前端类型可以使用 camelCase，但 API client 应负责请求/响应映射，且必须与文档一致。

## 9. 与后端成员协作

若后端接口尚未实现，应写 TODO：

```ts
// TODO(C5, FR-C-33, FR-C-34, FR-C-37):
// AdminManualEnrollmentPage 依赖 POST /admin/enrollments。
// 前端只做 reason 非空预校验，最终容量/冲突/重复校验由后端完成。
```

AI 面板若依赖后端：

```ts
// TODO(C6, FR-C-38, FR-C-40, FR-C-41, NFR-C-10):
// 展示当前登录学生的 AI 推荐和解释。AI 不得直接写 Enrollment，最终选课仍走普通选课接口。
```

## 10. Docker 校验

必须使用 `$stss-docker-checks`。

前端标准校验：

```bash
CODEX_DOCKER_SERVICE=web CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
```

不得在宿主机直接运行 pnpm、npm、node、tsc。

## 11. TODO 规则

未实现的后端依赖必须写 TODO，不得直接补后端复杂业务。

示例：

```ts
// TODO(C5, FR-C-30, FR-C-31, FR-C-37):
// SelectionPeriod 保存接口应支持 semester_id、phase、start_time、end_time、max_credits、is_active。
// 当前页面只保持表单结构和 API 调用入口。
```

```ts
// TODO(C6, FR-C-38, FR-C-40, FR-C-41):
// AI 推荐仅用于展示当前登录学生的推荐理由和风险提示，不得直接创建 Enrollment。
```

## 12. 输出要求

完成任务后必须输出：

```text
1. 修改文件清单。
2. 每个文件的作用。
3. 已实现的功能。
4. 是否只涉及教师/教务/AI 前端。
5. 是否修改学生端页面，如修改必须说明原因。
6. 是否修改后端，如修改必须说明原因。
7. 是否修改 API client 或类型。
8. 是否修改权限边界。
9. 是否修改数据库或 Prisma schema。
10. 是否修改非 C 组文件。
11. 新增或保留的 TODO。
12. 实际执行的 Docker wrapper 命令和结果。
13. 手动测试步骤。
14. 剩余依赖后端或其他成员完成的事项，以及需要负责人确认的问题。
```
