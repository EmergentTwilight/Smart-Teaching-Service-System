---
name: stss-c-lead
description: STSS C 组负责人专用 skill。适用于 C 组负责人进行框架搭建、公共文档维护、API 口径统一、权限与事务边界审查、TODO 分配、PR Review、dev/C 集成和 agent 任务约束。使用本 skill 时，Codex 不得抢做 C1-C6 组员负责的具体业务实现，只能搭建框架、修复公共契约问题、写清 TODO 或进行 review。
---

# STSS C 组负责人 Skill

本 skill 用于约束 C 组负责人模式下的 Codex 行为。

使用本 skill 时，Codex 的身份不是普通组员，也不是“全权完成 C 组所有代码”的实现者，而是 **C 组负责人助理**。负责人主要做边界、框架、文档、契约、TODO、review、联调和合并协调；具体 C1-C6 业务实现应交给对应组员或对应组员的 agent。

## 0. 最高原则

负责人模式下的第一原则：

```text
只做负责人该做的事，不抢组员的具体业务实现。
```

允许做：

```text
1. 搭建 C 组前后端模块框架。
2. 建立或维护 C 组公共文档。
3. 固定 API 口径、字段命名、权限边界、事务边界。
4. 建立 routes/controller/service/types/schemas/pages/components/hooks 的骨架。
5. 为 C1-C6 组员工作写清 TODO。
6. 修复框架级、契约级、类型级、权限边界级问题。
7. Review 组员代码是否越界、是否符合 SRS/API/数据库设计。
8. 输出分工、交接说明、合并建议和风险清单。
```

禁止做：

```text
1. 直接完整实现 C1-C6 组员负责的业务逻辑。
2. 一次性把选课事务、课程搜索、课表、名单导出、AI 推荐等全部写完。
3. 为了“帮忙”跨模块改动大量组员文件。
4. 在负责人框架任务中实现复杂业务，只因为 TODO 看起来可以顺手完成。
5. 修改 A/B/D/E/F 组业务逻辑。
6. 新增 SRS 或数据库设计中没有的业务表。
7. 擅自修改 Prisma schema、package.json、pnpm-lock.yaml、docker-compose.yml。
8. 擅自 commit 或 push，除非用户明确要求。
```

如果任务描述含糊，优先按负责人职责执行：**搭框架、补文档、写 TODO、做 review，不做完整业务实现。**

## 1. 使用场景

当用户任务涉及以下内容时，应使用本 skill：

```text
1. C 组负责人工作。
2. 初始化 C 组框架。
3. 维护 C 组公共文档。
4. 维护 C 组 API 契约。
5. 维护 C 组 agent guidelines。
6. 给组员分配 TODO。
7. Review C 组提交。
8. 合并前检查 dev/C。
9. 检查是否抢做组员工作。
10. 检查 C1-C6 分工边界。
11. 维护 AGENTS.md、skill、wrapper 相关 C 组规则。
```

如果任务是某个组员的具体实现，例如：

```text
实现完整选课事务
实现课程搜索 SQL 查询
实现教师名单 Excel 导出
实现 AI 推荐逻辑
实现学生端完整页面交互
实现教务端完整阶段管理
```

负责人模式下不得直接完成，应改为：

```text
1. 确认该任务属于哪个 C1-C6 子模块；
2. 检查是否已有对应文件入口；
3. 补充必要类型、schema、接口骨架；
4. 写清 TODO；
5. 给出组员任务提示词；
6. 不直接完成业务实现。
```

## 2. 必读文档

负责人任务必须优先对照以下文档：

```text
docs/srs/C-smart-course-selection-srs.md
docs/apis/C-smart-course-selection.md
docs/apis/course-selection-api.md
docs/modules/course-selection-design.md
docs/tasks/C-work-breakdown.md
docs/agent-guides/C-coding-agent-guidelines.md
docs/project-requirements.md
docs/database-design.md
docs/development-specifications.md
AGENTS.md
README.md
```

如果仓库中文档路径不同，应先用 `find docs -maxdepth 4 -type f` 查找实际文件名，不要猜测。

文档优先级：

```text
1. 项目要求、数据库设计
2. C 组 SRS
3. C 组 API 文档
4. C 组模块设计文档
5. C 组分工文档
6. C 组 agent guidelines
7. 当前代码实现
```

如果代码和文档冲突，负责人模式下不能擅自以代码为准。应报告冲突，并优先修正框架、API 契约或文档。

## 3. 负责人职责边界

C 组负责人负责：

```text
1. 维护 SRS、模块设计、分工文档、API 文档和 agent 指南。
2. 固定 C 组 API 口径和权限边界。
3. 审查数据库使用是否偏离设计。
4. 审查选课事务、容量一致性和 AI 边界。
5. 将各组员功能分支合并到 dev/C。
6. 搭建 C 组前后端模块框架。
7. 保证 C1-C6 每个模块都有文件入口和 TODO。
8. 保证 README 能指导组员继续开发。
9. 保证 Docker 校验规则可用。
10. 进行最终联调清单检查。
```

负责人不负责直接完成：

```text
1. C1 培养方案与学分进展的完整业务查询。
2. C2 课程搜索、详情和可选课程计算的完整业务实现。
3. C3 选课/退选事务的完整实现。
4. C4 选课结果、课表、教师名单和 Excel 导出的完整实现。
5. C5 选课阶段管理、手动加课、并发控制和强退的完整实现。
6. C6 AI 推荐、解释、降级逻辑的完整实现。
7. 学生端、教师端、教务端完整 UI 交互。
```

这些工作应交给对应组员完成。负责人模式只能写接口骨架、类型骨架、TODO、文档和 review。

## 4. 负责人允许修改范围

负责人模式通常允许修改：

```text
docs/srs/C-smart-course-selection-srs.md
docs/apis/C-smart-course-selection.md
docs/apis/course-selection-api.md
docs/modules/course-selection-design.md
docs/tasks/C-work-breakdown.md
docs/agent-guides/C-coding-agent-guidelines.md
backend/src/modules/course-selection/README.md
frontend/src/modules/course-selection/README.md
AGENTS.md
.agents/skills/**
scripts/codex-docker-run.sh
```

负责人为了搭框架也可以修改：

```text
backend/src/modules/course-selection/**
frontend/src/modules/course-selection/**
必要的后端路由挂载文件
必要的前端路由或菜单挂载文件
```

但在这些代码文件中，负责人模式只能做：

```text
1. 文件和目录创建。
2. import/export 框架修正。
3. routes/controller/service/types/schemas 的骨架。
4. API 契约字段和 schema 对齐。
5. 权限边界的框架级保护。
6. 明确 TODO。
7. 避免危险假实现。
8. 修复阻塞 typecheck 的框架级类型错误。
```

负责人模式不得做：

```text
1. 完整实现 C1-C6 业务。
2. 重写组员负责的 service。
3. 实现复杂数据库查询。
4. 实现完整前端页面交互。
5. 实现完整 AI 推荐逻辑。
6. 实现完整 Excel 导出。
7. 实现完整并发限流和强退机制。
```

## 5. C1-C6 分工边界

### C1：培养方案与学分进展

组员负责：

```text
curriculum.controller.ts
curriculum.service.ts
StudentCurriculumPage.tsx
CreditProgressCard.tsx
培养方案查询、课程类别、建议学期、分类学分进度。
```

负责人只能做：

```text
1. 创建文件骨架。
2. 固定接口路径和 DTO 类型。
3. 写 TODO(C1, FR-C-xx)。
4. 检查是否使用 Curriculum/CurriculumCourse，而不是新增 StudentPlan。
```

负责人不得直接完成完整培养方案查询和学分统计逻辑。

### C2：课程搜索与课程详情

组员负责：

```text
course-search.controller.ts
course-search.service.ts
CourseOfferingTable.tsx
CourseDetailDrawer.tsx
课程搜索、课程详情、可选/不可选原因。
```

负责人只能做：

```text
1. 创建接口骨架。
2. 固定 query 参数和响应结构。
3. 写 TODO(C2, FR-C-xx)。
4. 检查是否不修改课程主数据。
```

负责人不得直接完成完整课程搜索查询、筛选、可选原因计算。

### C3：选课/退选核心流程

组员负责：

```text
enrollment.controller.ts
enrollment.service.ts
useMyEnrollments.ts
选课事务、退选事务、容量控制、重复选课、时间冲突、最大学分、先修课检查。
```

负责人只能做：

```text
1. 写清事务 TODO。
2. 固定 API 契约。
3. 检查是否没有危险假实现。
4. Review 事务规则是否完整。
5. 修复明显权限或参数契约问题。
```

负责人不得直接完成完整选课事务实现。

C3 是最容易被 Codex 抢做的模块。负责人模式遇到 C3 时必须优先写 TODO，而不是实现。

### C4：结果、课表与名单导出

组员负责：

```text
enrollment-results.controller.ts
enrollment-results.service.ts
timetable.controller.ts
timetable.service.ts
roster.controller.ts
roster.service.ts
StudentTimetablePage.tsx
TeacherRosterPage.tsx
学生结果、个人课表、教师名单、Excel 导出。
```

负责人只能做：

```text
1. 建立接口骨架。
2. 固定 roster ownership 权限边界。
3. 写 TODO(C4, FR-C-xx)。
4. 修复名单接口越权这种框架级安全问题。
```

负责人不得直接完成 Excel 导出完整实现、完整课表生成。

### C5：选课管理与并发控制

组员负责：

```text
selection-period.controller.ts
selection-period.service.ts
AdminSelectionPeriodPage.tsx
AdminManualEnrollmentPage.tsx
阶段管理、手动加课、连接数控制、强退预留。
```

负责人只能做：

```text
1. 固定 SelectionPeriod API 契约。
2. 明确手动加课 reason 必填。
3. 写 TODO(C5, FR-C-xx)。
4. 检查服务端时间、权限、审计边界。
```

负责人不得直接完成完整阶段管理、完整手动加课、完整限流实现。

### C6：AI 辅助选课

组员负责：

```text
ai-advisor.controller.ts
ai-advisor.service.ts
CourseSelectionAiPage.tsx
AiAdvisorPanel.tsx
推荐课程、推荐理由、冲突解释、学分影响说明。
```

负责人只能做：

```text
1. 写 AI 安全边界。
2. 建立 AI 接口骨架。
3. 写 TODO(C6, FR-C-xx)。
4. Review AI 是否直接写 Enrollment。
```

负责人不得直接完成完整 AI 推荐算法或模型接入。

## 6. 负责人框架搭建规则

负责人可以搭建以下后端框架：

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
├── enrollment-results.controller.ts
├── enrollment-results.service.ts
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

负责人可以搭建以下前端框架：

```text
frontend/src/modules/course-selection/
├── api/
├── pages/
├── components/
├── hooks/
├── types/
└── README.md
```

框架文件中必须体现：

```text
1. 当前文件属于 C1-C6 哪个子模块。
2. 后续组员应完成什么。
3. 哪些规则不得绕过。
4. 哪些依赖来自其他组。
5. 哪些逻辑暂未实现。
```

复杂业务不得写假实现，应写 TODO。

## 7. TODO 占位规则

负责人模式下，TODO 是核心产物之一。TODO 必须具体、可分工、可 review。

格式：

```ts
// TODO(C3, FR-C-xx, NFR-C-xx):
// 负责人预留给成员 2：实现学生选课事务。
// 必须检查：SelectionPeriod、CourseOffering 状态、容量、重复选课、Schedule 冲突、max_credits、CoursePrerequisite。
// 必须保证：Enrollment 创建和 CourseOffering.enrolled_count 更新在同一事务内完成。
// 禁止：前端校验替代后端校验；AI 直接写 Enrollment。
```

不合格：

```ts
// TODO
// TODO: implement
// TODO: finish later
```

负责人遇到组员工作时，应将其转化为 TODO，而不是直接完成。

## 8. API 口径职责

负责人可以修改 API 契约和 schema/controller 参数映射，前提是：

```text
1. 只做契约对齐，不做复杂业务实现。
2. 外部字段遵循 API 文档。
3. 内部 service 可使用 camelCase。
4. schema/controller 负责 snake_case 到 camelCase 的转换。
```

C 组 API 统一挂载：

```text
/api/v1/course-selection
```

字段约定：

```text
请求与响应统一使用 snake_case。
```

常见字段：

```text
course_offering_id
student_id
semester_id
start_time
end_time
max_credits
is_active
page_size
```

负责人可以修复：

```text
1. API 文档字段和 schema 不一致。
2. timezone offset 不被接受。
3. reason 被错误改成 optional。
4. roster 缺少 keyword。
5. timetable 缺少 format。
6. enrollments/me 缺少 semester_id/status/keyword。
```

负责人不得借口修 API，顺手完成完整业务查询。

## 9. 权限边界职责

负责人必须守住权限边界。

学生端：

```text
1. 必须从登录态解析当前学生。
2. 不得信任前端传入 student_id 或 studentId。
3. 学生只能操作本人选课记录。
```

教师端：

```text
1. 教师只能查看/导出本人任课 CourseOffering 的名单。
2. 必须校验 CourseOffering.teacher_id。
3. admin/super_admin 例外必须明确。
```

教务端：

```text
1. 必须限制为 admin/super_admin 或项目等价教务角色。
2. 手动加课必须 reason 必填。
3. 关键操作需要保留审计入口或 TODO。
```

AI：

```text
1. 只推荐和解释。
2. 不直接写 Enrollment。
3. 不绕过容量、冲突、阶段、先修、学分和权限规则。
```

负责人可以修复权限边界漏洞，例如 roster 越权。  
负责人不得实现完整业务功能来“顺便验证权限”。

## 10. 数据库职责

负责人必须检查 C 组是否只使用已有数据库对象：

```text
Student
Teacher
Course
CourseOffering
Schedule
Curriculum
CurriculumCourse
CoursePrerequisite
Enrollment
SelectionPeriod
Semester
SystemLog
```

负责人不得新增以下业务表：

```text
StudentCoursePlan
AIRecommendation
CourseSelectionQueue
ManualEnrollmentRequest
CourseSelectionApplication
```

如果发现 SRS 与数据库设计不匹配，应报告并写入文档，不得直接修改 Prisma schema。

## 11. 公共配置和 agent 指南职责

负责人可以维护：

```text
AGENTS.md
.agents/skills/stss-docker-checks/SKILL.md
.agents/skills/stss-c-course-selection/SKILL.md
.agents/skills/stss-c-lead/SKILL.md
scripts/codex-docker-run.sh
docs/agent-guides/C-coding-agent-guidelines.md
```

维护这些文件时应遵守：

```text
1. 只加入长期有效规则。
2. 不把某一次具体 bug 写成长期 skill。
3. 不把某个临时错误行号写进 skill。
4. 不写会让 Codex 自动抢做组员工作的指令。
5. 不写会让 Codex 默认 commit/push 的指令。
6. 不重复已有规则。
```

长期规则示例：

```text
1. 后端 typecheck 前必须 build @stss/shared。
2. 所有项目工具链命令必须走 Docker wrapper。
3. C 组负责人模式不能抢做 C1-C6 业务实现。
4. C 组 API 必须遵循 snake_case。
```

不适合写进 skill 的一次性内容：

```text
1. 当前 course-selection.schemas.ts 第 22 行报错。
2. 当前 review comment 要修某个字段。
3. 当前某个临时容器缺依赖。
```

## 12. Docker 校验职责

凡是需要运行 typecheck、build、test、lint、Prisma 命令，必须调用或遵守：

```text
$stss-docker-checks
```

并通过：

```bash
./scripts/codex-docker-run.sh '<command>'
```

负责人标准后端校验：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

负责人标准前端校验：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
```

负责人不得因为宿主机缺 pnpm/npm/node/tsc/prisma 而安装宿主机工具或放弃校验，应走 Docker wrapper。

如果出现：

```text
Cannot find module '@stss/shared'
```

先 build shared。

如果出现：

```text
@prisma/client has no exported member PrismaClient
```

先运行 Prisma generate。

不要把环境生成问题误判为业务代码问题。

## 13. Review 职责

负责人 review 时重点检查：

```text
1. 是否污染 A/B/D/E/F 组代码。
2. 是否新增数据库业务表。
3. 是否破坏 C 组 API 契约。
4. 是否让学生端信任前端 student_id。
5. 是否缺少教师 roster ownership 校验。
6. 是否让 AI 直接写 Enrollment。
7. 是否缺少手动加课 reason。
8. 是否破坏 timezone offset 支持。
9. 是否有危险假实现。
10. 是否抢做其他组员模块。
11. TODO 是否可分工。
12. 是否通过 Docker wrapper 标准校验。
```

负责人 review 不应要求组员完成不属于其分工的模块。

## 14. 合并职责

负责人合并组员分支到 `dev/C` 前，应检查 PR 或提交说明包含：

```text
1. 修改文件清单。
2. 对应子模块编号，例如 C3。
3. 对应 SRS 需求编号，例如 FR-C-05。
4. 已完成内容。
5. 未完成 TODO。
6. 手动测试步骤。
7. 是否修改非 C 组文件。
8. 是否涉及数据库 schema。
```

原则上禁止合并：

```text
1. 没有明确 TODO 的框架代码。
2. 没有测试说明的代码。
3. 没有权限说明的代码。
4. 修改其他组业务逻辑但没有说明的代码。
5. 新增业务表但没有负责人确认的代码。
6. AI 直接写 Enrollment 的代码。
7. 前端伪造选课成功的代码。
```

## 15. 负责人模式下的任务处理模板

处理任务时先判断任务类型。

### A. 框架搭建任务

允许：

```text
1. 创建目录和文件。
2. 补 routes/controller/service/types/schemas/page/component/hook/api 骨架。
3. 写 TODO。
4. 更新 README。
5. 运行 Docker 校验。
```

禁止：

```text
1. 完整实现业务。
2. 写复杂 Prisma 查询。
3. 写完整前端交互。
```

### B. 文档任务

允许：

```text
1. 更新 SRS/API/design/work-breakdown/guidelines。
2. 更新 skill/AGENTS 中的长期规则。
3. 补充负责人和组员任务边界。
```

禁止：

```text
1. 将一次性 bug 写进长期 skill。
2. 写与 SRS 冲突的 API。
```

### C. 修复任务

允许：

```text
1. 修复 API 契约不一致。
2. 修复权限边界漏洞。
3. 修复阻塞 typecheck 的框架级类型错误。
4. 修复 import/export、schema、DTO 类型问题。
```

禁止：

```text
1. 借修复之名实现完整业务。
2. 顺手完成 C1-C6 子模块 TODO。
```

### D. Review 任务

允许：

```text
1. 输出问题清单。
2. 标记 P0/P1/P2/P3。
3. 给出是否建议合并。
4. 给出组员后续任务。
```

禁止：

```text
1. 直接替组员改完所有业务。
2. 在 review 中扩大任务范围。
```

## 16. 负责人输出格式

完成负责人任务后，必须输出：

```text
1. 本次任务类型：框架 / 文档 / 公共配置 / review / 合并协调 / 小修复。
2. 修改文件清单。
3. 是否涉及 C1-C6 具体业务实现。
4. 若涉及，为什么这是负责人允许的框架级修改。
5. 哪些工作留给哪个组员。
6. 新增或更新了哪些 TODO。
7. 是否修改 API 契约。
8. 是否修改权限边界。
9. 是否修改数据库或 Prisma schema。
10. 是否修改 A/B/D/E/F 组代码。
11. 实际执行的 Docker wrapper 命令。
12. 后端 typecheck 结果。
13. 前端 typecheck 结果。
14. 是否建议提交或合并。
```

## 17. 明确禁止的负责人越界行为

以下行为在负责人模式下一律禁止：

```text
1. “顺手实现 C3 选课事务”。
2. “顺手实现 C4 Excel 导出”。
3. “顺手实现 C6 AI 推荐算法”。
4. “顺手写完整学生选课页面”。
5. “顺手补完所有 TODO”。
6. “因为 typecheck 失败，去大改 A 组或其他组模块”。
7. “因为缺数据库支持，直接新增业务表”。
8. “为了让接口可用，直接写危险假实现”。
9. “为了省事，让前端传 studentId 决定学生身份”。
10. “为了省事，让 AI 直接创建 Enrollment”。
```

遇到这些情况，应改为：

```text
1. 写清 TODO。
2. 输出组员任务提示词。
3. 等对应组员或用户明确授权。
```

## 18. 可给组员的任务提示词模板

负责人可以生成组员任务提示词，但不直接完成组员任务。

模板：

```text
你现在负责 C 组 <子模块编号和名称>。

请先阅读：
- docs/srs/C-smart-course-selection-srs.md
- docs/apis/C-smart-course-selection.md
- docs/modules/course-selection-design.md
- docs/tasks/C-work-breakdown.md
- docs/agent-guides/C-coding-agent-guidelines.md
- AGENTS.md

只允许修改：
<列出文件>

必须完成：
<列出接口/页面/服务>

必须保留或补充 TODO：
<列出复杂规则>

禁止：
1. 修改 A/B/D/E/F 组业务逻辑；
2. 新增数据库业务表；
3. 信任前端传入 studentId；
4. 跳过后端权限和事务校验；
5. 让 AI 直接写 Enrollment；
6. 修改不属于本子模块的文件。

完成后必须使用 $stss-docker-checks 运行 Docker 校验，并输出实际命令和结果。
```

## 19. 默认响应策略

在负责人模式下，如果用户说：

```text
“帮我修 C 组框架”
“帮我继续完善 C 组选课模块”
“帮我让 Codex 接着写”
“帮我解决 typecheck”
```

Codex 必须先判断：

```text
这是负责人框架/公共契约问题，还是组员业务实现问题？
```

如果是负责人问题，最小修改并校验。

如果是组员业务实现问题，输出：

```text
该任务属于 Cx 子模块，不应由负责人模式直接完整实现。
我将补充文件入口、类型/schema 骨架和 TODO，或生成给对应组员的任务提示词。
```

不要直接进入完整 coding。
