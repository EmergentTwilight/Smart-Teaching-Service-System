# C 组联调与验收指导

> 模块：Smart Course Selection / 智能选课
> 集成分支：`dev/C`
> 适用对象：C 组负责人、成员 1 至成员 5，以及参与 C 组联调的 coding agent。
> 目标：让每个成员能先调通自己的工作，再完成 C 组内部联调，最后与 A/B/D/E/F 组完成大组交付联调。

本文不替代 SRS、API 文档或数据库设计。若文档之间出现冲突，优先级为：

```text
项目要求/数据库设计 > C 组 SRS > shared/C API > 模块设计 > 分工文档 > agent guidelines > 当前代码
```

## 1. 联调基本规则

### 1.1 分支与合并规则

1. 每个成员从 `dev/C` 拉出自己的功能分支。
2. 成员功能分支先向 `dev/C` 开 PR，不直接合入 `develop` 或 `main`。
3. PR 合并前必须说明：
   - 对应子模块：例如 C1/C2/C3/C4/C5/C6；
   - 覆盖需求：例如 `FR-C-01`、`NFR-C-04`；
   - 修改文件清单；
   - 已完成内容；
   - 未完成 TODO；
   - Docker wrapper 校验命令和结果；
   - 手动验证步骤和结果；
   - 是否修改 API 契约、权限边界、数据库 schema 或非 C 组文件。
4. 负责人只做边界、契约、review 和联调协调，不直接替成员补完整业务实现。

### 1.2 Docker 校验规则

所有项目工具链验证命令必须通过统一 wrapper 执行：

```bash
./scripts/codex-docker-run.sh '<command>'
```

不得在宿主机或原始 WSL 环境中直接运行：

```text
pnpm / npm / node / npx / tsc / prisma / vitest / jest / package scripts
```

后端标准校验：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

前端标准校验：

```bash
CODEX_DOCKER_SERVICE=web CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
```

如果后端出现：

```text
Cannot find module '@stss/shared'
```

先构建 shared，不要直接修改业务代码：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build'
```

### 1.3 手动验证命令规则

以下命令可以直接在宿主机执行：

```bash
docker compose up -d
docker compose ps
curl -i "http://localhost:3000/..."
```

原因是这些命令用于启动容器或访问已暴露的 HTTP 服务，不属于项目工具链编译、测试或构建命令。

测试账号：

| 账号 | 密码 | 角色 |
|---|---|---|
| `student` | `student123` | 学生 |
| `teacher` | `teacher123` | 教师 |
| `admin` | `Admin123` | 超级管理员 |

登录拿 token：

```bash
curl -s -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"student123"}'
```

复制返回结果中的 `data.access_token`：

```bash
TOKEN='粘贴 access_token'
```

后续请求统一带：

```bash
-H "Authorization: Bearer $TOKEN"
```

## 2. 各成员自测与调试

### 2.1 成员 1：C1/C2 后端

负责范围：

```text
C1 培养方案与学分进展
C2 课程搜索、课程详情、可选课程列表
```

重点接口：

```text
GET /api/v1/course-selection/curriculum/me
GET /api/v1/course-selection/curriculum/me/progress
GET /api/v1/course-selection/courses
GET /api/v1/course-selection/offerings
GET /api/v1/course-selection/offerings/available
GET /api/v1/course-selection/offerings/:id
```

标准校验：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

手动验证：

```bash
curl -i "http://localhost:3000/api/v1/course-selection/curriculum/me?include_courses=true" \
  -H "Authorization: Bearer $TOKEN"

curl -i "http://localhost:3000/api/v1/course-selection/curriculum/me/progress" \
  -H "Authorization: Bearer $TOKEN"

curl -i "http://localhost:3000/api/v1/course-selection/courses?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN"

curl -i "http://localhost:3000/api/v1/course-selection/offerings?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN"

curl -i "http://localhost:3000/api/v1/course-selection/offerings/available?include_unavailable=true&page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN"
```

通过标准：

1. `/curriculum/me` 只返回当前登录学生的培养方案，不要求也不信任 `student_id`。
2. 培养方案根据 `Student.major_id` 与 `Student.grade` 匹配 `Curriculum` 和 `CurriculumCourse`。
3. 学分进展基于有效 `Enrollment` 做只读统计，不创建或修改选课记录。
4. 课程搜索和开课列表支持分页或筛选，避免一次性返回大表。
5. `/offerings/available` 返回只读 `eligibility.reasons`，但最终选课成功仍由 C3 事务决定。
6. 不新增 `StudentPlan`、培养方案确认表或任何未批准业务表；培养方案确认持久化继续标注 `TODO-C-01`。

禁止合并的问题：

1. 通过请求参数中的 `student_id` 查询他人培养方案。
2. 在 C1/C2 中创建、退选或更新 `Enrollment`。
3. 修改课程、学生、专业等主数据。
4. 为了支持培养方案确认而擅自修改 Prisma schema。

### 2.2 成员 2：C3 后端

负责范围：

```text
C3 学生选课/退选核心事务
```

重点接口：

```text
POST /api/v1/course-selection/enrollments
PATCH /api/v1/course-selection/enrollments/:id/drop
```

标准校验：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

手动验证：

```bash
curl -i -X POST "http://localhost:3000/api/v1/course-selection/enrollments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"course_offering_id":"替换为可选开课ID","client_request_id":"manual-test-001"}'

curl -i -X PATCH "http://localhost:3000/api/v1/course-selection/enrollments/替换为选课记录ID/drop" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"client_request_id":"manual-test-drop-001"}'
```

必须覆盖的场景：

1. 开放阶段内选课成功，`Enrollment.status` 为 `enrolled`，`CourseOffering.enrolled_count` 增加。
2. 阶段关闭时选课失败，并返回明确错误原因。
3. 容量满时选课失败，不出现超卖。
4. 重复选择同一 `CourseOffering` 失败。
5. 与已选课程时间冲突时失败。
6. 超过当前阶段 `max_credits` 时失败。
7. 不满足先修要求时失败或按当前 TODO 返回明确风险边界。
8. 并发请求同一剩余容量为 1 的课程时，最终有效选课人数不超过容量。
9. 学生退选本人 `enrolled` 记录成功，状态变为 `dropped`，`dropped_at` 有值，`enrolled_count` 减少。
10. 学生退选他人记录失败。

通过标准：

1. 学生身份来自认证上下文，不接收或信任 `student_id`。
2. 选课和退选在事务内完成。
3. `Enrollment` 与 `CourseOffering.enrolled_count` 保持一致。
4. 并发策略使用行锁、条件更新或等价机制，不能先查容量再无保护写入。
5. 前端、AI 或请求体不能决定选课成功。

禁止合并的问题：

1. `return { success: true }` 之类危险假实现。
2. 直接创建 `Enrollment`，但缺少容量、阶段、冲突、重复或学分检查。
3. 先创建选课记录，再异步更新人数。
4. 修改 C1/C2/C4/C5/C6 业务来绕过事务问题。
5. 为了并发控制擅自新增未批准业务表。

### 2.3 成员 3：C4/C5 后端

负责范围：

```text
C4 选课结果、学生课表、教师名单和名单导出
C5 选课阶段管理、手动加课、并发控制和强退预留
```

重点接口：

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

标准校验：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

手动验证：

```bash
curl -i "http://localhost:3000/api/v1/course-selection/enrollments/me?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN"

curl -i "http://localhost:3000/api/v1/course-selection/timetable/me" \
  -H "Authorization: Bearer $TOKEN"
```

教师 token 验证 roster：

```bash
curl -s -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher","password":"teacher123"}'
```

```bash
TEACHER_TOKEN='粘贴教师 access_token'

curl -i "http://localhost:3000/api/v1/course-selection/teacher/offerings/替换为本人开课ID/roster?page=1&page_size=20" \
  -H "Authorization: Bearer $TEACHER_TOKEN"

curl -i "http://localhost:3000/api/v1/course-selection/teacher/offerings/替换为本人开课ID/roster/export" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

管理员 token 验证阶段和手动加课：

```bash
curl -s -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123"}'
```

```bash
ADMIN_TOKEN='粘贴管理员 access_token'

curl -i "http://localhost:3000/api/v1/course-selection/admin/periods?page=1&page_size=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -i -X POST "http://localhost:3000/api/v1/course-selection/admin/enrollments" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id":"替换为学生ID","course_offering_id":"替换为开课ID","reason":"联调手动加课验证"}'
```

必须覆盖的场景：

1. 学生只能查询本人 `/enrollments/me` 和 `/timetable/me`。
2. 教师查询本人 offering roster 成功，查询他人 offering 返回 403。
3. roster export 返回 Excel 二进制或文档约定的导出响应。
4. SelectionPeriod 创建和修改字段对齐 `semester_id/phase/start_time/end_time/max_credits/is_active`。
5. 时间判断以服务端时间为准，支持带时区偏移的 ISO 字符串。
6. 手动加课缺少 `reason` 时失败。
7. 手动加课容量满、重复、课表冲突时失败。
8. 手动加课成功时保留审计入口或写入 `SystemLog`。
9. 连接数控制和长时间无操作释放如未实现，必须保留 `TODO-C-06`、`TODO-C-11` 或等价 TODO。

通过标准：

1. roster ownership 不可绕过。
2. 学生结果和课表不信任 `student_id`。
3. 教务接口入口角色与 C API 语义角色 `academic_admin` 的映射有实现或清晰 TODO。
4. 手动加课不能绕过默认容量、重复、冲突和学分检查。
5. C5 不重写 C3 普通学生选课事务。

禁止合并的问题：

1. 教师可通过猜测 offeringId 查看或导出他人名单。
2. 导出数据由前端或缓存拼接，而不是后端基于有效选课记录生成。
3. 手动加课 `reason` 可为空。
4. `admin/super_admin` 被无说明地等同为任意教务权限。
5. 新增 `ManualEnrollmentRequest`、`CourseSelectionQueue` 等未批准业务表。

### 2.4 成员 4：学生端前端

负责范围：

```text
学生端前端：培养方案、课程搜索、选课、结果、课表页面
```

页面路径：

```text
/selection/curriculum
/selection/courses
/selection/timetable
```

主要调用：

```text
GET /course-selection/curriculum/me
GET /course-selection/curriculum/me/progress
GET /course-selection/courses
GET /course-selection/offerings
GET /course-selection/offerings/available
GET /course-selection/offerings/:id
GET /course-selection/enrollments/me
POST /course-selection/enrollments
PATCH /course-selection/enrollments/:id/drop
GET /course-selection/timetable/me
```

标准校验：

```bash
CODEX_DOCKER_SERVICE=web CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
```

如改动共享类型或后端 API 类型，由负责人或对应后端成员补跑：

```bash
CODEX_DOCKER_SERVICE=server CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

手动验证：

1. 使用 `student/student123` 登录前端。
2. 访问 `http://localhost:5173/selection/curriculum`，确认展示培养方案、课程分组和学分进展；后端 501 或无培养方案时展示明确错误。
3. 访问 `http://localhost:5173/selection/courses`，确认可搜索课程、查看详情、展示 `eligibility.reasons`。
4. 点击选课按钮后等待后端 `POST /enrollments` 返回；成功后刷新可选课程和本人选课记录。
5. 点击退选按钮后等待后端 `PATCH /drop` 返回；失败时展示后端错误原因。
6. 访问 `http://localhost:5173/selection/timetable`，确认展示课表和缺失排课提示。

通过标准：

1. 前端不发送 `student_id` 或 `studentId` 代表当前学生。
2. 选课和退选结果以后端响应为准。
3. 页面能展示 loading、empty、error 和权限失败状态。
4. 后端返回 501、403、422 或业务错误时，页面不显示假成功或假空数据。

禁止合并的问题：

1. 前端本地直接把课程标为已选，不等待后端。
2. 前端自行决定容量、冲突、阶段或先修是否通过。
3. 学生端实现教师/教务/AI 完整页面。
4. 为了页面展示直接修改后端复杂业务或 Prisma schema。

### 2.5 成员 5：教师/教务端前端 + AI 面板

负责范围：

```text
教师端前端
教务端前端
AI 辅助选课展示面板
单独指派时维护 C6 后端接口契约和兜底模板
```

页面路径：

```text
/selection/teacher/roster
/selection/admin/periods
/selection/admin/manual-enrollment
/selection/ai
```

主要调用：

```text
GET /course-selection/teacher/offerings/:id/roster
GET /course-selection/teacher/offerings/:id/roster/export
GET /course-selection/admin/periods
POST /course-selection/admin/periods
PATCH /course-selection/admin/periods/:id
POST /course-selection/admin/enrollments
POST /course-selection/ai-advisor/recommend
POST /course-selection/ai-advisor/explain
```

标准校验：

```bash
CODEX_DOCKER_SERVICE=web CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
```

如果单独修改 C6 后端契约，补跑后端：

```bash
CODEX_DOCKER_SERVICE=server CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

手动验证：

1. 使用 `teacher/teacher123` 登录，访问 `http://localhost:5173/selection/teacher/roster`。
2. 输入本人任课 offering，确认名单分页、筛选和导出入口可用。
3. 输入非本人任课 offering，确认后端 403 时前端展示权限错误。
4. 使用 `admin/Admin123` 登录，访问 `http://localhost:5173/selection/admin/periods`，确认阶段列表和表单字段与 API 对齐。
5. 访问 `http://localhost:5173/selection/admin/manual-enrollment`，确认缺 `reason` 时不能提交；后端失败时展示原因。
6. 使用 `student/student123` 登录，访问 `http://localhost:5173/selection/ai`，确认展示推荐、解释、冲突风险、学分影响和降级提示。
7. 检查 AI 请求不包含 `student_id` 或 `studentId`，AI 不触发 `Enrollment` 写入。

通过标准：

1. 教师名单和导出只调用后端 roster API，不从前端缓存拼接敏感名单。
2. 手动加课前端只做表单预校验，最终容量、冲突、重复和权限由后端决定。
3. AI 面板只展示推荐和解释，不创建或修改选课记录。
4. AI 不可用时，普通课程搜索和选课流程仍可用。

禁止合并的问题：

1. 教师端通过前端逻辑绕过 roster ownership。
2. 教务端伪造手动加课成功。
3. AI 面板直接调用选课写接口并显示“AI 已自动选课”。
4. AI 请求体携带 `student_id`。
5. 未经负责人确认接入完整 AI 模型算法或修改 C3/C5 后端事务。

### 2.6 C 组负责人

负责人负责联调和合并协调，不替成员完成完整业务实现。

负责人每个 PR 必查：

1. 是否只修改本成员允许范围。
2. 是否污染 A/B/D/E/F 组业务。
3. 是否新增数据库业务表或擅自修改 Prisma schema。
4. 是否破坏 C API 契约和 snake_case 字段约定。
5. 是否让学生端信任前端传入 `student_id`。
6. 是否缺少 roster ownership。
7. 是否让 AI 写 `Enrollment`。
8. 是否缺少手动加课 `reason`。
9. 是否存在危险假实现。
10. 是否通过 Docker wrapper 标准校验。
11. 是否有手动验证步骤和结果。

## 3. C 组内部联调流程

### 3.1 联调前准备

启动服务：

```bash
docker compose up -d
docker compose ps
```

确认服务地址：

```text
前端：http://localhost:5173
后端：http://localhost:3000
Adminer：http://localhost:8080
```

负责人在 `dev/C` 上先跑：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
```

```bash
CODEX_DOCKER_SERVICE=web CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
```

### 3.2 推荐合并顺序

1. 先合 C API 契约、schema/types 和只读查询：C1/C2。
2. 再合 C3 选课/退选事务。
3. 再合 C4/C5 后端结果、名单、阶段和手动加课。
4. 再合学生端前端：成员 4。
5. 最后合教师/教务/AI 前端和 C6 后端契约：成员 5。

如果顺序与实际 PR 不一致，负责人必须确认不会造成前端依赖不存在接口、后端接口字段被前端错误假设、或 C3 事务被 C4/C5 重写。

### 3.3 C 组主流程联调

学生流程：

1. 使用 `student/student123` 登录。
2. 打开 `/selection/curriculum`，查看培养方案和学分进展。
3. 打开 `/selection/courses`，搜索课程，查看课程详情和可选原因。
4. 在有效 SelectionPeriod 内提交选课。
5. 对同一课程重复选课，确认失败原因明确。
6. 构造容量满、时间冲突、超学分、缺先修或阶段关闭场景，确认后端拒绝且前端展示原因。
7. 查看 `/selection/timetable`，确认选课成功后课表同步。
8. 退选课程，确认课表和本人选课结果同步刷新。
9. 打开 `/selection/ai`，确认 AI 只推荐和解释，不改变选课结果。

教师流程：

1. 使用 `teacher/teacher123` 登录。
2. 打开 `/selection/teacher/roster`。
3. 查询本人任课 offering roster 成功。
4. 导出本人任课 offering roster 成功。
5. 查询或导出非本人 offering 被拒绝。

教务流程：

1. 使用 `admin/Admin123` 登录。
2. 打开 `/selection/admin/periods`。
3. 创建、修改、启用或关闭 SelectionPeriod。
4. 打开 `/selection/admin/manual-enrollment`。
5. 缺少 `reason` 时不能提交。
6. 容量满、重复选课、课表冲突或超学分时手动加课失败。
7. 手动加课成功时，学生本人结果和课表可见。

### 3.4 C 组验收通过标准

C 组可以合入上级开发分支前，必须满足：

1. 后端标准 typecheck 通过。
2. 前端标准 typecheck 通过。
3. `/api/v1/course-selection` 下所有已承诺接口均与 C API 文档字段一致。
4. 学生端完整流程可走通：培养方案、课程搜索、详情、可选课程、选课、退选、结果、课表。
5. 教师端 roster ownership 负例通过：非任课教师不能看或导出他人名单。
6. 教务端阶段管理和手动加课的权限、reason、容量、重复和冲突校验通过。
7. AI 不直接写 `Enrollment`，AI 不可用时普通选课流程仍可用。
8. `Enrollment` 与 `CourseOffering.enrolled_count` 在选课、退选和手动加课后保持一致。
9. 查询接口支持必要分页或筛选，避免大表无分页返回。
10. 未完成能力都有可分工 TODO，并在 PR 或交付说明中列出。

### 3.5 禁止合入上级分支的情况

出现以下任一情况，不建议从 `dev/C` 合入上级分支：

1. 只贴裸 `pnpm`、`npm`、`tsc` 或 `vitest` 结果，没有 Docker wrapper 校验。
2. 学生端接口信任请求体或 query 中的 `student_id`。
3. 前端伪造选课、退选或手动加课成功。
4. AI 直接创建、修改或删除 `Enrollment`。
5. 教师可查看或导出非本人课程名单。
6. 手动加课 `reason` 可为空。
7. 选课并发可能造成容量超卖。
8. 退选删除历史记录，而不是更新状态。
9. 修改 A/B/D/E/F 组业务逻辑但没有负责人确认。
10. 新增未在 SRS 或数据库设计中批准的业务表。

## 4. 与其他小组的大组联调

C 组最终交付依赖 A/B/F 组主数据和结果数据，也会为 D/E/F 组提供选课结果上下文。大组联调应先确认跨组契约，再跑端到端流程。

### 4.1 A 组联调点：基础信息与认证

C 组依赖 A 组提供：

1. 登录、JWT、刷新和当前用户信息。
2. `student`、`teacher`、`admin`、`super_admin` 角色。
3. `Student` 与 `User` 关联。
4. `Teacher` 与 `User` 关联。
5. `Admin.adminType` 或等价教务权限映射。
6. `Major`、`Department` 等专业和院系主数据。

联调通过标准：

1. 学生账号登录后可访问学生端 C 页面，不能访问教师或教务 C 页面。
2. 教师账号登录后可访问教师名单页面，不能访问学生选课写接口或教务接口。
3. 管理员账号可访问教务入口；若实现 `academic_admin` 语义权限，必须与 A 组角色/管理员类型一致。
4. C 组所有本人接口都从 JWT 解析身份，不要求前端传用户 ID。

### 4.2 B 组联调点：课程开设与排课

C 组依赖 B 组或课程排课数据提供：

1. `Course` 主数据：课程代码、名称、学分、类型、状态。
2. `CourseOffering`：学期、教师、容量、已选人数、状态。
3. `Schedule`：上课周次、星期、节次、地点。
4. 排课调整或缺失时的返回约定。

联调通过标准：

1. C 组课程搜索能查到 B 组生成或维护的开课。
2. 课程详情能展示排课信息。
3. 时间冲突判断使用同一套 `Schedule` 数据。
4. `Schedule` 缺失时 C 组按 `TODO-C-07` 或双方确认口径展示明确提示，不展示假课表。

### 4.3 F 组联调点：成绩与先修

C 组依赖 F 组确认：

1. 已修课程和通过情况的数据来源。
2. `CoursePrerequisite` 与成绩/通过状态的匹配规则。
3. 先修不满足时是硬性阻止还是风险提示。

联调通过标准：

1. 配置了先修要求的课程能读取或明确说明先修状态。
2. C3 选课事务不会因为 F 组数据缺失而静默放行。
3. AI 解释先修风险时与 C3 硬规则一致。
4. 若先修数据暂未接入，PR 和交付说明必须保留 `TODO-C-05`、`TODO-C-10` 或等价 TODO。

### 4.4 D/E 组联调点：下游业务消费选课结果

D/E 组通常不需要 C 组修改其业务，但可能消费选课结果范围：

1. D 组论坛可按课程或开课范围组织讨论。
2. E 组在线测试可按选课名单或课程范围组织测试。

联调通过标准：

1. C 组不直接修改 D/E 组业务逻辑。
2. 如 D/E 需要选课名单或课程范围，应通过已确认 API 或后续跨组接口，不直接读取 C 组私有实现细节。
3. C 组选课、退选、手动加课后，下游模块不会读取到明显冲突的状态。

### 4.5 大组端到端流程

推荐大组联调顺序：

1. 从上级集成分支启动 Docker Compose。
2. 确认 A 组测试账号可登录。
3. 确认 A/B/F 的 seed 或演示数据包含学生、教师、专业、课程、开课、排课、培养方案和必要成绩数据。
4. 学生登录，进入 C 组选课流程。
5. 学生选课成功后，教师可在 C 组名单中看到该学生。
6. 教师或教务在 D/E/F 相关页面确认课程或名单范围不冲突。
7. 教务手动加课后，学生 C 组结果、课表以及相关下游范围同步。
8. AI 推荐只提供参考，不影响任何下游选课记录。

大组交付通过标准：

1. `docker compose up -d` 后核心服务均可启动。
2. 前端、后端、数据库、Redis 服务状态正常。
3. A 组登录和角色权限可用。
4. B 组课程开设和排课数据能被 C 组正确读取。
5. C 组核心流程通过本文件第 3.4 节验收。
6. F 组先修或成绩数据口径已有实现或明确 TODO。
7. D/E/F 不因 C 组选课记录结构变化出现阻塞错误。
8. 所有剩余 TODO 都有负责人、需求编号和合并后处理口径。

## 5. 联调记录模板

每次 C 组内部联调或大组联调结束后，负责人应记录：

```text
联调日期：
参与人员：
分支/commit：
Docker 服务状态：
后端校验命令和结果：
前端校验命令和结果：
通过的流程：
失败的流程：
阻塞问题：
非阻塞 TODO：
是否允许合入 dev/C：
是否允许从 dev/C 合入上级分支：
需要其他组确认的问题：
```

PR 或合并说明中至少保留：

```text
1. 本次覆盖的 C 子模块和需求编号。
2. 实际执行的 Docker wrapper 命令。
3. 手动验证账号、页面路径或接口路径。
4. 成功场景和失败场景结果。
5. 剩余 TODO 与负责人确认项。
```
