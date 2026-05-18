# 智能选课（Course Selection）后端模块说明

## 1. 目标与范围

本模块围绕 SRS `FR-C-01 ~ FR-C-43` 和接口文档建立统一的后端能力：学生查看培养方案、课程搜索与详情、选课/退课事务、本人结果与课表、教师名单、选课阶段管理、AI 辅助查询。  
模块不新增任何业务表，全部依赖既有数据库实体（`Course`/`CourseOffering`/`Enrollment`/`SelectionPeriod` 等）。

## 2. 子模块职责、权限、事务与依赖

### C1 培养方案与学分进展
- 文件：`curriculum.controller.ts`、`curriculum.service.ts`
- 职责：返回学生可见培养方案、课程清单与进度汇总（`FR-C-01` ~ `FR-C-07`）。
- 权限：学生本人。
- 事务要求：仅查询类，不做写操作。
- 依赖对象：`Student`、`Curriculum`、`CurriculumCourse`、`Course`、`Enrollment`（`CourseType`、`EnrollmentStatus` 聚合）。
- 禁区：不得新增课程/培养方案副本。

### C2 课程搜索与课程详情
- 文件：`course-search.controller.ts`、`course-search.service.ts`
- 职责：课程检索、开课列表、课程开设详情（`FR-C-08` ~ `FR-C-12`）。
- 权限：学生访问（课程列表/详情）与服务端分页、筛选参数处理。
- 事务要求：读操作，不包含持久化更新。
- 依赖对象：`Course`、`CourseOffering`、`Teacher`、`Schedule`、`CoursePrerequisite`。

### C3 选课与退选核心事务
- 文件：`enrollment.controller.ts`、`enrollment.service.ts`
- 职责：`POST /enrollments`、`PATCH /enrollments/:id/drop`（`FR-C-13` ~ `FR-C-23`）。
- 权限：`student`。
- 事务要求（NFR-C-04、NFR-C-05）：
  - 服务端时间和当前有效 `SelectionPeriod` 校验（`FR-C-14`, `FR-C-32`）。
  - 课程开设状态、容量、重复、学分、先修、时间冲突校验（`FR-C-16` ~ `FR-C-20`）。
  - 入库与 `CourseOffering.enrolled_count` 同事务更新（`FR-C-17` ~ `FR-C-22`）。
  - 退选只改状态，不删历史记录（`FR-C-21`）。
- 依赖对象：`Enrollment`、`CourseOffering`、`SelectionPeriod`、`Schedule`。

### C4 结果查询与教师名单
- 文件：`timetable.controller.ts`、`timetable.service.ts`、`roster.controller.ts`、`roster.service.ts`
- 职责：`GET /enrollments/me`、本人课表、教师课程名单、名单导出接口（`FR-C-24` ~ `FR-C-29`）。
- 权限：
  - 学生只能查本人；教师仅查本人任课课程；管理员按授权范围访问。
- 事务要求：读取类；导出必须与后台 `Enrollment` 状态一致。
- 依赖对象：`Enrollment`、`CourseOffering`、`Schedule`、`Student`、`Course`。

### C5 选课管理与管理员操作
- 文件：`selection-period.controller.ts`、`selection-period.service.ts`
- 职责：阶段管理、手动加课（`FR-C-30` ~ `FR-C-37`）。
- 权限：`admin`、`super_admin`。
- 事务要求（NFR-C-12）：
  - 阶段变更需校验时序、冲突与激活状态。
  - 手动加课沿用 `C3` 所有校验链路，不得绕过容量和冲突规则（`FR-C-33`、`FR-C-34`）。
- 依赖对象：`SelectionPeriod`、`Enrollment`、`CourseOffering`、`Student`。

### C6 AI 辅助查询
- 文件：`ai-advisor.controller.ts`、`ai-advisor.service.ts`
- 职责：推荐与解释接口（`FR-C-38` ~ `FR-C-43`）。
- 权限：学生。
- AI 边界：仅读与解释，不得落库、不得覆盖硬性规则；服务失败不得阻断正常流程（`FR-C-40` ~ `FR-C-42`、`NFR-C-09` ~ `NFR-C-11`）。
- 依赖对象：`Curriculum`、`Enrollment`、`CourseOffering`、`SelectionPeriod`。

## 3. 统一接口命名与路由边界

- 所有学生接口基座：`/api/v1/course-selection`
- 路由与职责映射：
  - `/curriculum/me`、`/curriculum/me/progress` → `C1`
  - `/courses`、`/offerings`、`/offerings/available`、`/offerings/:id` → `C2`
  - `/enrollments`、`/enrollments/:id/drop` → `C3`
  - `/enrollments/me`、`/timetable/me` → `C4`
  - `/teacher/offerings/:id/roster`、`/teacher/offerings/:id/roster/export` → `C4`
  - `/admin/periods`、`/admin/periods/:id`、`/admin/enrollments` → `C5`
  - `/ai-advisor/recommend`、`/ai-advisor/explain` → `C6`

## 4. 对接说明（组内职责）

### 成员 1（C1 + C2）
- 负责：`curriculum.*`、`course-search.*`、`course-selection.schemas.ts`（查询类片段）、`course-selection.types.ts`（共享 DTO 的 C1/C2 部分）
- 目标：
  - `FR-C-01 ~ FR-C-07`、`FR-C-08 ~ FR-C-12`
  - 输出学生培养方案与可选课程原因；
  - 输出课程详情与筛选结果；
  - 禁止新增课程/培养方案副本。

### 成员 2（C3）
- 负责：`enrollment.controller.ts`、`enrollment.service.ts`
- 目标：
  - `FR-C-14 ~ FR-C-23`
  - 实现选课/退选事务一致性与 `enrolled_count` 同步；
  - 输出明确错误码与失败原因，不能退化到前端校验。

### 成员 3（C4 + C5）
- 负责：`selection-period.*`、`roster.*`、`timetable.*`
- 目标：
  - `FR-C-24 ~ FR-C-29`（结果与名单）
  - `FR-C-30 ~ FR-C-37`（阶段与手动加课）
  - 保持手动加课与阶段变更合规校验与审计边界。

### 成员 4（学生端前端）
- 负责：学生端培养方案、课程搜索、选课结果和课表页面的前端文件；后端 README 仅记录其对接边界。
- 目标：
  - 对接 C1/C2/C3/C4 后端接口；
  - 前端仅展示后端返回的状态和错误原因，不替代后端事务校验；
  - 选课、退选、课表和结果页面的完整交互以 `docs/tasks/C-work-breakdown.md` 为准。

### 成员 5（教师/教务前端 + AI 面板）
- 负责：教师名单、教务阶段管理、手动加课、AI 推荐展示的前端文件；后端 C6 接口骨架由负责人预留，具体实现按成员任务拆分。
- 目标：
  - 对接 C4/C5/C6 后端接口；
  - AI 仅展示“解释与建议”，不参与 Enrollment 写入；
  - 在异常降级时返回可见提示，保留常规流程能力。

本 README 只说明后端模块边界；成员分工以 `docs/tasks/C-work-breakdown.md` 和 `.agents/skills/stss-c-member*/SKILL.md` 为准。

## 5. 验收检查（负责人合并前）

- 不新增数据库业务表；
- 选课/退选与手动加课入库必须在服务层事务内完成；
- 学生只能操作本人身份范围；
- AI 不直接写入 `Enrollment`；
- 导出内容与选课结果一致，来自有效 `Enrollment` 状态。
