# C 组成员 5 工作指导：教师/教务端前端 + AI 面板

> 适用成员：成员 5
> 对应 skill：`$stss-c-member5-frontend-admin-teacher-ai`
> 负责范围：教师名单、教务阶段管理、手动加课、AI 推荐展示前端；单独指派时维护 C6 后端接口契约和兜底模板
> 工作原则：不实现学生端完整页面，不实现 C3/C5 后端事务，不实现未经确认的完整 AI 算法。

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
10. `frontend/src/modules/course-selection/README.md`
11. `backend/src/modules/course-selection/README.md`
12. `AGENTS.md`
13. `README.md`

冲突优先级：

```text
项目要求/数据库设计 > C 组 SRS > shared/C API > 模块设计 > 分工文档 > agent guidelines > 当前代码
```

## 2. Git 操作建议

### 2.1 分支管理

从 `dev/C` 创建成员 5 功能分支，命名沿用项目已有 `feat/D-frontend-...`、`feat/F-score-entry-frontend-...` 风格。教师/教务/AI 范围较大，建议按页面拆分：

```bash
git checkout dev/C
git pull origin dev/C
git checkout -b feat/C-admin-teacher-ai-frontend-<MMDD>
```

推荐分支名：

```text
feat/C-teacher-roster-ui-<MMDD>
feat/C-admin-period-ui-<MMDD>
feat/C-admin-manual-enrollment-ui-<MMDD>
feat/C-ai-advisor-panel-<MMDD>
fix/C-admin-teacher-permission-ui-<MMDD>
```

如负责人单独指派 C6 后端接口契约，可另开：

```text
feat/C-ai-advisor-contract-<MMDD>
```

不要在教师/教务/AI 前端分支中顺手实现 C3/C5 后端事务或学生端完整页面。

### 2.2 提交规范

Commit message 遵循 `README.md`：

```text
<type>(<scope>): <subject>
```

推荐使用 `C` 作为 scope，并在 subject 写明教师、教务或 AI；若负责人允许子模块 scope，可使用 `C5` 或 `C6`。

```text
feat(C): add teacher roster page
feat(C): wire admin period form
feat(C): add AI advisor recommendation panel
fix(C): handle manual enrollment backend errors
```

不要把教师 roster、教务阶段管理、AI 面板和 C6 后端契约混在一个大 commit 中。

### 2.3 PR 建议

优先从成员功能分支向 `dev/C` 开 PR。若组内暂时不强制 PR，也应在合并说明中保留同等信息。

PR 描述必须包含：

```text
1. 对应范围：教师端前端、教务端前端、AI 面板或 C6 后端契约。
2. 覆盖需求：FR-C-27~FR-C-28、FR-C-30~FR-C-43 中本次涉及的部分。
3. 修改文件清单。
4. 页面截图或手动访问路径，例如 /selection/teacher/roster、/selection/admin/periods、/selection/admin/manual-enrollment、/selection/ai。
5. Docker wrapper 校验命令和结果。
6. 后端依赖和仍未完成 TODO。
7. 是否修改学生端页面、后端、API client、类型、非 C 组文件。
8. 是否影响权限边界或 AI 不写 Enrollment 的边界。
```

PR 合并前先同步 `dev/C`，重点检查前端 API client 字段是否仍与 C API 文档一致。

## 3. 需求与接口范围

成员 5 覆盖：

| 能力 | 需求编号 | 主要页面/组件 |
|---|---|---|
| 教师名单与导出前端 | `FR-C-27`、`FR-C-28` | `TeacherRosterPage` |
| 教务阶段管理前端 | `FR-C-30` 至 `FR-C-32`、`FR-C-37` | `AdminSelectionPeriodPage`、`SelectionPeriodStatusTag` |
| 教务手动加课前端 | `FR-C-33`、`FR-C-34`、`FR-C-37` | `AdminManualEnrollmentPage` |
| AI 推荐展示 | `FR-C-38` 至 `FR-C-43` | `CourseSelectionAiPage`、`AiAdvisorPanel` |

主要调用接口：

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

不要调用未定义的 `GET /admin/enrollments`。

## 4. 允许修改的文件

优先修改：

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
frontend/src/modules/course-selection/README.md
```

仅当任务明确写明“C6 后端”或负责人单独指派时，可以修改：

```text
backend/src/modules/course-selection/ai-advisor.controller.ts
backend/src/modules/course-selection/ai-advisor.service.ts
backend/src/modules/course-selection/course-selection.schemas.ts
backend/src/modules/course-selection/course-selection.types.ts
backend/src/modules/course-selection/README.md
```

必要时只读：

```text
frontend/src/modules/course-selection/pages/StudentCourseSelectionPage.tsx
frontend/src/modules/course-selection/api/courses.ts
frontend/src/modules/course-selection/api/enrollments.ts
backend/src/modules/course-selection/**
```

## 5. 负责人已预留 TODO 占位清单

以下 TODO 是负责人搭建 C 组框架时已经留在代码中的成员 5 工作占位，覆盖教师/教务前端、AI 面板，以及负责人单独指派时的 C6 后端契约。成员 5 应优先完成这些 TODO；后端仍为 TODO/501 时，前端应展示错误或降级状态，不得 mock 成功。

| 现有位置 | 当前 TODO 范围 | 组员需要完成的内容 |
|---|---|---|
| `frontend/src/modules/course-selection/pages/TeacherRosterPage.tsx` | `TODO(C4, FR-C-27, FR-C-28, NFR-C-06, NFR-C-08)` | 完成教师名单页面，支持筛选、分页、权限错误展示和 Excel 二进制导出；导出不能从前端缓存拼接名单。 |
| `frontend/src/modules/course-selection/pages/AdminSelectionPeriodPage.tsx` | `TODO(C5, FR-C-30, FR-C-31, FR-C-32, NFR-C-14, NFR-C-01)`、`TODO(C5 frontend, FR-C-30~FR-C-32)` | 完成阶段管理页面的创建/更新 mutation 和状态展示；字段对齐 `semester_id/phase/start_time/end_time/max_credits/is_active`；后端负责时序、重叠和权限校验。 |
| `frontend/src/modules/course-selection/pages/AdminManualEnrollmentPage.tsx` | `TODO(C5, FR-C-33, FR-C-34, NFR-C-04, NFR-C-12)` | 完成手动加课表单，`student_id/course_offering_id/reason` 对齐 API，`reason` 必填；成功后展示 `enrollment/course_offering/audit`，失败展示后端原因。 |
| `frontend/src/modules/course-selection/pages/CourseSelectionAiPage.tsx` | `TODO(C6, FR-C-38, FR-C-39, FR-C-40, FR-C-41, FR-C-42, NFR-C-09, NFR-C-10)` | 完成 AI 推荐页面，展示推荐、解释、冲突风险、学分影响和降级提示；AI 请求不得携带 `student_id`，不得触发选课写入。 |
| `frontend/src/modules/course-selection/components/AiAdvisorPanel.tsx` | `TODO(C6, FR-C-38, FR-C-39, FR-C-41, NFR-C-09, NFR-C-10)` | 完成 AI 面板展示，覆盖 `disclaimer`、推荐理由、风险提示、学分影响；不得直接创建或修改 `Enrollment`。 |
| `frontend/src/modules/course-selection/components/SelectionPeriodStatusTag.tsx` | `TODO(C5, FR-C-30, FR-C-31, NFR-C-14)` | 完成阶段状态展示，使用后端 `server_status`、启用状态和时间范围；不在前端替代服务端生效规则。 |
| `frontend/src/modules/course-selection/hooks/useSelectionPeriod.ts` | `TODO(C5, FR-C-30, FR-C-31, FR-C-33, NFR-C-01~NFR-C-03)` | 完成阶段管理与手动加课 hook，保留错误展示和缓存刷新；不要伪造保存或手动加课成功。 |
| `frontend/src/modules/course-selection/hooks/useAiAdvisor.ts` | `TODO(C6, FR-C-38, FR-C-41, NFR-C-10, NFR-C-11)` | 完成 AI 推荐/解释 hook，失败时降级提示，不阻断普通选课流程。 |
| `backend/src/modules/course-selection/ai-advisor.service.ts`（仅负责人明确指派 C6 后端契约时） | `TODO(C6, FR-C-38, FR-C-39, NFR-C-09)`、`TODO(C6, FR-C-40, FR-C-41, FR-C-42, NFR-C-10, NFR-C-11)` | 只维护 AI DTO、超时、脱敏、兜底模板和“不写 Enrollment”的边界；完整模型算法或外部 AI 服务接入需负责人确认。 |
| `backend/src/modules/course-selection/course-selection.schemas.ts` 的 AI schema（仅负责人明确指派 C6 后端契约时） | `TODO(C6, FR-C-38, FR-C-42, NFR-C-09)` | 维护 AI 输入 schema，支持课程/课表上下文和降级返回；不得允许前端传 `student_id` 代替登录上下文。 |

## 6. 教师端前端要求

教师名单页面必须：

- 只调用文档定义的 roster API。
- 支持 `status`、`keyword`、分页。
- 展示课程信息、学生列表、状态、选课时间。
- 导出按钮调用 `/roster/export`，处理 Excel 二进制下载。
- 后端返回 403 时展示权限错误。
- 不在前端绕过教师 ownership，不根据前端缓存自行导出敏感名单。

## 7. 教务端前端要求

### 7.1 阶段管理

- 表单字段对齐 API：`semester_id`、`phase`、`start_time`、`end_time`、`max_credits`、`is_active`。
- `phase` 只能为 `first_round`、`second_round`、`adjustment`。
- 创建阶段时 `is_active` 必须明确提交。
- 展示 `server_status`、启用状态和时间范围。
- 当前路由角色可用 `admin/super_admin`，但 UI 文案不要宣称 system admin 默认拥有教务权限；后端语义权限是 `academic_admin`。

### 7.2 手动加课

- 表单字段对齐 API：`student_id`、`course_offering_id`、`reason`。
- `reason` 必填且非空。
- 前端只能做表单预校验；容量、重复、冲突、学分、阶段等最终由后端校验。
- 不伪造手动加课成功；必须等待后端结果。
- 展示后端返回的 `enrollment`、`course_offering` 和 `audit` 信息。

## 8. AI 面板要求

AI 推荐和解释接口属于学生当前登录上下文。成员 5 负责 AI 展示面板，但不得让教师或教务代学生请求 AI。

必须遵守：

```text
1. AI 请求不得携带 student_id/studentId。
2. AI 面板不得直接创建、修改或删除 Enrollment。
3. AI 推荐只能展示推荐理由、冲突风险、学分影响和可解释说明。
4. AI 不可用时显示降级提示，普通选课流程仍可用。
5. AI 输出不能覆盖后端 eligibility 或选课事务结果。
```

如被单独指派 C6 后端接口契约任务，只能维护 DTO、超时、兜底模板、脱敏和“不写 Enrollment”的服务边界 TODO；完整模型算法或外部 AI 服务接入需负责人确认。

## 9. 禁止事项

成员 5 不得做：

```text
1. 实现学生端完整培养方案、课程搜索、选课、课表页面。
2. 实现后端 roster ownership、SelectionPeriod 业务、手动加课事务。
3. 实现 C3 普通学生选课/退选事务。
4. 调用未定义接口或新增管理端结果查询接口。
5. 教师/教务页面代学生请求 AI 推荐。
6. AI 面板直接写 Enrollment。
7. 修改 Prisma schema 或新增业务表。
8. 修改 A/B/D/E/F 组业务逻辑。
```

## 10. 推荐 AI 工作流

### 10.1 开始任务

给 AI 的开场提示建议：

```text
使用 $stss-c-course-selection 和 $stss-c-member5-frontend-admin-teacher-ai。
本次只处理教师/教务/AI 前端；除非明确指派 C6 后端接口契约，否则不改后端业务。
请先对齐 C API 中 roster、periods、manual enrollment、ai-advisor 的字段与权限边界。
```

### 10.2 拆分实现

推荐拆成这些任务：

1. “检查 roster/periods/ai API client 与 C API 文档是否一致，只给出前端需要改的点。”
2. “完善 TeacherRosterPage，支持筛选、分页、权限错误和二进制 Excel 下载。”
3. “完善 AdminSelectionPeriodPage 表单与状态展示，提交字段严格对齐 API。”
4. “完善 AdminManualEnrollmentPage，reason 必填，成功后展示 audit 信息。”
5. “完善 CourseSelectionAiPage 和 AiAdvisorPanel，展示推荐、解释、风险和降级提示。”
6. “若负责人指派 C6 后端契约，补充 ai-advisor DTO/兜底模板 TODO，不实现完整算法。”

### 10.3 AI 输出复核

每轮修改后检查：

- 是否误改学生端完整页面。
- 是否新增或调用未定义接口。
- 是否发送 `student_id` 给 AI。
- 是否让 AI 或前端写 `Enrollment`。
- 是否把 `system_admin` 写成默认教务权限。
- 是否伪造手动加课或阶段保存成功。
- 是否绕过后端 roster ownership 或 C5 校验。

## 11. 验证要求

必须通过 Docker wrapper。

前端标准命令：

```bash
CODEX_DOCKER_SERVICE=web CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
```

如果单独修改 C6 后端契约，补跑后端：

```bash
CODEX_DOCKER_SERVICE=server CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

建议手动验证：

```text
1. /selection/teacher/roster 能查询名单，403 时显示权限错误，导出下载 Excel。
2. /selection/admin/periods 能展示阶段列表，表单字段与 API 对齐。
3. /selection/admin/manual-enrollment 缺 reason 时不能提交，后端失败时展示原因。
4. /selection/ai 能展示推荐、解释、冲突风险和降级提示。
5. AI 请求不包含 student_id，AI 不触发 Enrollment 写入。
```

## 12. 交付说明模板

提交或交接时必须说明：

```text
1. 修改文件清单和每个文件作用。
2. 完成的 FR-C 编号。
3. 是否只涉及教师/教务/AI 前端。
4. 是否修改学生端页面或后端，如修改必须说明原因。
5. 是否修改 API client、类型或权限边界。
6. 是否修改数据库或 Prisma schema。
7. 是否修改非 C 组文件。
8. 新增或保留的 TODO。
9. 实际执行的 Docker wrapper 命令和结果。
10. 手动测试步骤。
11. 依赖后端或其他成员完成的事项。
```
