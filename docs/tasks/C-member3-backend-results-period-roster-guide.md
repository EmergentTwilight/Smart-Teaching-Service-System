# C 组成员 3 工作指导：C4 + C5 后端

> 适用成员：成员 3
> 对应 skill：`$stss-c-member3-backend-results-period-roster`
> 负责范围：C4 选课结果/课表/教师名单/导出，C5 选课阶段/手动加课/并发预留后端
> 工作原则：只做 C4/C5 后端，不实现 C1/C2 查询、C3 普通学生选课事务、C6 AI 或完整前端页面。

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

## 2. Git 操作建议

### 2.1 分支管理

从 `dev/C` 创建成员 3 功能分支，命名沿用项目已有 `feat/A-...`、`fix/F-...` 风格。C4/C5 范围较大，建议按功能拆分：

```bash
git checkout dev/C
git pull origin dev/C
git checkout -b feat/C-results-roster-<MMDD>
```

推荐分支名：

```text
feat/C-results-roster-<MMDD>
feat/C-timetable-roster-export-<MMDD>
feat/C-period-admin-<MMDD>
feat/C-manual-enrollment-<MMDD>
fix/C-roster-permission-<MMDD>
```

不要在同一分支里同时重写 C4 结果查询、C5 阶段管理和 C3 普通选课事务。手动加课如需复用 C3 校验能力，应先与成员 2 或负责人确认共享方式。

### 2.2 提交规范

Commit message 遵循 `README.md`：

```text
<type>(<scope>): <subject>
```

推荐使用 `C` 作为 scope，并在 subject 写明 C4/C5；若负责人允许子模块 scope，可使用 `C4`、`C5` 或 `C4,C5`。

```text
feat(C): add enrollment result query backend
feat(C): add teacher roster export
feat(C): add selection period admin backend
fix(C): restrict roster ownership checks
```

一个 commit 只做一个后端能力。不要把 roster 权限、manual enrollment 事务和前端页面改动混在一起。

### 2.3 PR 建议

优先从成员功能分支向 `dev/C` 开 PR。若组内暂时不强制 PR，也应在合并说明中保留同等信息。

PR 描述必须包含：

```text
1. 对应子模块：C4、C5 或 C4/C5。
2. 覆盖需求：FR-C-24~FR-C-29 或 FR-C-30~FR-C-37。
3. 权限说明：学生本人、教师本人任课课程、academic_admin 映射。
4. 审计说明：SelectionPeriod/手动加课是否写 SystemLog。
5. 修改文件清单。
6. Docker wrapper 校验命令和结果。
7. 手动测试步骤。
8. 是否修改 API 契约、数据库/Prisma schema、非 C 组文件。
```

PR 合并前先同步 `dev/C`，特别检查 `course-selection.schemas.ts` 和 `course-selection.types.ts` 与其他成员的并行修改。

## 3. 需求与接口范围

成员 3 覆盖：

| 子模块 | 需求编号 | 主要能力 |
|---|---|---|
| C4 | `FR-C-24` 至 `FR-C-29` | 本人选课结果、个人课表、教师名单、Excel 导出。 |
| C5 | `FR-C-30` 至 `FR-C-37` | 阶段管理、手动加课、连接数控制与无操作释放预留。 |

主要接口：

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

不要新增未评审接口，例如 `GET /admin/enrollments`。

## 4. 允许修改的文件

优先修改：

```text
backend/src/modules/course-selection/enrollment-results.controller.ts
backend/src/modules/course-selection/enrollment-results.service.ts
backend/src/modules/course-selection/timetable.controller.ts
backend/src/modules/course-selection/timetable.service.ts
backend/src/modules/course-selection/roster.controller.ts
backend/src/modules/course-selection/roster.service.ts
backend/src/modules/course-selection/selection-period.controller.ts
backend/src/modules/course-selection/selection-period.service.ts
backend/src/modules/course-selection/course-selection.schemas.ts
backend/src/modules/course-selection/course-selection.types.ts
backend/src/modules/course-selection/README.md
```

必要时只读：

```text
backend/src/modules/course-selection/enrollment.service.ts
backend/src/modules/course-selection/course-search.service.ts
backend/src/modules/course-selection/curriculum.service.ts
backend/src/modules/course-selection/ai-advisor.service.ts
frontend/src/modules/course-selection/**
```

不要主动实现 C1/C2/C3/C6 或前端完整业务。

## 5. C4 后端工作要求

### 5.1 本人选课结果

实现 `GET /enrollments/me`：

- 学生身份来自认证上下文，不接收或信任 `student_id`。
- 支持 API 文档中的 `semester_id`、`keyword`、`status`、分页参数。
- 返回 `enrollment_id`、状态、时间、课程开设摘要、分页 summary。
- 不修改任何 `Enrollment`。

### 5.2 本人课表

实现 `GET /timetable/me`：

- 学生只能查本人课表。
- 支持 `semester_id` 和 `format`。
- 返回 `semester`、`items`、`missing_schedule_items`。
- 后端只提供稳定数据结构，打印样式由成员 4 前端完成。

### 5.3 教师名单与导出

实现 roster 查询和导出：

- 教师只能查看或导出本人任课 `CourseOffering`。
- 必须校验 `CourseOffering.teacher_id` 与当前教师身份。
- 当前 API 不提供 `admin/super_admin` 例外。
- 支持 `status`、`keyword`、分页，roster 默认 `page_size = 50`。
- 导出接口返回 Excel 二进制，不能返回 JSON download token。
- 导出必须复用 ownership 校验，不能从前端缓存拼接敏感数据。

## 6. C5 后端工作要求

### 6.1 SelectionPeriod 管理

实现阶段查询、创建、修改：

- 阶段值只允许 `first_round`、`second_round`、`adjustment`。
- 时间字段必须支持带时区偏移的 ISO 字符串。
- `is_active` 创建时必须由调用方明确传入。
- 创建/修改后按 API 文档写入 `SystemLog`，`SystemLog.action` 命名按 `TODO-C-19` 与负责人统一。
- 同一学期启用阶段重叠、相邻规则按 `TODO-C-18` 明确。
- 正在开放阶段被停用时的在途请求策略按 `TODO-C-20` 明确。

### 6.2 手动加课

实现 `POST /admin/enrollments`：

- 语义权限为 `academic_admin`；当前路由可用 `admin/super_admin` 作为入口保护，但服务层必须映射到 `Admin.adminType = ACADEMIC` 或等价教务授权。
- `reason` 必填且非空，用于审计。
- 事务内校验学生、课程开设存在且课程未取消、容量、重复选课、课表冲突、默认 `max_credits`。
- 创建或恢复 `Enrollment`、更新 `CourseOffering.enrolled_count`、写入 `SystemLog` 必须在同一事务内完成。
- 是否允许培养方案适配或先修课例外，按 `TODO-C-21` 由负责人确认，不得用前端参数绕过。

### 6.3 并发与无操作释放

连接数控制、心跳、无操作释放如未实现，必须保留清晰 TODO：

```text
TODO(C5, FR-C-35, FR-C-36, NFR-C-01~NFR-C-03)
```

不得新增 `CourseSelectionQueue` 等数据库业务表。

## 7. 权限边界

必须守住：

```text
1. 学生结果和课表只能查本人。
2. 教师名单和导出只能查本人任课课程。
3. 教务接口语义权限为 academic_admin。
4. system_admin 不默认替代教务权限。
5. 手动加课不得开放给 student/teacher。
```

## 8. 推荐 AI 工作流

### 8.1 开始任务

给 AI 的开场提示建议：

```text
使用 $stss-c-course-selection 和 $stss-c-member3-backend-results-period-roster。
本次只处理 C4/C5 后端，不实现 C3 普通选课事务、不实现前端页面、不新增 admin 查询接口。
请优先对齐 C API 中 /enrollments/me、/timetable/me、/teacher/offerings/:id/roster、/admin/periods、/admin/enrollments 的契约。
```

### 8.2 拆分实现

推荐拆成这些任务：

1. “实现 `GET /enrollments/me`，只做本人只读结果查询。”
2. “实现 `GET /timetable/me`，返回可打印课表数据，不处理前端打印样式。”
3. “实现 teacher roster 查询，保留并复用 ownership 校验。”
4. “实现 roster Excel 导出为二进制，确认文件名和大名单策略 TODO。”
5. “实现 SelectionPeriod 列表/创建/修改，写入 SystemLog 并保持 academic_admin 语义权限。”
6. “实现手动加课事务，复用 C3 校验能力，不重写普通学生选课事务。”
7. “补充连接数控制和无操作释放 TODO，不新增业务表。”

### 8.3 AI 输出复核

每轮修改后检查：

- 是否新增了未定义接口。
- 是否让管理员默认访问教师 roster。
- 是否把 `system_admin` 当作教务权限。
- 是否遗漏手动加课 `reason` 和 `SystemLog`。
- 是否绕过容量、冲突、重复和学分校验。
- 是否误改 C3 普通选课事务。

## 9. 验证要求

必须通过 Docker wrapper。

后端标准命令：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

建议手动验证：

```text
1. 学生只能查询本人 /enrollments/me 和 /timetable/me。
2. 教师查询本人 offering roster 成功，查询他人 offering 返回 403。
3. roster export 返回 Excel Content-Type 和附件文件名。
4. academic_admin 创建/修改 period 成功并写 SystemLog。
5. 非教务角色访问 period 或 manual enrollment 被拒绝。
6. 手动加课容量满、重复、课表冲突、缺 reason 时失败。
```

## 10. 交付说明模板

提交或交接时必须说明：

```text
1. 修改文件清单和每个文件作用。
2. 完成的 FR-C 编号。
3. 是否只涉及 C4/C5 后端。
4. 是否修改 roster ownership、academic_admin 映射、SystemLog 审计。
5. 是否修改 API 契约或错误码。
6. 是否修改数据库或 Prisma schema。
7. 是否触及 C1/C2/C3/C6、前端或非 C 组文件。
8. 实际执行的 Docker wrapper 命令和结果。
9. 手动测试步骤。
10. 需要负责人或其他成员确认的问题。
```
