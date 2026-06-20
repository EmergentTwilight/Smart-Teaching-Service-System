# C 组成员 4 工作指导：学生端前端

> 适用成员：成员 4
> 对应 skill：`$stss-c-member4-frontend-student`
> 负责范围：学生端培养方案、课程搜索、选课、结果、课表前端
> 工作原则：前端只做展示、交互和预提示；选课成功、容量、冲突、阶段、先修、学分等最终结果以后端返回为准。

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
11. `AGENTS.md`
12. `README.md`

冲突优先级：

```text
项目要求/数据库设计 > C 组 SRS > shared/C API > 模块设计 > 分工文档 > agent guidelines > 当前代码
```

## 2. Git 操作建议

### 2.1 分支管理

从 `dev/C` 创建成员 4 学生端前端功能分支，沿用项目已有 `feat/D-frontend-...`、`feat/F-score-entry-frontend-...` 风格：

```bash
git checkout dev/C
git pull origin dev/C
git checkout -b feat/C-student-frontend-<MMDD>
```

推荐分支名：

```text
feat/C-student-frontend-<MMDD>
feat/C-student-curriculum-ui-<MMDD>
feat/C-student-timetable-ui-<MMDD>
fix/C-student-selection-errors-<MMDD>
```

学生端页面可能与成员 1/2/3 后端并行开发。前端分支可以先接入 API client 和错误展示，但不要在自己的分支里顺手补后端复杂业务。

### 2.2 提交规范

Commit message 遵循 `README.md`：

```text
<type>(<scope>): <subject>
```

推荐使用 `C` 作为 scope，并在 subject 写明学生端前端；若负责人允许子模块 scope，可使用 `C4 frontend` 这类文字放在 subject，不建议把成员编号写成 scope。

```text
feat(C): add student curriculum page
feat(C): wire student enrollment actions
fix(C): show backend selection errors on student page
docs(C): update student frontend handoff notes
```

不要把学生端前端改动和教师/教务页面、AI 面板、后端事务改动混在同一个 commit 中。

### 2.3 PR 建议

优先从成员功能分支向 `dev/C` 开 PR。若组内暂时不强制 PR，也应在合并说明中保留同等信息。

PR 描述必须包含：

```text
1. 对应范围：学生端前端。
2. 覆盖需求：FR-C-01~FR-C-26、FR-C-29 中本次涉及的部分。
3. 修改文件清单。
4. 页面截图或手动访问路径，例如 /selection/courses、/selection/curriculum、/selection/timetable。
5. Docker wrapper 校验命令和结果。
6. 后端依赖和仍未完成 TODO。
7. 是否修改 API client、类型、后端、非 C 组文件。
```

PR 合并前先同步 `dev/C`，重点检查 `frontend/src/modules/course-selection/types/**` 与后端 DTO 是否仍对齐。

## 3. 需求与接口范围

成员 4 覆盖学生端前端：

| 能力 | 需求编号 | 主要页面/组件 |
|---|---|---|
| 培养方案与学分进展 | `FR-C-01` 至 `FR-C-07` | `StudentCurriculumPage`、`CreditProgressCard` |
| 课程搜索、详情、可选课程 | `FR-C-08` 至 `FR-C-13`、`FR-C-15` | `StudentCourseSelectionPage`、`CourseOfferingTable`、`CourseDetailDrawer` |
| 选课与退选入口 | `FR-C-14` 至 `FR-C-23` | 学生端按钮、确认弹窗、错误提示 |
| 结果与课表 | `FR-C-24` 至 `FR-C-26`、`FR-C-29` | `StudentTimetablePage`、`TimetableGrid`、结果列表 |

主要调用接口：

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

学生端不得发送 `student_id` 或 `studentId`。

## 4. 允许修改的文件

优先修改：

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
frontend/src/modules/course-selection/README.md
```

必要时只读：

```text
backend/src/modules/course-selection/**
frontend/src/modules/course-selection/pages/TeacherRosterPage.tsx
frontend/src/modules/course-selection/pages/AdminSelectionPeriodPage.tsx
frontend/src/modules/course-selection/pages/AdminManualEnrollmentPage.tsx
frontend/src/modules/course-selection/pages/CourseSelectionAiPage.tsx
```

不要主动修改后端复杂业务、教师/教务/AI 页面或其他组模块。

## 5. 负责人已预留 TODO 占位清单

以下 TODO 是负责人搭建 C 组前端框架时已经留在代码中的成员 4 工作占位。成员 4 接手实现时，应优先完成这些学生端 TODO；若后端仍为 501，应展示错误和占位状态，不能用假数据覆盖真实接口状态。

| 现有位置 | 当前 TODO 范围 | 组员需要完成的内容 |
|---|---|---|
| `frontend/src/modules/course-selection/pages/StudentCurriculumPage.tsx` | `TODO(C1, FR-C-01, FR-C-02, FR-C-04, FR-C-05)` | 完成培养方案页面，展示培养方案、课程分组、建议学期、确认入口和学分进展；无培养方案时展示后端错误。 |
| `frontend/src/modules/course-selection/pages/StudentCourseSelectionPage.tsx` | `TODO(C1, C2, C3, FR-C-04, FR-C-13, FR-C-16, FR-C-22, NFR-C-07, NFR-C-13)`、`TODO(C3/C4 frontend, FR-C-16, FR-C-21, FR-C-24, NFR-C-13)` | 完成学生选课聚合页：展示培养方案上下文、可选课程、课程详情、本人选课；接入选课/退选 mutation，但必须等待后端结果，不伪造成功。 |
| `frontend/src/modules/course-selection/pages/StudentTimetablePage.tsx` | `TODO(C4, FR-C-25, FR-C-26, FR-C-29, FR-C-07)` | 完成本人课表页面，展示课表、筛选和缺失排课提示；打印样式在前端实现但不改变后端数据。 |
| `frontend/src/modules/course-selection/components/CreditProgressCard.tsx` | `TODO(C1, FR-C-05, NFR-C-06, NFR-C-07)` | 完成学分进展卡片，展示必修/选修/公共课进度、warnings、loading 和 error 状态。 |
| `frontend/src/modules/course-selection/components/CourseOfferingTable.tsx` | `TODO(C2, FR-C-08, FR-C-09, C3, FR-C-16, NFR-C-13)` | 完成课程列表渲染，与后端分页、筛选、可选状态、冲突提示保持一致；展示 `eligibility.reasons`，不要要求未定义的 `unavailable_reason`。 |
| `frontend/src/modules/course-selection/components/CourseDetailDrawer.tsx` | `TODO(C2, FR-C-11, FR-C-19, NFR-C-07)` | 完成课程详情抽屉，展示先修课程、排课信息和冲突风险；不展示 roster 敏感信息。 |
| `frontend/src/modules/course-selection/components/TimetableGrid.tsx` | `TODO(C4, FR-C-25, NFR-C-08)` | 完成课表网格化展示，按后端 `items` 渲染并处理缺失排课项。 |
| `frontend/src/modules/course-selection/hooks/useAvailableOfferings.ts` | `TODO(C2, FR-C-13, FR-C-15, NFR-C-13)` | 完成可选课程查询 hook，使用 `/offerings/available` 和 `include_unavailable`，不发送 `student_id`。 |
| `frontend/src/modules/course-selection/hooks/useMyEnrollments.ts` | `TODO(C4, FR-C-24, FR-C-29, NFR-C-06)` | 完成本人选课结果查询 hook；`GET /enrollments/me` 属于 C4 只读结果，学生身份由后端解析。 |

## 6. 具体要完成的工作

### 6.1 培养方案页面

- 展示培养方案名称、专业、年级、总学分、课程分组。
- 展示 required/elective/general 分类课程、学分、建议学期。
- 展示学分进展和后端 warnings。
- 如果后端提示无匹配培养方案，前端给出明确错误和空状态。

### 6.2 学生选课页面

- 提供课程搜索和筛选，字段对齐 API 文档。
- `/offerings/available` 使用 `include_unavailable` 展示可选与不可选课程。
- 展示 `eligibility.reasons`，不引入未定义字段如 `unavailable_reason`。
- 课程详情抽屉展示课程、教师、学期、容量、排课、先修、eligibility。
- 选课按钮调用 `POST /enrollments`，成功后刷新可选课程和本人选课。
- 退选按钮调用 `PATCH /enrollments/:id/drop`，成功后刷新本人结果和课表。

### 6.3 结果和课表页面

- 结果查询支持 `semester_id`、`status`、`keyword`、分页。
- 课表展示按后端 `items` 和 `missing_schedule_items` 渲染。
- 打印样式或导出视图属于前端工作，但不能改变后端数据。

### 6.4 状态体验

- 所有页面处理 loading、error、empty、permission denied。
- 展示后端业务错误码和原因，不吞掉容量满、冲突、阶段关闭等失败原因。
- 不在前端伪造成功状态；必须等待后端返回。

## 7. 禁止事项

成员 4 不得做：

```text
1. 修改后端选课事务、容量、冲突、先修、学分校验。
2. 在前端自行决定选课成功。
3. 前端本地直接把课程标记为已选而不等待后端确认。
4. 发送 student_id/studentId 指定学生身份。
5. 调用文档未定义接口。
6. 实现教师名单、教务阶段管理、手动加课或 AI 面板完整逻辑。
7. 修改 Prisma schema 或新增业务表。
8. 修改 A/B/D/E/F 组页面或逻辑。
```

## 8. 推荐 AI 工作流

### 8.1 开始任务

给 AI 的开场提示建议：

```text
使用 $stss-c-course-selection 和 $stss-c-member4-frontend-student。
本次只处理 C 组学生端前端，不改后端业务事务，不做教师/教务/AI 页面。
请先对齐 C API 的学生端接口和 frontend course-selection README。
```

### 8.2 拆分实现

推荐拆成这些任务：

1. “检查学生端 types/api client 与 C API 文档是否一致，只给出前端需要改的点。”
2. “完善培养方案页面和 CreditProgressCard，处理 loading/error/empty。”
3. “完善课程搜索与可选课程表格，展示 `eligibility.reasons`。”
4. “接入选课/退选 mutation，但不在前端决定成功；展示后端错误。”
5. “完善本人选课结果和课表页面，支持筛选和缺失排课提示。”
6. “做一次移动端和桌面端 UI 扫描，修正文本溢出和操作按钮状态。”

### 8.3 AI 输出复核

每轮修改后检查：

- 是否改了后端复杂业务。
- 是否发送了 `student_id`。
- 是否调用了未定义 API。
- 是否伪造选课成功状态。
- 是否误改教师/教务/AI 页面。
- 是否保留后端未实现时的错误展示，不把 501 当空数据。

## 9. 验证要求

必须通过 Docker wrapper。

前端标准命令：

```bash
CODEX_DOCKER_SERVICE=web CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
```

如改动共享类型或后端 API 类型，由负责人或对应后端成员补跑：

```bash
CODEX_DOCKER_SERVICE=server CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

建议手动验证：

```text
1. /selection/curriculum 能展示培养方案和学分进展。
2. /selection/courses 能搜索课程、查看详情、展示 eligibility.reasons。
3. 选课和退选按钮等待后端响应，成功后刷新数据，失败时展示后端原因。
4. /selection/timetable 能展示课表和缺失排课项。
5. 后端 501 或权限错误时，页面展示明确错误而不是假空数据。
```

## 10. 交付说明模板

提交或交接时必须说明：

```text
1. 修改文件清单和每个文件作用。
2. 完成的 FR-C 编号。
3. 是否只涉及学生端前端。
4. 是否修改 API client 或类型。
5. 是否修改后端、教师/教务/AI 页面或非 C 组文件。
6. 是否修改数据库或 Prisma schema。
7. 新增或保留的 TODO。
8. 实际执行的 Docker wrapper 命令和结果。
9. 手动测试步骤。
10. 依赖后端或其他成员完成的事项。
```
