# C 组成员 2 工作指导：C3 选课/退选核心事务

> 适用成员：成员 2
> 对应 skill：`$stss-c-member2-backend-enrollment-core`
> 负责范围：C3 选课/退选核心后端事务
> 工作原则：选课成功只能由后端事务决定；不实现 C1/C2 查询、C4 结果导出、C5 管理、C6 AI 或前端页面。

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

冲突优先级：

```text
项目要求/数据库设计 > C 组 SRS > shared/C API > 模块设计 > 分工文档 > agent guidelines > 当前代码
```

C3 是 C 组数据一致性核心。当前代码若仍为 TODO/501，不能用“前端已判断”或“先写成功响应”替代事务实现。

## 2. Git 操作建议

### 2.1 分支管理

从 `dev/C` 创建成员 2 功能分支，沿用其他组 `feat/A-...`、`fix/B-...` 的短横线命名风格：

```bash
git checkout dev/C
git pull origin dev/C
git checkout -b feat/C-enrollment-core-<MMDD>
```

推荐分支名：

```text
feat/C-enrollment-core-<MMDD>
feat/C-drop-transaction-<MMDD>
fix/C-enrollment-concurrency-<MMDD>
test/C-enrollment-capacity-<MMDD>
```

C3 是高风险事务模块，建议选课事务、退选事务、并发修复分开提交或分 PR。不要从 `main` 或 `develop` 开发 C3；不要把未 review 的事务代码直接合入 `develop`。

### 2.2 提交规范

Commit message 遵循 `README.md`：

```text
<type>(<scope>): <subject>
```

推荐使用 `C` 作为 scope，并在 subject 写明 C3；若负责人允许子模块 scope，可使用 `C3`。

```text
feat(C): add enrollment transaction checks
feat(C): add drop transaction handling
fix(C): prevent enrollment capacity oversell
test(C): add enrollment concurrency cases
```

不要把 C3 事务实现和 C4 结果查询、C5 手动加课、前端按钮改动混在同一个 commit 中。

### 2.3 PR 建议

优先从成员功能分支向 `dev/C` 开 PR。若组内暂时不强制 PR，也应在合并说明中保留同等信息。

PR 描述必须包含：

```text
1. 对应子模块：C3。
2. 覆盖需求：FR-C-14~FR-C-23。
3. 事务规则说明：阶段、容量、重复、冲突、学分、先修、并发策略。
4. 修改文件清单。
5. Docker wrapper 校验命令和结果。
6. 手动测试和并发测试步骤。
7. 是否修改 API 契约、权限边界、数据库/Prisma schema、非 C 组文件。
8. 仍需负责人确认的问题，例如退选阶段规则或先修数据来源。
```

PR 合并前先同步 `dev/C`，重点检查 `enrollment.service.ts`、schema/type 冲突。涉及事务和并发的 PR 必须请求负责人 review。

## 3. 需求与接口范围

成员 2 覆盖：

| 子模块 | 需求编号 | 主要能力 |
|---|---|---|
| C3 | `FR-C-14` 至 `FR-C-23` | 选课、退选、容量控制、重复选课、课表冲突、最大学分、先修课、事务一致性。 |

主要接口：

```text
POST /api/v1/course-selection/enrollments
PATCH /api/v1/course-selection/enrollments/:id/drop
```

不负责：

```text
GET /api/v1/course-selection/enrollments/me
GET /api/v1/course-selection/timetable/me
```

这两个接口属于 C4，由 `enrollment-results.*` 和 `timetable.*` 承载。

## 4. 允许修改的文件

优先修改：

```text
backend/src/modules/course-selection/enrollment.controller.ts
backend/src/modules/course-selection/enrollment.service.ts
backend/src/modules/course-selection/course-selection.schemas.ts
backend/src/modules/course-selection/course-selection.types.ts
backend/src/modules/course-selection/README.md
```

必要时只读：

```text
backend/src/modules/course-selection/course-search.service.ts
backend/src/modules/course-selection/curriculum.service.ts
backend/src/modules/course-selection/selection-period.service.ts
backend/src/modules/course-selection/timetable.service.ts
backend/src/modules/course-selection/roster.service.ts
backend/src/modules/course-selection/ai-advisor.service.ts
```

不要主动修改前端页面、C1/C2/C4/C5/C6 service 或其他组模块。

## 5. 负责人已预留 TODO 占位清单

以下 TODO 是负责人搭建 C 组框架时已经留在代码中的成员 2 工作占位。成员 2 接手实现时，应优先完成这些 C3 写事务 TODO；完成后可以删除或细化 TODO，但不能保留危险假实现。

| 现有位置 | 当前 TODO 范围 | 组员需要完成的内容 |
|---|---|---|
| `backend/src/modules/course-selection/enrollment.service.ts`：选课函数 | `TODO(C3, FR-C-14, FR-C-16, FR-C-17, NFR-C-04, NFR-C-05)`、`TODO(C3, FR-C-17, FR-C-22)` | 实现学生选课事务：校验学生身份、有效阶段、`CourseOffering.status=open`、`Course.status=active`、容量、重复、Schedule 冲突、`max_credits`、培养方案适配、先修要求；创建或恢复 `Enrollment` 与更新 `CourseOffering.enrolled_count` 必须同事务完成；并发使用行锁、条件更新或等价策略。 |
| `backend/src/modules/course-selection/enrollment.service.ts`：退选函数 | `TODO(C3, FR-C-21, FR-C-22, NFR-C-04)`、`TODO(C3, FR-C-23)` | 实现退选事务：只能退选当前学生本人 `Enrollment`，阶段必须允许退选，目标状态必须为 `enrolled`；只更新 `status=dropped` 和 `dropped_at`，不得删除记录，不写不存在的退选原因字段；同事务减少 `enrolled_count` 且不小于 0。 |
| `backend/src/modules/course-selection/course-selection.schemas.ts`：选课/退选 schema | `TODO(C3, FR-C-14, FR-C-16, NFR-C-04)`、`TODO(C3, FR-C-16, FR-C-14, NFR-C-04)`、`TODO(C3, FR-C-21, NFR-C-04)` | 保持请求体只使用 `course_offering_id`、`client_request_id` 等文档字段；学生身份不得来自请求体；退选 schema 透传 `client_request_id`，不推动新增 `Enrollment.reason`。 |

依赖其他成员的内容不要在 C3 中直接实现：可选课程 eligibility 属于 C1/C2，`GET /enrollments/me` 和课表属于 C4，手动加课属于 C5。先修通过情况、准入控制和退选阶段规则应分别引用 `TODO-C-10`、`TODO-C-11`、`TODO-C-12` 并写清负责人确认项。

## 6. 选课事务必须完成的校验

`POST /enrollments` 必须在服务端事务中完成，至少包含：

1. 当前用户必须是 `student`。
2. 学生身份来自认证上下文，不得信任请求体中的 `student_id` 或 `studentId`。
3. 当前存在启用的 `SelectionPeriod`。
4. 服务端当前时间位于 `start_time` 和 `end_time` 范围内。
5. `CourseOffering.status = open`。
6. `Course.status = active`。
7. `enrolled_count < capacity`。
8. 同一学生对同一 `CourseOffering` 不存在多个有效 `enrolled` 记录。
9. 新选课程与学生已选课程 `Schedule` 不冲突。
10. 当前阶段总学分不超过 `SelectionPeriod.max_credits`。
11. 课程符合学生培养方案适配性。
12. 如存在 `CoursePrerequisite`，检查先修要求；F 子系统未完成时按 `TODO-C-10` 明确阻止或风险提示策略。
13. 创建或恢复 `Enrollment` 与更新 `CourseOffering.enrolled_count` 必须在同一事务内完成。
14. 并发选课必须使用行锁、条件更新或等价策略，避免容量超卖。
15. 幂等字段使用 `client_request_id`。

禁止：

```text
1. 直接 prisma.enrollment.create 但不校验容量/阶段/冲突。
2. 先写 Enrollment，再异步更新 enrolled_count。
3. 只读 enrolled_count 后无锁写入。
4. 让前端或 AI 决定选课成功。
5. 返回 success: true 作为临时假实现。
```

## 7. 退选事务必须完成的校验

`PATCH /enrollments/:id/drop` 必须在服务端事务中完成，至少包含：

1. 当前用户必须是 `student`。
2. 学生只能退选自己的 `Enrollment`。
3. 当前阶段必须允许退选，且以服务端时间判断；阶段规则按 `TODO-C-12` 与负责人确认。
4. 目标 `Enrollment` 必须存在且 `status = enrolled`。
5. 退选只更新 `status = dropped` 和 `dropped_at`，不得删除历史记录。
6. 当前 `Enrollment` 模型不持久化退选原因，不得新增或写入 `reason` 字段。
7. `CourseOffering.enrolled_count` 必须在同一事务内减少，并保证不小于 0。
8. 幂等字段使用 `client_request_id`。

## 8. 数据库与模型边界

可以使用：

```text
Student
Course
CourseOffering
Schedule
Enrollment
SelectionPeriod
CoursePrerequisite
Curriculum
CurriculumCourse
Semester
```

不得新增业务表或修改 Prisma schema。若认为必须增加唯一约束或索引，先写负责人确认项，不要直接改 schema。

## 9. 推荐 AI 工作流

### 9.1 开始任务

给 AI 的开场提示建议：

```text
使用 $stss-c-course-selection 和 $stss-c-member2-backend-enrollment-core。
本次只实现 C3 后端选课/退选事务，不实现 GET /enrollments/me、课表、名单、阶段管理、AI 或任何前端页面。
请先对照 C API 的 RULE-C-01 至 RULE-C-05 和 FR-C-14 至 FR-C-23。
```

### 9.2 拆分实现

推荐拆成这些小任务：

1. “检查 `enrollment.controller.ts`、`schemas`、`types` 是否与 POST/PATCH API 契约一致。”
2. “实现选课事务中的身份、阶段、课程状态、容量、重复记录校验。”
3. “实现 Schedule 时间冲突、max_credits、培养方案适配和先修校验。”
4. “补充并发安全策略：行锁或条件更新，避免 `enrolled_count` 超卖。”
5. “实现退选事务：只改状态和 `dropped_at`，同步减少人数。”
6. “补充错误码、手动测试和并发测试说明。”

### 9.3 AI 输出复核

每轮修改后检查：

- 是否只改 C3 文件和必要共享类型/schema。
- 是否误实现了 C4 的 `/enrollments/me`。
- 是否新增了 `Enrollment.reason` 或删除历史记录。
- 是否在所有写路径中使用事务。
- 是否仍信任请求体中的 `student_id`。
- 是否有容量超卖风险。

## 10. 验证要求

必须通过 Docker wrapper。

后端标准命令：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

建议手动验证：

```text
1. 学生在开放阶段选课成功，Enrollment 状态为 enrolled，enrolled_count +1。
2. 阶段关闭时选课失败并返回明确错误。
3. 容量满、重复选课、课表冲突、超 max_credits 时失败。
4. 并发请求同一剩余容量为 1 的课程，不出现超卖。
5. 退选本人 enrolled 记录成功，状态变 dropped，dropped_at 有值，enrolled_count -1。
6. 学生退选他人记录失败。
```

## 11. 交付说明模板

提交或交接时必须说明：

```text
1. 修改文件清单和每个文件作用。
2. 完成的 FR-C 编号。
3. 是否只涉及 C3。
4. 是否修改选课/退选事务规则。
5. 是否修改 API 契约、权限边界、错误码。
6. 是否修改数据库或 Prisma schema。
7. 是否触及 C1/C2/C4/C5/C6、前端或非 C 组文件。
8. 实际执行的 Docker wrapper 命令和结果。
9. 手动测试步骤和并发测试说明。
10. 需要负责人或其他成员确认的问题。
```
