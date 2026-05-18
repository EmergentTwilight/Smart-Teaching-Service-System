# C 组 Coding Agent 开发指南

> 适用对象：参与 C 组 Smart Course Selection / 智能选课模块开发的 coding agent 和使用 agent 的组员。<br>
> 目标：让 agent 搭建清晰框架、实现被分配的局部任务，并留下可追踪 TODO；不得擅自扩展业务范围或一次性生成不可审查的大量代码。

## 1. 必须先读的文档

开始任何 C 组代码修改前，agent 必须先阅读：

```text
docs/srs/C-smart-course-selection-srs.md
docs/apis/shared.md
docs/apis/C-smart-course-selection.md
docs/modules/course-selection-design.md
docs/tasks/C-work-breakdown.md
docs/database-design.md
docs/project-requirements.md
docs/development-specifications.md
```

所有接口实现必须同时遵循 `docs/apis/shared.md` 与 `docs/apis/C-smart-course-selection.md` API 文档。

优先级规则：

```text
项目要求/数据库设计 > C 组 SRS > shared/C 组 API 文档 > 模块设计 > 分工文档 > agent guidelines > 当前代码
```

业务需求以 C 组 SRS 为准，但不得擅自突破数据库设计新增表或字段；接口字段、权限和错误结构以 shared/C 组 API 文档为准。

## 2. Agent 的正确工作模式

C 组不希望 agent 直接写完整个智能选课系统。agent 应采用以下模式：

```text
1. 先检查现有项目结构和同类模块写法。
2. 只修改当前任务允许的文件。
3. 先搭建 routes/controller/service/schema/types 框架。
4. 对复杂业务写明确 TODO。
5. 每个 TODO 绑定子模块编号和 SRS 需求编号。
6. 保证项目尽量能通过 TypeScript 编译。
7. 最后输出修改文件清单、已完成内容、未完成 TODO 和人工确认问题。
```

不允许用“假实现”伪装完成，例如直接返回空数组但不写 TODO，或者跳过权限校验却声称接口已完成。

## 3. 禁止事项

以下行为不得出现：

```text
1. 禁止新增未在 SRS 或数据库设计中出现的业务表。
2. 禁止大规模修改 A/B/D/E/F 组业务代码。
3. 禁止让前端传入 studentId 作为可信身份依据。
4. 禁止只做前端校验而省略后端校验。
5. 禁止 AI 直接创建、更新或删除 Enrollment。
6. 禁止绕过容量、时间冲突、选课阶段、先修课、最大学分和权限边界。
7. 禁止手动修改 CourseOffering.enrolled_count 而不处理 Enrollment 一致性。
8. 禁止新增与 Prisma schema 不一致的状态值、枚举值或字段名。
9. 禁止把 TODO 写成空泛的 “implement later”。
10. 禁止未经说明修改 Docker、CI、全局配置或其他组模块。
```

若确实需要修改数据库 schema、全局鉴权、公共类型或其他组模块，必须在输出中标记为“需要 C 组负责人确认”，不得直接完成并假定可合并。

## 4. 允许修改范围

### 框架搭建任务允许修改

```text
backend/src/modules/course-selection/**
frontend/src/modules/course-selection/**
docs/modules/course-selection-design.md
docs/tasks/C-work-breakdown.md
docs/agent-guides/C-coding-agent-guidelines.md
必要的后端 app/router 挂载文件
必要的前端路由/菜单挂载文件
```

### 单个功能任务通常只允许修改

```text
自己负责子模块对应的 controller/service/schema/types
自己负责页面对应的 api/hooks/components/pages
相关 README 或 TODO 文档
必要测试文件
```

跨模块修改必须在 PR 描述中说明原因。

## 5. 后端实现规范

后端应遵循当前项目已有模块风格，使用：

```text
routes：定义路径、鉴权、角色、校验
controller：处理请求和响应
service：实现业务规则和数据库访问
schemas：定义参数校验
types：定义 DTO、错误码和共享类型
```

路由统一挂载在：

```text
/api/v1/course-selection
```

学生端接口必须从认证上下文中取得当前用户和学生身份。即使请求体中包含 `studentId`，也不能将其作为学生端接口的可信操作对象。

## 6. 选课事务 TODO 模板

`enrollment.service.ts` 中必须保留或实现如下业务规则：

```ts
// TODO(C3, FR-C-05): Implement capacity-safe enrollment transaction.
// Required checks:
// 1. current user must be a student;
// 2. active SelectionPeriod exists and server time is inside [start_time, end_time];
// 3. CourseOffering.status must allow selection;
// 4. CourseOffering.enrolled_count < CourseOffering.capacity;
// 5. student must not already have an active Enrollment for this CourseOffering;
// 6. target Schedule must not conflict with the student's enrolled courses;
// 7. selected credits must not exceed SelectionPeriod.max_credits;
// 8. prerequisites must be satisfied if CoursePrerequisite exists;
// 9. create/update Enrollment and increment CourseOffering.enrolled_count in one transaction.
```

实现时必须保证并发安全，不得采用容易超卖的“先查询容量，再单独更新人数”方案。可以使用事务、条件更新、唯一约束或等价机制。

## 7. 退选事务 TODO 模板

```ts
// TODO(C3, FR-C-07): Implement drop transaction.
// Required checks:
// 1. current user owns the target Enrollment;
// 2. current SelectionPeriod allows dropping;
// 3. Enrollment is currently active;
// 4. update Enrollment status and droppedAt;
// 5. decrement or recompute CourseOffering.enrolled_count consistently.
```

退选不应直接删除历史记录，除非 SRS 和数据库设计明确要求。

## 8. 选课阶段管理 TODO 模板

```ts
// TODO(C5, FR-C-10): Implement SelectionPeriod management.
// Current route guard may use admin/super_admin, but C5 service must map the semantic
// academic_admin permission to Admin.adminType = ACADEMIC or equivalent authorization.
// Validate semester, phase, start time, end time, max credits, and active state.
// Reject invalid time ranges and overlapping active periods when applicable.
```

所有时间判断以服务端时间为准。

## 9. 手动加课 TODO 模板

```ts
// TODO(C5, FR-C-11): Implement manual enrollment.
// Only authorized academic admin may manually add a student to a CourseOffering.
// In current code, admin/super_admin route roles are only entry guards; service must
// map this to Admin.adminType = ACADEMIC or equivalent authorization.
// Record operator, reason, target student, target offering, and result.
// By default, still check duplicate enrollment, capacity, schedule conflict, max credits, and prerequisites.
```

若业务要求允许 `academic_admin` 覆盖某些限制，必须由负责人确认，并在文档中写明覆盖范围和审计要求。`system_admin` 不默认替代教务权限，如需操作 C5 管理接口必须先获得明确的 `academic_admin` 授权。

## 10. 教师名单导出 TODO 模板

```ts
// TODO(C4, FR-C-09): Implement teacher roster export.
// Teacher may only export rosters for CourseOfferings taught by themselves.
// Export data must come from valid Enrollment records and include student number,
// name, major/class information when available, enrollment status, and enrolled time.
```

导出文件格式应与项目已有工具或依赖保持一致。若暂未实现 Excel 生成，应返回明确 TODO，不要伪造下载链接。

## 11. AI 辅助 TODO 模板

```ts
// TODO(C6, FR-C-13): Implement AI-assisted recommendation.
// AI may rank and explain candidate CourseOfferings.
// AI must not directly write Enrollment.
// AI must not override hard constraints: capacity, schedule conflict,
// selection period, prerequisites, max credits, and permissions.
// If AI service fails, normal search and enrollment flow must remain available.
```

AI 输出应包含推荐理由、风险提示和学分影响说明，并标注“仅供参考”。

## 12. 前端实现规范

前端应按 `api / pages / components / hooks / types` 拆分：

```text
api：封装请求，不直接写业务判断。
hooks：管理数据加载、刷新、错误状态。
components：可复用展示组件。
pages：组合页面和交互流程。
types：与后端 DTO 对齐。
```

前端可以做：

```text
1. 搜索和筛选课程。
2. 展示容量、冲突、学分进度和 AI 建议。
3. 在提交前给出预警。
4. 根据后端错误码展示失败原因。
```

前端不得做：

```text
1. 认为自己判断可选就直接显示成功。
2. 自行决定 studentId。
3. 伪造 enrolled_count、课程状态或权限。
4. 在 AI 推荐结果中提供“直接成功选课”的假反馈。
```

## 13. 错误码建议

C 组错误码应集中定义在 `course-selection.types.ts` 或等价文件中。建议至少覆盖：

```text
CS_PERIOD_CLOSED
CS_OFFERING_NOT_FOUND
CS_OFFERING_CLOSED
CS_OFFERING_FULL
CS_DUPLICATE_ENROLLMENT
CS_SCHEDULE_CONFLICT
CS_MAX_CREDITS_EXCEEDED
CS_PREREQUISITE_NOT_MET
CS_ENROLLMENT_NOT_FOUND
CS_FORBIDDEN
CS_AI_UNAVAILABLE
```

错误码命名可以根据项目既有规范调整，但含义不得缺失。

## 14. 输出要求

每次 agent 完成任务后，必须输出：

```text
1. 修改文件清单。
2. 每个文件的作用。
3. 已实现的功能。
4. 未完成 TODO。
5. 是否修改非 C 组文件。
6. 是否涉及数据库 schema。
7. 手动测试步骤。
8. 需要负责人确认的问题。
```

不得只输出“完成了”。

## 15. 给 agent 的推荐任务提示词

执行具体任务时，组员可使用下面的格式约束 agent：

```text
你现在只负责 C 组 <子模块编号和名称>。
请先阅读 docs/srs/C-smart-course-selection-srs.md、
docs/modules/course-selection-design.md、
docs/tasks/C-work-breakdown.md、
docs/agent-guides/C-coding-agent-guidelines.md。

只允许修改以下文件：
<列出允许修改的文件>

必须完成：
<列出接口、页面或服务>

必须保留或补充 TODO：
<列出未完成复杂规则>

禁止：
1. 修改 A/B/D/E/F 组业务逻辑；
2. 新增数据库业务表；
3. 信任前端传入 studentId；
4. 跳过后端权限和事务校验；
5. 让 AI 直接写入 Enrollment。

完成后输出修改清单、已实现功能、TODO、测试步骤和需要负责人确认的问题。
```

## 16. Review 自检清单

提交前，agent 和组员应共同确认：

```text
1. 代码是否遵循 C 组 SRS。
2. 是否只改了被允许的文件。
3. 是否没有新增业务表。
4. 是否没有信任前端 studentId。
5. 是否所有复杂业务都有明确 TODO 或真实实现。
6. 是否权限边界清楚。
7. 是否 Enrollment 与 CourseOffering.enrolled_count 一致。
8. 是否 AI 只推荐不决策。
9. 是否有手动测试步骤。
10. 是否方便 C 组负责人 review。
```
