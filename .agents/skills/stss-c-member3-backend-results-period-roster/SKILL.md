---
name: stss-c-member3-backend-results-period-roster
description: STSS C 组成员 3 专用 skill。负责 C4+C5 后端：选课结果、课表、教师名单、名单导出、SelectionPeriod 管理、手动加课、并发控制和强退预留。Codex 不得实现 C1/C2 查询、C3 普通选课事务、C6 AI 或前端完整页面。
---

# STSS C 组成员 3 Skill：C4 + C5 后端

本 skill 用于约束成员 3 的 Codex 任务。成员 3 负责 **C4 结果/课表/名单导出** 和 **C5 选课管理与并发控制** 的后端开发。
Codex 必须严格限制在成员 3 的后端范围内，不得越界完成 C1/C2/C3/C6 或前端完整业务。

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

## 2. 成员 3 责任范围

成员 3 主要负责：

```text
C4 结果、课表与名单导出
C5 选课管理与并发控制
```

允许重点修改：

```text
backend/src/modules/course-selection/timetable.controller.ts
backend/src/modules/course-selection/timetable.service.ts
backend/src/modules/course-selection/roster.controller.ts
backend/src/modules/course-selection/roster.service.ts
backend/src/modules/course-selection/selection-period.controller.ts
backend/src/modules/course-selection/selection-period.service.ts
backend/src/modules/course-selection/course-selection.schemas.ts
backend/src/modules/course-selection/course-selection.types.ts
backend/src/modules/course-selection/README.md（仅限 C4/C5 说明）
```

必要时可以读取：

```text
backend/src/modules/course-selection/enrollment.service.ts
backend/src/modules/course-selection/course-search.service.ts
backend/src/modules/course-selection/curriculum.service.ts
```

但不得实现 C1/C2/C3 业务。

## 3. C4 具体任务

成员 3 可以实现或完善：

```text
1. GET /api/v1/course-selection/enrollments/me，学生查看本人选课结果。
2. 学生查看个人课表。
3. 教师查看本人课程学生名单。
4. 教师导出本人课程学生名单。
5. roster 查询分页和 keyword 过滤。
6. timetable 查询 semester_id 和 format 参数。
7. 学生结果查询 semester_id/status/keyword 过滤。
```

## 4. C5 具体任务

成员 3 可以实现或完善：

```text
1. SelectionPeriod 列表查询。
2. SelectionPeriod 创建、修改、启用、关闭。
3. 初选、补退选、调整阶段管理。
4. 阶段时间 start_time/end_time、max_credits、is_active。
5. 教务手动加课接口。
6. 手动加课 reason 必填和 SystemLog 审计。
7. 手动加课事务内校验学生、课程开设存在且课程未取消、容量、重复选课、课表冲突和默认 max_credits，并同步 Enrollment 与 CourseOffering.enrolled_count。
8. 连接数控制和长时间无操作强制退出的后端预留或 TODO。
```

## 5. 禁止越界

成员 3 不得实现：

```text
1. C1 培养方案和学分进展完整逻辑。
2. C2 课程搜索和可选课程完整逻辑。
3. C3 普通学生选课/退选核心事务。
4. C6 AI 推荐和解释逻辑。
5. 学生端、教师端、教务端完整前端页面。
6. A/B/D/E/F 组业务逻辑。
```

手动加课属于 C API 语义角色 `academic_admin` 的特殊操作，不等同于普通学生选课。
成员 3 实现手动加课时可以调用或复用 C3 的校验能力，但不得重写 C3 普通选课事务。手动加课可不要求当前处于学生选课开放时间段，但仍必须在事务内校验学生、课程开设存在且课程未取消、容量、重复选课、课表冲突和默认 max_credits，并写入 `SystemLog`。培养方案适配和先修课是否允许例外必须按 API TODO-C-21 或负责人确认口径处理。

## 6. 权限边界

学生结果和课表：

```text
1. 学生只能查询本人选课结果和本人课表。
2. 学生身份来自认证上下文。
3. 不得信任前端传入 student_id/studentId。
```

教师名单：

```text
1. 教师只能查看和导出本人任课 CourseOffering 的名单。
2. 必须校验 CourseOffering.teacher_id 与当前教师身份。
3. `academic_admin` 是 API 语义角色；当前代码层可由 `admin`/`super_admin` 入口保护，但服务层应收紧到 `Admin.adminType = ACADEMIC` 或等价授权。
4. 非任课教师不得通过猜测 offeringId 访问名单。
```

教务管理：

```text
1. SelectionPeriod 和手动加课接口当前可用 `admin`/`super_admin` 作为入口角色，但必须在服务层 TODO 或实现中映射到 `academic_admin` 语义权限。
2. 手动加课必须 reason 非空。
3. 手动加课不得开放给 student/teacher。
4. `academic_admin` 应映射为 `Admin.adminType = ACADEMIC` 或等价教务授权，不得默认把系统管理员等同为教务管理员。
```

## 7. API 契约要求

成员 3 相关接口主要包括：

```text
GET /api/v1/course-selection/enrollments/me
GET /api/v1/course-selection/timetable/me
GET /api/v1/course-selection/teacher/offerings/:id/roster
GET /api/v1/course-selection/teacher/offerings/:id/roster/export
GET /api/v1/course-selection/admin/periods
POST /api/v1/course-selection/admin/periods
PATCH /api/v1/course-selection/admin/periods/:id
POST /api/v1/course-selection/admin/enrollments
```

对外字段遵循 API 文档：

```text
semester_id
format
keyword
phase
is_active
start_time
end_time
max_credits
student_id
course_offering_id
reason
page_size
```

内部 service 可以使用 camelCase。

时间字段必须支持带时区偏移的 ISO 字符串，例如：

```text
2026-05-13T08:00:00+08:00
```

## 8. 数据库与模型约束

成员 3 可以使用：

```text
Student
Teacher
Course
CourseOffering
Schedule
Enrollment
SelectionPeriod
Semester
SystemLog
```

可以只读使用：

```text
Curriculum
CurriculumCourse
CoursePrerequisite
```

不得新增业务表，例如：

```text
ManualEnrollmentRequest
CourseSelectionQueue
```

关键教务操作必须使用项目已有 `SystemLog` 或等价日志机制。不得为手动加课新增 `ManualEnrollmentRequest` 等业务表。

## 9. TODO 规则

连接数控制、长时间无操作强制退出、Excel 导出如果未完整实现，必须写清 TODO。

示例：

```ts
// TODO(C5, FR-C-xx, NFR-C-xx):
// 实现选课系统连接数控制和长时间无操作强制退出。
// 需要与会话/Redis/网关策略确认，不在当前 service 中写危险假实现。
```

```ts
// TODO(C4, FR-C-xx):
// 实现教师名单 Excel 导出。
// 必须复用 roster ownership 校验，确保教师只能导出本人任课课程。
```

```ts
// TODO(C5, FR-C-33, FR-C-34, FR-C-37):
// 实现教务手动加课事务：校验 admin/super_admin 入口角色与 Admin.adminType=ACADEMIC 等价教务授权、reason、学生、课程开设存在且课程未取消、
// 容量、重复选课、课表冲突和默认 max_credits。
// 创建或恢复 Enrollment、更新 CourseOffering.enrolled_count、写入 SystemLog 必须在同一事务内完成。
// 培养方案适配和先修课是否允许例外必须按 TODO-C-21 或负责人确认口径处理。
```

## 10. Docker 校验

必须使用 `$stss-docker-checks`。

后端标准校验：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

不得在宿主机直接运行 pnpm、npm、node、tsc、prisma。

## 11. 输出要求

完成任务后必须输出：

```text
1. 修改文件清单。
2. 每个文件的作用。
3. 已实现的功能。
4. 是否只涉及 C4/C5 后端。
5. 是否修改 roster ownership 权限。
6. 是否修改 academic_admin 语义权限或 admin/super_admin 到 Admin.adminType=ACADEMIC 的映射。
7. 是否修改手动加课 reason、事务校验或 SystemLog 审计规则。
8. 是否修改 API 契约。
9. 是否修改数据库或 Prisma schema。
10. 是否涉及 C1/C2/C3/C6、前端或非 C 组文件，如涉及说明原因。
11. 实际执行的 Docker wrapper 命令和结果。
12. 手动测试步骤。
13. 剩余 TODO、风险和需要负责人确认的问题。
```
