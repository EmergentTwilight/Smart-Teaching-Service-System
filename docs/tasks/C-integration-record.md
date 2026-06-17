# C 组联调记录

本文记录 C 组在上级集成分支上的实际联调结果。联调规则和验收口径见
`docs/tasks/C-integration-and-acceptance-guide.md`。

## 2026-06-16 dev/C on develop API smoke

联调日期：2026-06-16 11:18:04 +0800

参与人员：C 组负责人助理 Codex

分支/commit：

- 当前分支：`integ/C-on-develop`
- 当前提交：`60677af fix(C): normalize selection period pagination response`
- 当前工作区：包含 C 组默认当前学期解析修复，待提交
- 集成基线：`60bd2dd merge(C): integrate dev/C for develop smoke check`
- C 组来源：`03fdabe origin/dev/C`

联调范围：

- 推进到前端页面联调之前。
- 覆盖分支状态、Docker 服务状态、数据准备、A/B/F/C 后端接口 smoke、C 组 API 级联调、基础 typecheck。
- 未执行浏览器页面点击流和视觉检查。

Docker 服务状态：

- `postgres`：Up，healthy，端口 `5432`
- `redis`：Up，healthy，端口 `6379`
- `server`：Up，端口 `3000`
- `web`：Up，端口 `5173`
- `adminer`：Up，端口 `8080`
- `e-server`：Up，端口 `3001`

访问方式说明：

- 当前 Codex 沙箱中宿主机 `curl http://localhost:3000` 返回连接失败。
- 在 `server` 容器内访问 `http://127.0.0.1:3000/api/health` 正常，后续 API smoke 均从 `server` 容器内发起。
- 该限制记录为本次 Codex 执行环境差异，不等同于服务未启动。

数据准备检查：

| 数据对象 | 数量 | 结论 |
| --- | ---: | --- |
| users | 6 | 通过 |
| students | 2 | 通过 |
| teachers | 2 | 通过 |
| admins | 2 | 通过 |
| semesters | 4 | 通过 |
| courses | 10 | 通过 |
| course_offerings | 12 | 通过 |
| schedules | 3 | 通过 |
| curriculums | 2 | 通过 |
| curriculum_courses | 5 | 通过 |
| selection_periods | 2 | 通过 |
| enrollments | 8 | 通过 |
| scores | 1 | 通过 |

测试账号：

| 账号 | 角色 | 登录结果 |
| --- | --- | --- |
| `student` / `student123` | student | 通过 |
| `teacher` / `teacher123` | teacher | 通过 |
| `admin` / `Admin123` | admin, super_admin | 通过 |

后端 API smoke：

| 检查项 | 请求 | 期望 | 实际 | 结果 |
| --- | --- | ---: | ---: | --- |
| Health | `GET /api/health` | 200 | 200 | 通过 |
| A 组认证 | `GET /api/v1/auth/me` | 200 | 200 | 通过 |
| B 组排课 | `GET /api/v1/course-arrangement/schedules?page=1&pageSize=3` | 200 | 200 | 通过 |
| F 组成绩 | `GET /api/v1/students/me/scores?page=1&pageSize=5` | 200 | 200 | 通过 |
| C 未认证保护 | `GET /api/v1/course-selection/courses` | 401 | 401 | 通过 |
| C1 培养方案 | `GET /api/v1/course-selection/curriculum/me?include_courses=true` | 200 | 200 | 通过 |
| C1 学分进展 | `GET /api/v1/course-selection/curriculum/me/progress` | 200 | 200 | 通过 |
| C2 课程搜索 | `GET /api/v1/course-selection/courses?page=1&page_size=5` | 200 | 200 | 通过 |
| C2 开课列表 | `GET /api/v1/course-selection/offerings?page=1&page_size=5` | 200 | 200 | 通过 |
| C2/C3 可选课程，未传学期 | `GET /api/v1/course-selection/offerings/available?include_unavailable=true&page=1&page_size=5` | 200 | 422 -> 200 | 已修复 |
| C2/C3 可选课程，显式学期 | `GET /api/v1/course-selection/offerings/available?semester_id=10000000-0000-4000-8000-000000000002&include_unavailable=true&page=1&page_size=5` | 200 | 200 | 通过 |
| C2 开课详情 | `GET /api/v1/course-selection/offerings/10000000-0000-4000-8000-000000000018?include_eligibility=true` | 200 | 200 | 通过 |
| C4 我的选课 | `GET /api/v1/course-selection/enrollments/me?status=enrolled&page=1&page_size=5` | 200 | 200 | 通过 |
| C4 我的课表 | `GET /api/v1/course-selection/timetable/me?format=grid` | 200 | 200 | 通过 |
| C5 阶段列表 | `GET /api/v1/course-selection/admin/periods?page=1&page_size=5` | 200 | 200 | 通过 |
| C4 教师名单 | `GET /api/v1/course-selection/teacher/offerings/33333333-3333-4333-8333-333333333333/roster?page=1&page_size=5` | 200 | 200 | 通过 |
| C4 roster 角色保护 | student 调教师 roster | 403 | 403 | 通过 |
| C3 重复选课保护 | `POST /api/v1/course-selection/enrollments`，已选开课 | 409 | 409 | 通过 |
| C5 手动加课 reason 必填 | `POST /api/v1/course-selection/admin/enrollments`，缺少 `reason` | 400 | 400 | 通过 |
| C6 AI 推荐 TODO | `POST /api/v1/course-selection/ai-advisor/recommend` | 501 | 501 | 通过，非阻塞 TODO |

首次失败流程：

1. `GET /api/v1/course-selection/offerings/available` 在未显式传入 `semester_id` 时返回 422。
2. 失败原因：当前日期同时命中 3 个学期：
   - `10000000-0000-4000-8000-000000000002`，`semester2`
   - `11111111-1111-4111-8111-111111111111`，`2025-2026 春季学期`
   - `a1000000-0000-4000-8000-000000000001`，`2025-2026 春季（验证）`
3. 该接口显式传入 `semester_id=10000000-0000-4000-8000-000000000002` 后返回 200。
4. 当前学生端 `StudentCourseSelectionPage` 默认查询参数不包含 `semester_id`，页面进入联调时会触发该 422。
5. 归属判断：接口和默认学期解析属于 C2/C4 前后端契约；触发数据中有 F 演示学期，但 C1/C2 与 C4/C5 验证 seed 也引入了重叠 CURRENT 学期。因此按 C 组契约问题处理，不要求其他组先改数据。
6. 修复口径：后端未传 `semester_id` 时按 `Semester.status = CURRENT` 解析当前学期，并按 `startDate desc` 取确定结果，避免多组联调 seed 因日期重叠导致 422。

复测记录：

| 时间 | 检查项 | 命令/请求 | 期望 | 实际 | 结果 |
| --- | --- | --- | ---: | ---: | --- |
| 2026-06-16 | 后端 typecheck | `./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'` | 通过 | 通过 | 通过 |
| 2026-06-16 | C2/C3 可选课程，未传学期 | `GET /api/v1/course-selection/offerings/available?include_unavailable=true&page=1&page_size=5` | 200 | 200 | 通过 |

阻塞问题：

| 编号 | 严重级别 | 状态 | 责任范围 | 问题 | 处理结果 |
| --- | --- | --- | --- | --- | --- |
| C-INT-20260616-01 | P1 | 已解除 | C2/C4 前后端契约 + seed 数据口径 | 学生端默认不传 `semester_id`，而后端默认当前学期推断因 seed 中多个当前学期返回 422。 | 已采用后端确定性默认学期解析，不改 `schema.prisma`，不改其他组业务数据。 |

非阻塞 TODO：

| 编号 | 模块 | 说明 |
| --- | --- | --- |
| C-TODO-20260616-01 | C6 | AI 推荐接口当前按设计返回 501 TODO，不直接写 Enrollment。前端页面联调时应展示降级/待实现状态。 |
| C-TODO-20260616-02 | C3 | 本次仅验证重复选课保护，未执行成功选课/退选写路径，避免污染演示数据。正式验收需准备可回滚测试数据后覆盖成功路径。 |
| C-TODO-20260616-03 | C4 | 本次验证 roster 正向和 student 越权保护；未覆盖“非任课教师访问他人开课”场景，因为当前 seed 中可用开课均归测试教师。 |

基础校验：

| 命令 | Docker service | workdir | 结果 |
| --- | --- | --- | --- |
| `./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'` | `server` | `/app` | 通过 |
| `CODEX_DOCKER_SERVICE=web CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'` | `web` | `/app` | 通过 |

## 2026-06-17 前端页面联调重跑记录

联调结论来源：人工页面重跑反馈，详细记录见 `docs/tasks/C-frontend-acceptance-result.md`。

本次重跑范围：

| 页面 | 路径 | 重跑账号 | 结果 | 备注 |
| --- | --- | --- | --- | --- |
| 选课阶段管理 | `/selection/admin/periods` | `academic / Admin123` | 通过 | 使用教务管理员账号重跑成功，说明先前失败主要是联调账号/权限口径问题。 |
| 手动加课 | `/selection/admin/manual-enrollment` | `academic / Admin123` | 通过 | 使用当前数据重跑成功：学生 ID `3326b889-4b93-447b-afad-a802424e182f`，课程开设 ID `10000000-0000-4000-8000-000000000016`。 |

数据写入说明：

- 手动加课属于写操作，会创建 Enrollment 并更新对应 CourseOffering 的已选人数。
- 同一组学生和课程开设 ID 第二次执行可能返回重复选课/已存在，后续复测应更换未选过的课程开设或先回滚测试数据。

是否允许进入前端页面联调：

- `C-INT-20260616-01` 已解除，当前已进入前端页面联调阶段。
- C5 选课阶段管理和手动加课页面已于 2026-06-17 重跑通过。
- 页面联调剩余重点：C6 501 降级展示、C3 成功选课/退选回滚数据方案、C4 非任课教师越权场景，以及 `docs/tasks/C-frontend-acceptance-result.md` 中记录的学生端非阻塞问题。

是否允许合入 dev/C：

- 当前集成分支本身基础 typecheck 通过。
- 默认学期解析修复提交后，可以作为前端页面联调前置修复合入。
- 前端页面联调已有 C5 重跑通过记录；是否继续合入需结合剩余学生端非阻塞问题和 AI TODO 判断。

是否允许从 dev/C 合入上级分支：

- 修复提交并完成前端页面联调后再建议合入上级分支。

需要其他组确认的问题：

1. A/B/F 合并后的 seed 数据是否长期允许同时存在多个 `CURRENT` 且日期重叠的学期。
2. C 组后续是否要在学生端提供显式学期选择并传 `semester_id`，用于历史学期/跨学期查询。
3. F 组先修/成绩通过情况后续是否作为 C3 `CoursePrerequisite` 校验的数据源。
