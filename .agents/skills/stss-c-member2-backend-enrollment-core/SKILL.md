---
name: stss-c-member2-backend-enrollment-core
description: STSS C 组成员 2 专用 skill。负责 C3 后端：学生选课/退选核心事务、容量控制、重复选课、时间冲突、最大学分、先修课检查。Codex 不得实现培养方案查询、课程搜索、名单导出、阶段管理、AI 或前端页面业务。
---

# STSS C 组成员 2 Skill：C3 选课/退选核心事务

本 skill 用于约束成员 2 的 Codex 任务。成员 2 负责 **C3 选课/退选核心流程** 的后端实现。
这是 C 组最关键的数据一致性模块。Codex 必须严格限制在 C3 范围内工作，不得越界完成其他成员模块。

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

## 2. 成员 2 责任范围

成员 2 主要负责：

```text
C3 选课/退选核心流程
```

允许重点修改：

```text
backend/src/modules/course-selection/enrollment.controller.ts
backend/src/modules/course-selection/enrollment.service.ts
backend/src/modules/course-selection/course-selection.schemas.ts
backend/src/modules/course-selection/course-selection.types.ts
backend/src/modules/course-selection/README.md（仅限 C3 说明）
```

必要时可以读取：

```text
backend/src/modules/course-selection/course-search.service.ts
backend/src/modules/course-selection/curriculum.service.ts
backend/src/modules/course-selection/selection-period.service.ts
backend/src/modules/course-selection/timetable.service.ts
backend/src/modules/course-selection/roster.service.ts
backend/src/modules/course-selection/ai-advisor.service.ts
```

但不得主动实现这些模块的业务。

## 3. 具体任务

成员 2 可以实现或完善：

```text
1. POST /api/v1/course-selection/enrollments。
2. PATCH /api/v1/course-selection/enrollments/:id/drop。
3. 为 C4 的 GET /api/v1/course-selection/enrollments/me 提供可复用 enrollment 读取能力时，只维护字段兼容和本人权限，不扩展 C4 结果展示职责。
4. SelectionPeriod 有效性校验。
5. CourseOffering 开放状态校验。
6. Course.status = active 校验。
7. 容量校验。
8. 重复选课校验。
9. Schedule 时间冲突校验。
10. 当前阶段 max_credits 校验。
11. 培养方案适配性校验。
12. CoursePrerequisite 先修课校验。
13. Enrollment 与 CourseOffering.enrolled_count 的事务一致性。
14. PostgreSQL 行锁、条件更新或等价并发安全策略。
15. 明确错误码和错误原因。
```

## 4. 禁止越界

成员 2 不得实现：

```text
1. C1 培养方案完整查询和学分进展页面。
2. C2 课程搜索和课程详情完整查询。
3. C4 课表展示、教师名单、Excel 导出。
4. C5 SelectionPeriod 管理、手动加课、连接数控制、强退。
5. C6 AI 推荐和解释逻辑。
6. 学生端、教师端、教务端完整前端页面。
7. A/B/D/E/F 组业务逻辑。
```

如果 C3 依赖 C1/C2/C4/C5 的数据，应只读取必要模型或调用已有接口，不得实现对方模块业务。

## 5. 选课事务硬规则

普通学生选课必须以后端事务为准。前端校验只能用于提示，不能决定选课成功。

`enrollment.service.ts` 中必须检查：

```text
1. 当前用户必须是学生。
2. 学生身份必须来自认证上下文，不得信任请求体中的 student_id/studentId。
3. 当前必须存在有效 SelectionPeriod。
4. 当前时间必须在 start_time 和 end_time 范围内。
5. CourseOffering.status 必须为 open。
6. Course.status 必须为 active。
7. enrolled_count < capacity。
8. 同一学生不能重复选择同一 CourseOffering。
9. 新选课程不能与学生已选课程 Schedule 冲突。
10. 总学分不能超过当前阶段 max_credits。
11. 必须校验课程符合学生培养方案适配性。
12. 如存在 CoursePrerequisite，必须检查先修要求。
13. 创建 Enrollment 和更新 CourseOffering.enrolled_count 必须在同一事务中完成。
14. 并发选课必须使用行锁、条件更新或等价策略，避免容量超卖和重复有效记录。
```

禁止危险实现：

```text
1. return { success: true }。
2. 直接 prisma.enrollment.create 但不校验容量/阶段/冲突。
3. 先创建 Enrollment 再异步更新 enrolled_count。
4. 只靠前端判断冲突。
5. 让 AI 或前端决定选课成功。
6. 只读 enrolled_count 后无锁写入，导致并发超卖。
```

## 6. 退选事务硬规则

`PATCH /enrollments/:id/drop` 必须以后端事务为准。前端只能提交退选请求和可选 reason，不能决定退选成功。

退选逻辑必须检查：

```text
1. 当前用户必须是学生。
2. 学生身份必须来自认证上下文，只能退选自己的 Enrollment。
3. 当前选课阶段必须允许退选，且以服务端时间判断。
4. 目标 Enrollment 必须存在且 status 为 enrolled。
5. 退选只能更新 status=dropped、dropped_at 和必要 reason，不得删除 Enrollment。
6. CourseOffering.enrolled_count 必须在同一事务内同步减少，并保证不小于 0。
7. 退选接口的幂等字段使用 client_request_id。
```

## 7. 数据库与模型约束

成员 2 可以使用：

```text
Student
Course
CourseOffering
Schedule
Enrollment
SelectionPeriod
CoursePrerequisite
Curriculum/CurriculumCourse（只读，用于学分或培养方案适配）
Semester
```

不得新增业务表。

如果需要唯一约束或索引，应先报告负责人，不要直接改 Prisma schema。

## 8. API 契约要求

成员 2 相关写接口主要包括：

```text
POST /api/v1/course-selection/enrollments
PATCH /api/v1/course-selection/enrollments/:id/drop
```

`GET /api/v1/course-selection/enrollments/me` 属于 C4 结果查询契约。若当前代码结构由 `enrollment.controller.ts` 或 `enrollment.service.ts` 承载该只读接口，成员 2 只能保持本人权限、字段和状态过滤与 API 文档兼容，不得把 C4 结果展示、课表或名单导出扩展为自己的职责。

请求体必须遵循 API 文档：

```text
POST /enrollments 使用 course_offering_id。
POST /enrollments 和 PATCH /drop 的幂等字段使用 client_request_id。
学生普通选课接口不得接收或信任 student_id。
```

内部 service 可以转换为：

```text
courseOfferingId
clientRequestId
```

## 9. 权限边界

```text
1. 学生只能选/退自己的课程。
2. 学生身份从 auth context 获取。
3. academic_admin 手动加课不属于普通学生选课接口，属于成员 3/C5 范围。
4. 教师不得调用学生选课写接口替学生选课。
```

## 10. TODO 规则

如果当前任务不是完整实现事务，必须保留精确 TODO：

```ts
// TODO(C3, FR-C-xx, NFR-C-04):
// 实现学生选课事务：检查 SelectionPeriod、CourseOffering.status=open、Course.status=active、容量、重复选课、
// Schedule 冲突、max_credits、培养方案适配性、CoursePrerequisite。
// Enrollment 创建和 CourseOffering.enrolled_count 更新必须在同一事务内完成，并使用行锁或条件更新防止并发超卖。
```

```ts
// TODO(C3, FR-C-14, FR-C-32, NFR-C-04):
// 实现退选事务：校验当前学生本人 Enrollment、阶段允许退选、status=enrolled。
// 只更新 dropped/dropped_at，不删除记录；CourseOffering.enrolled_count 必须在同一事务内减少且不小于 0。
```

不得把 C4/C5/C6 的任务写成自己要实现的 TODO，应标注给对应成员。

## 11. Docker 校验

必须使用 `$stss-docker-checks`。

后端标准校验：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

不得在宿主机直接运行 pnpm、npm、node、tsc、prisma。

## 12. 输出要求

完成任务后必须输出：

```text
1. 修改文件清单。
2. 每个文件的作用。
3. 已实现的功能。
4. 是否只涉及 C3。
5. 是否修改选课事务规则。
6. 是否修改 API 契约。
7. 是否修改权限边界。
8. 是否修改数据库或 Prisma schema。
9. 是否涉及 C1/C2/C4/C5/C6 或非 C 组文件，如涉及说明原因。
10. 实际执行的 Docker wrapper 命令和结果。
11. 手动测试步骤。
12. 未完成 TODO、剩余风险，以及需要负责人/其他成员确认的事项。
```
