# 智能选课（Smart Course Selection）前端模块说明

## 1. 任务边界与职责

本模块前端负责：
- 学生培养方案查看与学分进展展示；
- 学生课程搜索/详情/可选课程列表；
- 选课与退选入口（提交请求）；
- 本人选课结果与课表展示；
- 教师名单查询与导出入口；
- 教务阶段管理与手动加课入口；
- AI 推荐与解释 UI（仅展示，不落库）。

前端不承担数据库规则计算，不执行最终事务校验；所有硬性约束由后端返回。

## 2. 统一接口命名与权限边界

- 基础接口前缀：`/api/v1/course-selection`
- 学生端：`student`（课程列表/详情、推荐、培养方案、选课与退选、课表）
- 教师端：`teacher`（课程名单查询/导出）
- 教务端：当前路由角色使用 `admin`、`super_admin`；C API 语义角色为 `academic_admin`，后续应按 `Admin.adminType = ACADEMIC` 或等价授权收紧阶段管理、手动加课。
- 通用：前端不上传 `studentId` 作为可信身份依据，所有请求默认由 `req.user` 派生。

## 3. 交易与一致性约定（UI 层）

### 学生端
- 所有选课/退课结果采用接口返回，不用前端计算“通过/不通过”；
- 仅展示操作结果与错误提示。

### AI
- AI 仅展示“建议/解释”：
  - 不在 UI 自动发起 Enrollment 创建/更新；
  - AI 失败不影响 `/courses`、`/offerings`、`/enrollments`、`/timetable/me` 基础能力；
  - 页面始终保留“仅供参考”说明（`NFR-C-10`）。

### 导入与展示
- 名单导出、课表、选课记录统一依据后端返回，不本地生成主状态。

## 4. 前端文件职责

- `api/`
  - `client.ts`：课程选课服务请求封装；
  - `courses.ts`：课程与开设查询接口；
  - `curriculum.ts`：培养方案与进度；
  - `enrollments.ts`：选课/退课/课表；
  - `periods.ts`：阶段管理与手动加课；
  - `roster.ts`：教师名单与导出；
  - `ai-advisor.ts`：AI 推荐/解释；
- `types/`：每条接口响应/请求的前端结构；
- `hooks/`：查询、变更、AI 请求；
- `components/`：列表、详情抽屉、课表、AI 面板；
- `pages/`：学生端/教师端/教务端页面入口。

## 5. 页面与接口映射

- `StudentCourseSelectionPage`
  - 对接：`coursesApi`、`curriculumApi.getMyCurriculumProgress`、`useAvailableOfferings`、`useMyEnrollments`、`coursesApi.getOfferingDetail`
  - 需求：`FR-C-04 ~ FR-C-22`（查询 + 提交入口 + UI 预警）
- `StudentCurriculumPage`
  - 对接：`curriculumApi.getMyCurriculum`、`curriculumApi.getMyCurriculumProgress`
  - 需求：`FR-C-01 ~ FR-C-07`
- `StudentTimetablePage`
  - 对接：`enrollmentsApi.getMyTimetable`、`useMyEnrollments`
  - 需求：`FR-C-25 ~ FR-C-29`
- `AdminSelectionPeriodPage`
  - 对接：`useSelectionPeriods`、`useUpsertSelectionPeriod`
  - 需求：`FR-C-30 ~ FR-C-32`
- `AdminManualEnrollmentPage`
  - 对接：`useUpsertSelectionPeriod.manualEnroll`
  - 需求：`FR-C-33 ~ FR-C-34`
- `TeacherRosterPage`
  - 对接：`rosterApi.getOfferingRoster`、`rosterApi.exportOfferingRoster`
  - 需求：`FR-C-27 ~ FR-C-28`
- `CourseSelectionAiPage`
  - 对接：`useAiAdvisor.recommend`、`useAiAdvisor.explain`
  - 需求：`FR-C-38 ~ FR-C-43`

## 6. 成员工作指导（除负责人）

### 成员 4（学生端前端）
- 页面：`StudentCourseSelectionPage`、`StudentCurriculumPage`、`StudentTimetablePage`
- 组件：`CourseOfferingTable`、`CourseDetailDrawer`、`CreditProgressCard`、`TimetableGrid`
- 相关 API/hooks/types：`courses.ts`、`curriculum.ts`、`enrollments.ts`、`useAvailableOfferings`、`useMyEnrollments`、学生端类型。
- 目标：
  - 完成培养方案、课程搜索、详情查看、选课/退选入口、结果和课表展示；
  - 严格保持“前端预校验 + 后端裁判权”；
  - 所有 TODO 保留 FR/CFR 编号和实现说明。

### 成员 5（教师/教务端前端 + AI 面板）
- 页面：`TeacherRosterPage`、`AdminSelectionPeriodPage`、`AdminManualEnrollmentPage`、`CourseSelectionAiPage`
- 组件：`AiAdvisorPanel`、`SelectionPeriodStatusTag`
- 相关 API/hooks/types：`roster.ts`、`periods.ts`、`ai-advisor.ts`、教师/教务/AI 类型。
- 目标：
  - 完成课程名单查询与导出体验；
  - 完成阶段管理和手动加课表单；
  - 完善 AI 建议/解释展示，不引导自动选课；
  - 与后端错误码联动提示并支持降级说明。

### C 组负责人（边界复核）
- 目标：
  - 审核所有 TODO 与接口约束是否绑定 `FR-C-xx`/`NFR-C-xx`；
  - 对接 `hooks/api/types` 的类型命名一致性；
  - 梳理页面路由权限与菜单展示的一致性。

## 7. 本轮交付状态

- 本框架仅包含接口骨架与清晰 TODO；数据库表、事务规则、并发控制、筛选与导出结果等逻辑需在后续实现里完成；
- 所有成员在开发时保持：
  - 不新增课程业务表；
  - 任何选课判定最终以后端响应为准；
  - AI 仅“建议/解释”。
