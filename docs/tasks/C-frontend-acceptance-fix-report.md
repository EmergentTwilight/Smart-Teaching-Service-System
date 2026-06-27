# C 组前端页面联调问题修复报告

报告日期：2026-06-18

修复分支：`fix-C-frontend-acceptance`

基线分支：`integ/C-on-develop`

## 修复提交

| commit | message | 范围 |
| --- | --- | --- |
| `5d61825` | `fix(C): clarify curriculum confirmation state` | C1 培养方案确认状态与 API 文档 |
| `d668ff2` | `fix(C): compute enrollment eligibility by offering` | C2 可选性/详情 eligibility 契约 |
| `104b3b3` | `fix(C): require exact enrollment before drop` | C3/C4 学生端退选映射和详情状态展示 |
| `bdc6c3f` | `fix(C): isolate timetable print output` | C4 课表打印范围 |

## 修复内容

### 1. 培养方案确认提示

- 后端在当前没有确认记录持久化能力时返回 `required_before_selection=false`、`confirmed=true`。
- 前端只在 `requiredBeforeSelection && !confirmed` 时展示“培养方案待确认”提示。
- API 文档同步说明：培养方案确认已落库，前端不得用本地状态替代后端确认事实。

### 2. 退选按钮和已选状态

- `/offerings/available` 的 `eligibility.is_enrolled` 改为按同一个 `CourseOffering.id` 判断。
- `/offerings/:id` 的 `eligibility` 返回完整 flags，和列表接口对齐。
- 学生端课程表格只有在 `/enrollments/me` 能映射到精确 `enrollment_id` 时才显示可点击“退选”按钮。

### 3. 课程详情状态展示

- 课程详情主状态优先级调整为：`已选` > `可选` > `不可选`。
- 已选课程不再把“课程已选”和“课程不在培养方案中”等原因并列展示为同级矛盾状态。

### 4. 课表打印

- 课表组件增加打印专用容器。
- 打印媒体样式隐藏页面标题、筛选栏、选课概况和按钮，只输出课表主体及暂无排课提示。

## 测试与校验

新增测试：

- `backend/src/__tests__/modules/course-selection/course-search.service.test.ts`
  - 覆盖同课程不同开课不应标记 `is_enrolled`。
  - 覆盖课程详情返回完整 eligibility flags。
- `frontend/src/modules/course-selection/components/course-selection-components.test.tsx`
  - 覆盖精确 enrollment 才显示可点击退选按钮。
  - 覆盖课程详情已选状态优先级。
  - 覆盖课表打印隔离样式存在。

已尝试执行：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/server test:run -- src/__tests__/modules/course-selection/course-search.service.test.ts'
```

实际结果：

- Docker wrapper 选择 service：`server`
- 容器内工作目录：`/app`
- 失败原因：当前沙箱无法访问 Docker socket。
- 原始错误摘要：

```text
permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
unable to get image 'redis:7-alpine': permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
```

后续尝试按规则请求提升权限重跑，但当前环境返回用量限制，未能执行 Docker 校验。

未能执行的标准校验：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/shared build && pnpm --filter @stss/server typecheck'
CODEX_DOCKER_SERVICE=web CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
./scripts/codex-docker-run.sh 'pnpm --filter @stss/server lint'
CODEX_DOCKER_SERVICE=web CODEX_DOCKER_WORKDIR=/app ./scripts/codex-docker-run.sh 'pnpm --filter @stss/web lint'
```

## 边界确认

- 未修改 `backend/prisma/schema.prisma`。
- 未新增数据库表。
- 未修改 A/B/D/E/F 组业务代码。
- 未实现 C6 AI 后端。
- 未改变 C3 后端选课/退选事务规则；本次只修正 C2 只读 eligibility 和学生端前端映射。

## 剩余风险

- 当前报告中的自动测试尚未在 Docker 环境中实际通过，需要在 Docker socket 可用后补跑。
- “目前数据中无可选课程”和“教师端数据不够，没法验证退选、撤销”仍属于测试数据准备问题。
- AI 页面后端未完成仍按既定口径暂不处理。
