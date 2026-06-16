# C 组智能选课模块设计说明

> 模块：Smart Course Selection / 智能选课<br>
> 代码目录：`backend/src/modules/course-selection/`、`frontend/src/modules/course-selection/`<br>
> 适用分支：`dev/C`<br>
> 本文用于指导 C 组负责人、组员和 coding agent 搭建与实现 C 组子模块。API 详细契约由 `docs/apis/C-smart-course-selection.md` 维护；本文只规定架构、边界、硬性规则和实现约束。

## 1. 设计依据与优先级

C 组实现必须以以下材料为准，优先级从高到低：

1. `docs/project-requirements.md`、`docs/database-design.md` 和 Prisma schema 中已有数据模型。
2. `docs/srs/C-smart-course-selection-srs.md`，即 C 组 SRS。
3. `docs/apis/shared.md` 与 `docs/apis/C-smart-course-selection.md`。
4. `docs/development-specifications.md` 中的项目结构、分支和代码规范。
5. `docs/tasks/C-work-breakdown.md` 与 `docs/agent-guides/C-coding-agent-guidelines.md`。
6. 当前仓库中 A/B/D/F 组已形成的模块风格。
7. coding agent 的建议和自动生成结果。

业务需求以 C 组 SRS 为准，但不得擅自突破数据库设计新增表或字段；接口字段、权限和错误结构以 shared/C 组 API 文档为准。如 SRS 中的需求编号与本文 TODO 编号不一致，以 SRS 为准，但业务边界和硬性规则不得改变。

## 2. 模块目标与边界

C 组负责在选课时间窗口内，为学生提供培养方案查看、课程搜索、可选课程显示、选课、退选、结果查询、课表查看和 AI 辅助建议；为教师提供课程学生名单查询和导出；为教务管理人员提供选课阶段控制、特殊加课和并发准入控制。

| 类型 | 内容 |
|---|---|
| 范围内 | 培养方案查看、学分进展、课程搜索、课程详情、可选课程列表、学生选课/退选、选课结果、个人课表、教师名单导出、选课阶段管理、手动加课、连接数控制、长时间无操作强制退出、AI 辅助选课。 |
| 范围外 | 用户、角色、学生、教师、课程主数据维护；教室资源和排课算法；论坛；在线测试；正式成绩录入、GPA 和成绩分析。 |
| 核心原则 | C 组只消费 A/B/F 组提供的主数据和结果数据，不维护其副本；所有最终选课结果必须以后端事务校验为准。 |

## 3. 核心数据对象

C 组不得新增未在数据库设计或 SRS 中出现的业务表。实现时优先使用以下对象：

| 对象 | C 组用途 |
|---|---|
| `Student` | 确认当前登录学生身份、专业、年级、班级，用于匹配培养方案和限定本人数据。 |
| `Teacher` | 确认任课教师身份，用于名单查询和导出权限判断。 |
| `Course` | 课程代码、名称、学分、类型、描述、考核方式、状态等。 |
| `CourseOffering` | 某学期某课程的具体开课实例，包含教师、容量、已选人数、状态。 |
| `Schedule` | 课程时间、周次、节次、教室，用于课表展示和时间冲突判断。 |
| `Curriculum` | 专业培养方案，总学分、必修/选修要求、适用年级等。 |
| `CurriculumCourse` | 培养方案与课程关系，课程类别和建议修读学期。 |
| `CoursePrerequisite` | 先修课程约束。 |
| `Enrollment` | 学生选课记录，维护已选、退选、撤销等状态。 |
| `SelectionPeriod` | 初选、补退选、调整阶段的时间窗口、启用状态和最大学分。 |
| `Semester` | 当前学期和课程开设所属学期。 |

成绩或已修通过信息可由 F 组提供，C 组只读取用于先修课判断，不负责成绩录入、GPA 或成绩分析。

## 4. 推荐后端结构

```text
backend/src/modules/course-selection/
├── course-selection.routes.ts
├── course-selection.schemas.ts
├── course-selection.types.ts
├── course-search.controller.ts
├── course-search.service.ts
├── curriculum.controller.ts
├── curriculum.service.ts
├── enrollment.controller.ts
├── enrollment.service.ts
├── selection-period.controller.ts
├── selection-period.service.ts
├── timetable.controller.ts
├── timetable.service.ts
├── roster.controller.ts
├── roster.service.ts
├── ai-advisor.controller.ts
├── ai-advisor.service.ts
└── README.md
```

后端职责划分如下：

| 文件 | 职责 |
|---|---|
| `course-selection.routes.ts` | 统一挂载 C 组路由，接入鉴权、角色限制和参数校验。 |
| `course-selection.schemas.ts` | 定义查询参数、请求体、路径参数校验。 |
| `course-selection.types.ts` | 定义 C 组 DTO、错误码、状态枚举映射和共享类型。 |
| `curriculum.*` | 培养方案、课程类别、建议学期和学分进展。 |
| `course-search.*` | 课程搜索、课程详情、可选课程列表。 |
| `enrollment.*` | 选课、退选、重复选课、容量、冲突、学分、先修和事务一致性。 |
| `timetable.*` | 学生选课结果对应的课表展示。 |
| `roster.*` | 教师课程名单查询和 Excel 导出。 |
| `selection-period.*` | 选课阶段管理、手动加课、连接数控制和超时退出预留。 |
| `ai-advisor.*` | AI 辅助推荐、冲突解释和学分影响说明。 |

路由应统一挂载到：

```text
/api/v1/course-selection
```

学生端接口必须从登录态中获取当前学生，不允许信任前端传入的 `studentId` 来决定查询或操作对象。

## 5. 推荐前端结构

```text
frontend/src/modules/course-selection/
├── api/
│   ├── client.ts
│   ├── courses.ts
│   ├── curriculum.ts
│   ├── enrollments.ts
│   ├── periods.ts
│   ├── roster.ts
│   └── ai-advisor.ts
├── pages/
│   ├── StudentCourseSelectionPage.tsx
│   ├── StudentCurriculumPage.tsx
│   ├── StudentTimetablePage.tsx
│   ├── AdminSelectionPeriodPage.tsx
│   ├── AdminManualEnrollmentPage.tsx
│   ├── TeacherRosterPage.tsx
│   └── CourseSelectionAiPage.tsx
├── components/
│   ├── CourseOfferingTable.tsx
│   ├── CourseDetailDrawer.tsx
│   ├── CreditProgressCard.tsx
│   ├── TimetableGrid.tsx
│   ├── SelectionPeriodStatusTag.tsx
│   └── AiAdvisorPanel.tsx
├── hooks/
│   ├── useAvailableOfferings.ts
│   ├── useMyEnrollments.ts
│   ├── useSelectionPeriod.ts
│   └── useAiAdvisor.ts
├── types/
│   ├── course.ts
│   ├── curriculum.ts
│   ├── enrollment.ts
│   ├── period.ts
│   └── ai.ts
└── README.md
```

前端可以进行搜索、筛选、冲突预提示、学分预览和 AI 解释展示，但不得把前端判断作为最终选课结果。所有选课、退选、手动加课和权限判断必须由后端重新校验。

## 6. 子模块划分

| 子模块 | 对应功能域 | 说明 |
|---|---|---|
| C1 培养方案与学分进展 | 培养方案查看 | 展示学生所属培养方案、课程类别、建议学期、总学分和分类学分进度。 |
| C2 课程搜索与详情 | 课程搜索与查看 | 按课程名称、课程代码、教师、学期、课程类型等条件搜索课程开设，展示容量、已选人数和可选原因。 |
| C3 选课/退选核心流程 | 选课功能 | 实现选课事务、退选事务、容量控制、重复选课、课表冲突、最大学分和先修课检查。 |
| C4 结果、课表与名单导出 | 结果查询 | 学生查看本人选课结果和课表；教师查询和导出本人课程学生名单。 |
| C5 选课管理与并发控制 | 选课管理 | 管理初选、补退选、调整阶段；支持手动加课；预留连接数控制和长时间停留强制退出机制。 |
| C6 AI 辅助选课 | AI 辅助 | 生成推荐课程、推荐理由、冲突风险和学分影响说明；不得直接写入选课结果。 |

## 7. API 设计要求

本文件不生成完整 API 契约。`docs/apis/C-smart-course-selection.md` 应根据 SRS 和本文维护，并至少覆盖以下 API 家族：

| API 家族 | 必须覆盖的能力 |
|---|---|
| 培养方案 | 查询当前学生培养方案、学分进展。 |
| 课程搜索 | 搜索课程、查询课程开设、查询课程详情、查询可选课程。 |
| 选课退选 | 查询本人选课记录、提交选课、退选课程。 |
| 课表 | 查询当前学生课表。 |
| 教师名单 | 查询教师本人课程名单、导出 Excel。 |
| 教务管理 | 管理选课阶段、手动加课；预留连接数控制和长时间停留强制退出的接口/文档边界。 |
| AI 辅助 | 生成推荐、解释冲突和学分影响。 |

API 文档生成后，代码实现必须以 API 文档为准；API 文档未生成前，不得在不同 feature 分支中各自发明不兼容的接口。

## 8. 核心业务规则

### 8.1 选课事务

`enrollment.service.ts` 中的选课逻辑必须作为事务实现。至少包含以下步骤：

```text
1. 当前用户必须是 student。
2. 当前必须存在启用的 SelectionPeriod，且服务端当前时间在 [start_time, end_time] 内。
3. CourseOffering 必须处于可选状态。
4. CourseOffering.enrolled_count 必须小于 CourseOffering.capacity。
5. 当前学生不得对同一 CourseOffering 存在有效重复选课记录。
6. 目标课程 Schedule 不得与当前学生已选课程 Schedule 冲突。
7. 当前阶段选课总学分不得超过 SelectionPeriod.max_credits。
8. 若存在 CoursePrerequisite，必须检查先修课是否满足；若暂未接入 F 组数据，应保留 TODO 和错误边界。
9. 创建或更新 Enrollment，并与 CourseOffering.enrolled_count 的增加在同一事务中完成。
```

容量控制不得只依赖前端，也不得先查后改导致并发超选。应使用事务、条件更新、唯一约束或等价机制保证一致性。

### 8.2 退选事务

退选逻辑必须校验：

```text
1. 当前用户只能退选自己的课程。
2. 当前阶段允许退选。
3. 目标 Enrollment 处于有效已选状态。
4. 更新 Enrollment 状态和退选时间。
5. CourseOffering.enrolled_count 与有效 Enrollment 数保持一致。
```

### 8.3 手动加课

教务管理人员可在特殊情况下为学生手动加课，但默认仍需校验学生、课程开设、重复选课、容量、时间冲突和学分限制。任何绕过硬性规则的需求必须由 C 组负责人确认并写入文档，不得由 agent 自行实现。

### 8.4 教师名单导出

教师只能查看或导出本人任课课程的学生名单。`academic_admin` 如需查看或导出必须由 API 文档明确授权；`system_admin` 不默认替代教务权限。导出内容应来自有效选课记录，不能从前端缓存生成。

### 8.5 AI 辅助选课

AI 只做推荐、排序和解释。AI 输出不得直接写入 `Enrollment`，不得绕过容量、时间冲突、选课阶段、先修课、最大学分和权限边界。AI 服务失败时，普通搜索、选课、退选和结果查询仍应可用。

### 8.6 并发与超时

系统应支持至少 200 名在线用户同时使用选课服务。连接数控制和长时间无操作强制退出可以先以接口、服务和 TODO 形式预留，但不得影响已成功保存的选课记录。

## 9. 权限边界

| 场景 | 权限规则 |
|---|---|
| 学生查看培养方案 | 只能查看与当前登录学生相关的数据。 |
| 学生选课/退选 | 只能操作当前登录学生自己的选课记录。 |
| 学生查看结果/课表 | 只能查看本人结果和课表。 |
| 教师查看名单 | 只能查看本人任课课程；当前 API 不提供 admin/super_admin 例外。语义角色 `academic_admin` 如需查看必须由 API 文档明确授权，并同步补充权限映射与审计要求。 |
| 教务管理阶段 | 语义角色为 `academic_admin`；当前路由仍使用现有 `admin`/`super_admin` 角色码作为入口保护，后续应结合 `Admin.adminType = ACADEMIC` 或等价授权判断收紧。 |
| 手动加课 | 语义角色为 `academic_admin`，必须记录原因；当前路由仍使用现有 `admin`/`super_admin` 角色码作为入口保护，后续应结合 `Admin.adminType = ACADEMIC` 或等价授权判断收紧。 |
| AI 辅助 | 仅使用当前用户可见数据生成建议。 |

角色映射说明：C API/SRS 中的 `academic_admin` 是业务语义角色；当前项目实际鉴权角色码为 `admin`、`super_admin`，并通过 `Admin.adminType` 区分 `ACADEMIC`、`SUPER`、`SECURITY`。在没有独立 `academic_admin` role code 前，路由层可以继续使用 `admin`/`super_admin` 防护，但 C5 服务层必须保留 TODO 或实现 `Admin.adminType = ACADEMIC` / 等价授权校验，避免把系统管理员默认等同为教务管理员。

## 10. TODO 规范

所有未完成业务必须用可分配 TODO 标注，格式如下：

```ts
// TODO(C3, FR-C-14, FR-C-16~FR-C-23): Implement capacity-safe enrollment transaction.
// Required checks: active period, offering status, capacity, duplicate enrollment,
// schedule conflict, max credits, prerequisites, and atomic enrolled_count update.
```

TODO 必须包含：

```text
1. 子模块编号，例如 C1、C2、C3。
2. SRS 需求编号，例如 FR-C-05。
3. 需要完成的业务规则。
4. 不能只写 “todo” 或 “implement later”。
```

## 11. 验收检查清单

C 组模块合并到 `dev/C` 前至少满足：

```text
1. 不新增 SRS/数据库设计之外的业务表。
2. C 组路由统一挂载在 /api/v1/course-selection 下。
3. 学生端接口不信任前端传入 studentId。
4. 选课和退选核心逻辑在后端校验。
5. Enrollment 与 CourseOffering.enrolled_count 保持一致。
6. AI 不直接写 Enrollment。
7. 教师名单导出有任课教师权限判断。
8. 教务手动加课有角色判断和原因记录。
9. 复杂业务未实现处有明确 TODO。
10. 不大规模修改 A/B/D/E/F 组代码。
```
