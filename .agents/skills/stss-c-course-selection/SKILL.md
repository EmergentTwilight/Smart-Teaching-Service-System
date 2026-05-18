---
name: stss-c-course-selection
description: STSS C 组“智能选课 Smart Course Selection”模块开发、修复、评审、文档更新时使用。适用于 course-selection、智能选课、Enrollment、SelectionPeriod、CourseOffering、Curriculum、Roster、AI Advisor、FR-C、NFR-C、C 组 API、C 组前后端框架等任务。
---

# STSS C 组智能选课 Skill

本 skill 用于约束 C 组“智能选课 Smart Course Selection”模块的开发、修复、评审和文档更新。凡是任务涉及 C 组模块、C 组 API、C 组文档、选课流程、课程开设、培养方案、选课记录、教师名单、选课阶段、AI 辅助选课，都必须遵循本 skill。

## 1. 必读文档

处理 C 组任务前，必须优先阅读或对照以下文档：

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

如果这些文档之间出现冲突，优先级如下：

1. 项目要求和数据库设计
2. C 组 SRS
3. 共享 API 文档 和 C 组 API 文档
4. C 组模块设计文档
5. C 组分工文档
6. C 组 agent guidelines
7. 当前代码实现

如果代码与文档冲突，不能擅自以代码为准，应报告冲突，并优先按文档修正框架或契约。

## 2. C 组模块范围

C 组负责 Smart Course Selection，包括：

- 培养方案查看与学分进展；
- 课程搜索与课程详情；
- 可选课程列表；
- 学生选课与退选；
- 选课结果查询；
- 学生课表查询；
- 教师课程学生名单查询和导出；
- 教务管理人员选课阶段管理；
- 教务管理人员手动加课；
- 并发控制和长时间停留释放的接口/文档预留；
- AI 辅助选课建议和解释。

C 组不负责：

- 用户、角色、权限、学生、教师、课程主数据维护；
- 自动排课、教室资源管理；
- 论坛交流；
- 在线测试；
- 正式成绩录入和 GPA 计算。

这些内容分别属于 A/B/D/E/F 组。不要擅自修改其他组业务逻辑。

## 3. 允许修改范围

C 组任务通常只允许修改：

- `backend/src/modules/course-selection/**`
- `frontend/src/modules/course-selection/**`
- `docs/apis/shared.md`
- `docs/apis/C-smart-course-selection.md`
- `docs/srs/C-smart-course-selection-srs.md`
- `docs/modules/course-selection-design.md`
- `docs/tasks/C-work-breakdown.md`
- `docs/agent-guides/C-coding-agent-guidelines.md`
- 必要的后端路由挂载文件
- 必要的前端路由或菜单挂载文件

除非任务明确要求，否则不要修改：

- `backend/src/modules/info-management/**`
- `backend/src/modules/course-arrangement/**`
- `backend/src/modules/forum/**`
- `backend/src/modules/score-management/**`
- `frontend/src/modules/其他组模块/**`
- `prisma/schema.prisma`
- `package.json`
- `pnpm-lock.yaml`
- `docker-compose.yml`
- `.env` 或环境配置

## 4. 数据库和模型约束

C 组只能使用数据库设计中已有的核心对象或项目中已有等价模型：

- `Student`
- `Teacher`
- `Course`
- `CourseOffering`
- `Schedule`
- `Curriculum`
- `CurriculumCourse`
- `CoursePrerequisite`
- `Enrollment`
- `SelectionPeriod`
- `Semester`
- `SystemLog`

不得新增未在 SRS 或数据库设计中出现的业务表，例如：

- `StudentCoursePlan`
- `AIRecommendation`
- `CourseSelectionQueue`
- `ManualEnrollmentRequest`
- `CourseSelectionApplication`

如确实发现数据库设计无法支持 SRS，应先报告，不要直接修改 Prisma schema。

## 5. API 契约规则

C 组后端 API 统一挂载在：

```text
/api/v1/course-selection
````

必须对齐：

```text
docs/apis/shared.md
```

以及：

```text
docs/apis/C-smart-course-selection.md
```

对外 API 字段应遵循 API 文档约定。当前 C 组 API 文档以 snake_case 为主，例如：

* `course_offering_id`
* `student_id`
* `semester_id`
* `start_time`
* `end_time`
* `max_credits`
* `is_active`
* `page_size`

后端 service 内部可以使用 TypeScript/Prisma 风格 camelCase，例如：

* `courseOfferingId`
* `studentId`
* `semesterId`
* `startTime`
* `endTime`
* `maxCredits`
* `isActive`
* `pageSize`

controller/schema 层负责做 snake_case 到 camelCase 的转换。

不要让前端或外部调用方绕过 API 文档字段约定。

## 6. 权限边界

学生端接口：

* 必须登录；
* 只能读取和操作当前登录学生自己的数据；
* 不得信任前端传入的 `student_id` 或 `studentId`；
* 普通学生选课接口只能从认证上下文获取学生身份。

教师端接口：

* 必须登录；
* 教师名单查询和导出必须校验当前教师是否为该 `CourseOffering` 的任课教师；
* 任课教师可以查看本人课程名单；
* `academic_admin` 如需查看必须由 API 文档明确授权；
* `system_admin` 不默认替代教务权限，必须先获得明确的 `academic_admin` 授权；
* 非任课教师不得通过猜测 offeringId 查看或导出他人课程学生名单。

教务管理端接口：

* 必须登录；
* 必须使用项目已有角色机制限制为 `academic_admin`；
* `system_admin` 不默认替代教务权限，必须先获得明确的 `academic_admin` 授权；
* 手动加课接口可以接收 `student_id`，但只能出现在 `academic_admin` 接口；
* 手动加课必须要求 `reason`，且 reason 必须是非空字符串，用于 `SystemLog` 审计。

AI 接口：

* 必须登录；
* 只允许推荐、排序、解释；
* 不得直接创建、修改或删除 `Enrollment`；
* 不得绕过容量、时间冲突、选课阶段、先修课、最大学分和权限规则。

## 7. 选课事务规则

普通学生选课写操作必须以后端事务为准。前端只能预提示，不能决定选课成功。

`enrollment.service.ts` 中实现选课时必须检查：

1. 当前用户必须是学生；
2. 当前存在有效 `SelectionPeriod`；
3. 当前时间在 `start_time` 和 `end_time` 范围内；
4. `CourseOffering` 必须处于开放状态；
5. `enrolled_count < capacity`；
6. 同一学生不能重复选择同一 `CourseOffering`；
7. 新选课程不能与学生已选课程 `Schedule` 冲突；
8. 总学分不能超过当前阶段 `max_credits`；
9. 如存在 `CoursePrerequisite`，需要检查先修要求；
10. 创建 `Enrollment` 和更新 `CourseOffering.enrolled_count` 必须在同一事务中完成。

如果当前任务不是实现完整选课事务，只能保留清晰 TODO，不得写危险假实现。

危险假实现包括：

* `return { success: true }`
* 直接 `prisma.enrollment.create` 但不校验容量/冲突/阶段；
* 前端本地直接把课程标为已选；
* AI 推荐接口直接写 `Enrollment`。

## 8. C1-C6 分工映射

C1 培养方案与学分进展：

* `curriculum.controller.ts`
* `curriculum.service.ts`
* `StudentCurriculumPage.tsx`
* `CreditProgressCard.tsx`

C2 课程搜索与课程详情：

* `course-search.controller.ts`
* `course-search.service.ts`
* `CourseOfferingTable.tsx`
* `CourseDetailDrawer.tsx`

C3 选课/退选核心事务：

* `enrollment.controller.ts`
* `enrollment.service.ts`
* `useMyEnrollments.ts`

C4 选课结果、课表、名单导出：

* `timetable.controller.ts`
* `timetable.service.ts`
* `roster.controller.ts`
* `roster.service.ts`
* `StudentTimetablePage.tsx`
* `TeacherRosterPage.tsx`

C5 选课阶段管理与手动加课：

* `selection-period.controller.ts`
* `selection-period.service.ts`
* `AdminSelectionPeriodPage.tsx`
* `AdminManualEnrollmentPage.tsx`

C6 AI 辅助选课：

* `ai-advisor.controller.ts`
* `ai-advisor.service.ts`
* `CourseSelectionAiPage.tsx`
* `AiAdvisorPanel.tsx`

## 9. TODO 规范

复杂业务未实现时必须保留 TODO。TODO 必须具体、可分工、可追踪。

格式：

```ts
// TODO(C3, FR-C-xx, NFR-C-xx):
// 具体说明要实现什么、依赖哪些模型、需要哪些校验、禁止绕过哪些规则。
```

不合格 TODO：

```ts
// TODO
// TODO: implement
// TODO: finish later
```

合格 TODO 示例：

```ts
// TODO(C3, FR-C-05, NFR-C-04):
// 实现学生选课事务：
// 1. 校验当前用户必须是 student；
// 2. 校验有效 SelectionPeriod；
// 3. 校验 CourseOffering 状态和容量；
// 4. 校验重复选课和 Schedule 冲突；
// 5. 校验 max_credits 和 CoursePrerequisite；
// 6. 在同一事务内创建 Enrollment 并更新 CourseOffering.enrolled_count。
```

## 10. Docker 校验规则

凡是需要运行 typecheck、build、test、lint、Prisma 命令，必须使用 `$stss-docker-checks`，并通过：

```bash
./scripts/codex-docker-run.sh '<command>'
```

不要在宿主机直接运行：

* `pnpm`
* `npm`
* `node`
* `npx`
* `tsc`
* `prisma`
* `jest`
* `vitest`

后端标准 typecheck 命令：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

前端标准 typecheck 命令：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
```

后端出现：

```text
Cannot find module '@stss/shared' or its corresponding type declarations
```

时，不要立即修改业务代码，应先构建 shared。

出现 Prisma Client 类型缺失时，应先运行 Prisma generate，而不是立即修改业务代码。

## 11. 修复任务流程

处理 C 组修复任务时，按以下顺序：

1. 读取相关文档；
2. 确认任务属于 C1-C6 哪个子模块；
3. 检查 API 文档和代码是否一致；
4. 定位最小修改范围；
5. 修改 C 组文件；
6. 保留必要 TODO；
7. 使用 `$stss-docker-checks` 运行 Docker 校验；
8. 简单 review 之后提交（注意 README.md 中的提交规范）
8. 输出修改说明、校验命令、校验结果和剩余风险。

不要在一次小修复中顺手实现多个 TODO。

## 12. Review 任务流程

Review C 组提交时，重点检查：

1. 是否污染其他组代码；
2. 是否新增数据库业务表；
3. 是否破坏 API 文档；
4. 是否让学生端信任前端传入 studentId；
5. 是否缺少教师 roster ownership 校验；
6. 是否让 AI 直接写 Enrollment；
7. 是否缺少手动加课 reason；
8. 是否破坏 timezone offset 支持；
9. 是否存在危险假实现；
10. 是否 TODO 不可分工；
11. 是否通过 Docker wrapper 运行了标准校验。

## 13. 提交要求

每次修改完成后简单 review 后，进入提交阶段。

参考 README.md 编写 commit message 后提交。

## 14. 输出要求

完成任务后输出：

1. 修改文件清单；
2. 本次任务对应 C1-C6 哪些模块；
3. 是否修改 API 契约；
4. 是否修改权限边界；
5. 是否修改数据库或 Prisma schema；
6. 是否修改其他组代码；
7. 实际执行的 Docker wrapper 命令；
8. 后端 typecheck 结果；
9. 前端 typecheck 结果；
10. 剩余 TODO 和风险。
