# B 模块前后端整合核心任务

> 编写日期：2026-06-14
> 涉及分支：`dev/B`、`fix/B-test-env-0504`、`feat/B-autoschedule-upgrade-0413`
> 目标：梳理 B 模块合并到 `develop` 前必须完成的四项核心任务，向大组长证明分支可合入

---

## 目录

1. [实现鉴权](#1-实现鉴权)
2. [类型问题修复](#2-类型问题修复)
3. [重跑 B 模块测试](#3-重跑-b-模块测试)
4. [dev/B 分支公共组件修改检查](#4-devb-分支公共组件修改检查)

---

## 1. 实现鉴权

B 模块复用 A 组统一实现的 **JWT 双令牌** 鉴权体系。公共中间件位于 `backend/src/shared/middleware/auth.ts`，提供三个中间件：

- `authMiddleware` —— 验证 `Authorization: Bearer <token>`，解析 JWT 并挂载 `{ userId, username, roles }` 到 `req.user`
- `requireRoles(...roles)` —— 校验用户是否拥有指定角色之一
- `requireSelfOrAdmin(...adminRoles)` —— 校验用户是否为资源本人，或拥有管理员角色

### 1.1 B 模块接入情况

| 接入项     | 说明                                                                                                          | 状态 |
| ---------- | ------------------------------------------------------------------------------------------------------------- | ---- |
| 路由挂载   | classroom / schedule / timetable / rules / auto-schedule 五组路由均使用 `router.use(authMiddleware)`          | ✅   |
| 前端 token | 全部 B 模块 API 文件使用 `@/shared/utils/request`，自动从 zustand persist 注入 `Authorization: Bearer` header | ✅   |

### 1.2 鉴权自动化测试

测试文件 `backend/src/modules/course-arrangement/__tests__/auth-middleware.test.ts`，共 **14 条用例全部通过**：

| 测试分组             | 用例数 | 验证内容                                                                                     |
| -------------------- | ------ | -------------------------------------------------------------------------------------------- |
| `authMiddleware`     | 5      | 无 header → 401、非 Bearer → 401、无效 JWT → 401、过期 JWT → 401、有效 JWT → 注入 `req.user` |
| `requireRoles`       | 4      | 未认证 → 401、角色匹配 → `next()`、角色不匹配 → 403、多角色任一匹配                          |
| `requireSelfOrAdmin` | 4      | 未认证 → 401、本人 → `next()`、管理员 → `next()`、非本人且非管理员 → 403                     |
| 路由集成             | 1      | 验证 5 个路由文件均已挂载 `authMiddleware`                                                   |

---

## 2. 类型问题修复

### 2.1 已完成（`fix/B-test-env-0504`）

该分支已将 B 模块从手写 TypeScript interface 迁移为 **Zod Schema + 自动推断类型**，并在前后端之间同步：

| 后端文件                               | 前端对应文件             | 一致性状态                        |
| -------------------------------------- | ------------------------ | --------------------------------- |
| `classroom/classroom.types.ts`         | `types/classroom.ts`     | ✅ 完全一致（仅 import 路径不同） |
| `schedule/schedule.types.ts`           | `types/schedule.ts`      | ✅ 仅 import 路径不同             |
| `rules/rule.types.ts`                  | `types/rule.ts`          | ✅ 仅 import 路径不同             |
| `timetable/timetable.types.ts`         | `types/timetable.ts`     | ✅ 仅 import 路径不同             |
| `auto-schedule/auto-schedule.types.ts` | `types/auto-schedule.ts` | ✅ 仅 import 路径不同             |

**验证方式**：运行 `bash script/verify-types-consistency.sh` 可一键验证一致性。

### 2.2 已修复的主要类型问题

| 问题                           | 处理方式                                    |
| ------------------------------ | ------------------------------------------- |
| 教室类型枚举允许小写值         | 统一改为 `RoomTypeEnum`（大写），前后端复用 |
| 课表导出格式允许 `pdf/excel`   | 收敛为只支持 `csv`                          |
| 旧规则中的小写教室类型影响调度 | service 层读写时归一化为大写                |
| 前端类型允许任意字符串         | 改为 Zod 枚举校验                           |
| 接口参数类型与实现不符         | 全部改用 Zod schema 做 runtime 校验         |

### 2.3 已确认

- [x] **确认 `classroom.schemas.ts`、`schedule.schemas.ts` 遗留文件**：已在 commit `1bff717` 中删除，内容合并入对应的 `.types.ts`，现有代码无引用，无需处理
- [x] **确认 `types/constraint.ts`（前端）引用情况**：该文件已不存在，无任何文件 import 它，不会 break；已顺手清理 `api/rule.ts` 中遗留的过期注释

---

## 3. 重跑 B 模块测试

### 3.1 测试范围

测试文档见 [b-test-cases.md](b-test-cases.md)，涵盖以下维度：

| 分类       | 编号范围                  | 说明                                             |
| ---------- | ------------------------- | ------------------------------------------------ |
| 环境与启动 | `B-ENV-001` ~ `B-ENV-005` | Docker 启动、健康检查、依赖管理                  |
| 核心接口   | `B-CLS-*`                 | 教室管理 CRUD                                    |
|            | `B-SCH-*`                 | 排课管理 CRUD + 冲突校验                         |
|            | `B-TTB-*`                 | 课表查询 + CSV 导出                              |
|            | `B-RUL-*`                 | 约束规则管理                                     |
|            | `B-ATS-*`                 | 自动排课任务                                     |
| 前端页面   | —                         | 页面点验清单（教室、排课、课表、规则、自动排课） |

### 3.2 测试流程

```
1. docker compose down -v && docker compose up -d --build
2. 等待后端 /api/health 返回 200
3. 验证种子数据已初始化
4. 按分类逐个验证接口
5. 前端页面点验
6. 记录结果到 b-test-cases.md
```

### 3.3 已通过测试

截至 `feat/B-integration`，以下测试已通过：

- `B-ENV-001` ~ `B-ENV-005`（环境启动）
- `B-SCH-001` ~ `B-SCH-003`（排课主链路）
- `B-TTB-002`（按教室查询课表）
- `B-TTB-001`（导出契约修复）
- `B-RUL-001`（规则枚举修复）
- `B-CLS-002`（教室设备字段修复）
- `B-AUTH-001` ~ `B-AUTH-008`（鉴权全链路，含自动化测试 14 条）

### 3.4 待补测

- [ ] 自动排课全链路（`B-ATS-*`）
- [x] 权限拦截验证 — 已完成（14 条 auth 测试通过）
- [ ] 边界情况：空列表、非法参数、并发写入
- [ ] `tsc --noEmit` + `pnpm lint` 通过

---

## 4. dev/B 分支公共组件修改检查

### 4.1 修改清单

`fix/B-test-env-0504` 相对 `main` 对公共代码的修改：

| 文件                           | 修改内容                                          | 影响范围                              | 风险评估                              |
| ------------------------------ | ------------------------------------------------- | ------------------------------------- | ------------------------------------- |
| `frontend/src/App.tsx`         | 新增 B 模块页面路由（教室、排课、课表、自动排课） | ✅ 只替换了原 `ComingSoon` 占位符组件 | **低** — 不影响已有路由               |
| `backend/src/app.ts`           | 注册 B 模块路由（`/api/v1/course-arrangement/*`） | ✅ 新增路由前缀                       | **低** — 与其他路由无冲突             |
| `frontend/package.json`        | 新增 `ahooks` 依赖                                | 全局 `pnpm-lock.yaml` 更新            | **低** — 纯新增依赖                   |
| `pnpm-workspace.yaml`          | 新增 `allowBuilds` 白名单                         | 全局依赖构建策略                      | **低** — 白名单仅为 Prisma/esbuild 等 |
| `.lintstagedrc.json`           | `cd frontend` 改为 `pnpm --dir frontend`          | lint-staged 执行方式                  | **低** — 等价写法调整                 |
| `backend/prisma/schema.prisma` | 新增 B 模块表                                     | 全局 schema                           | **中** — 需确认不与其他模块表冲突     |
| `backend/prisma/seed.ts`       | 新增 B 模块种子数据                               | 全局种子                              | **低** — 追加数据，不影响已有种子     |
| `docker-compose.yml`           | 命名卷、启动顺序优化                              | 全项目 Docker 环境                    | **低** — 不涉及业务逻辑               |
| `backend/src/__tests__/...`    | 格式化修改                                        | 其他模块测试                          | **极低** — 仅 prettier 格式化         |

### 4.2 需特别关注的点

| 关注点                    | 说明                                                                                    | 状态              |
| ------------------------- | --------------------------------------------------------------------------------------- | ----------------- |
| **B 模块路由前缀**        | 使用了 `/api/v1/course-arrangement/*`，与其他模块无重叠                                 | ✅ 安全           |
| **frontend/App.tsx**      | B 模块页面复用了已有的路由 path 模式                                                    | ✅ 安全           |
| **Prisma schema 表名**    | B 模块新增表是否使用了规范命名、是否与其它模块表有外键关联                              | ✅ 需确认开发规范 |
| **`ahooks` 依赖**         | B 模块前端使用了 `ahooks`，需确保不影响已有的 React Query 生态                          | 🔍 需确认         |
| **`pnpm-workspace.yaml`** | `allowBuilds` 对全项目生效，确认不会引入安全风险                                        | ✅ 列表明确       |
| **`shared` workspace 包** | B 模块仅使用了 `@stss/shared` 的 request 工具和 auth middleware，未修改 shared 内部逻辑 | ✅ 安全           |

### 4.3 结论

截至 `fix/B-test-env-0504`：

- **没有修改其他业务模块（A/C/D/E/F）的代码**
- **所有类型文件均由 B 模块自己维护**
- **公共基础设施的修改都是非侵入式的新增或等价调整**
- **前后端类型已通过自动脚本验证一致**

---

## 5. B 模块自动化测试补充

> 编写日期：2026-06-14
> 目标：仿照 A 模块（info-management）的测试模式，为 B 模块（course-arrangement）补充 Zod schema 单元测试和 service 层单元测试

---

### 5.1 测试模式参考

A 模块的测试文件位于 `backend/src/__tests__/modules/info-management/`，采用 Schema 单元测试模式：

**Schema 单元测试（`*.schemas.test.ts`）**

- 纯函数测试，无需 mock，速度快
- 测试模式：`describe('schemaName')` → `describe('valid inputs')` + `describe('invalid inputs')` + `describe('edge cases')`
- 使用 `schema.safeParse()` 验证输入，断言 `result.success` 和 `result.error.issues[0].message`
- 参考文件：`auth.schemas.test.ts`（48 tests）

测试环境配置位于 `backend/src/__tests__/setup.ts`，所有测试已共享该配置。

---

### 5.2 测试文件清单

仅编写 Schema 单元测试（纯函数，零 mock，成本低），共 **5 个文件**。

#### Schema 测试（5 个文件）

| #   | 文件路径                                                                         | 测试内容                                                                                                                                                                             | 预计用例数 |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1   | `backend/src/__tests__/modules/course-arrangement/classroom.schemas.test.ts`     | `RoomStatusEnum`、`RoomTypeEnum`、`equipmentSchema`、`classroomInPrismaSchema`、`classroomQuerySchema`、`pagedClassroomQuerySchema`、`updateClassroomSchema`、`availableQuerySchema` | 59 ✅      |
| 2   | `backend/src/__tests__/modules/course-arrangement/schedule.schemas.test.ts`      | `scheduleInPrismaSchema`（含 `.refine` 跨字段校验）、`createScheduleSchema`、`updateScheduleSchema`、`pagedGetSchedulesSchema`、`validateResponseSchema`                             | 38 ✅      |
| 3   | `backend/src/__tests__/modules/course-arrangement/rules.schemas.test.ts`         | `setSchedulingRuleSchema`（`targetType` 枚举）、`timeSlotSchema`、`getRulesListSchema`、`batchDeleteSchema`                                                                          | 40 ✅      |
| 4   | `backend/src/__tests__/modules/course-arrangement/timetable.schemas.test.ts`     | `exportTimetableSchema`（只允许 `csv` 格式）、`getByCourseOfferingSchema`、`getByClassroomSchema`、`pagedGetTimetablesSchema`                                                        | 40 ✅      |
| 5   | `backend/src/__tests__/modules/course-arrangement/auto-schedule.schemas.test.ts` | `createTaskSchema`、`taskIdSchema`、`autoScheduleTaskResponseSchema`（status 枚举）、`applyTaskResponseSchema`                                                                       | 32 ✅      |

**Schema 测试总计：209 tests，全部通过** ✅

#### 不需要测试的

- Service 层——涉及 Prisma mock，复杂度高、用例成本性价比低，暂不覆盖
- Controller 层——更适合集成测试或 e2e 测试
- 自动排课核心算法（DFS）——逻辑复杂，适合单独的算法测试
- 前端组件和页面逻辑——由 e2e 框架覆盖

---

### 5.3 测试重点说明

#### Schema 测试重点

| Schema                    | 特别需要验证的边界                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `classroomInPrismaSchema` | `capacity` 必须为正整数；`equipment.computerCount` 必须为 ≥0 整数；`status` 默认值为 `AVAILABLE`                    |
| `scheduleInPrismaSchema`  | `.refine` 跨字段校验：`startWeek <= endWeek`、`startPeriod <= endPeriod`；`dayOfWeek` 1-7 范围；`notes` 可为 `null` |
| `exportTimetableSchema`   | `format` 仅接受 `'csv'` 字面量；`targetType` 枚举值完整；`targetId` 不能为空                                        |
| `setSchedulingRuleSchema` | `targetType` 仅接受 `'teacher' \| 'course'`；`requiredRoomType` 复用 `RoomTypeEnum`（大写）                         |
| `createTaskSchema`        | `courseOfferingIds` 为可选数组；`semesterId` 不能为空                                                               |

#### 不需要测试的

- Service 层——涉及 Prisma mock，复杂度高、用例成本性价比低，暂不覆盖
- Controller 层——更适合集成测试或 e2e 测试
- 自动排课核心算法（DFS）——逻辑复杂，适合单独的算法测试
- 前端组件和页面逻辑——由 e2e 框架覆盖

---

### 5.4 验收标准

| 检查项       | 要求                                                 |
| ------------ | ---------------------------------------------------- |
| 测试文件数量 | 5 个（全部 Schema 测试）                             |
| 总测试数     | ≥ 150 tests                                          |
| 全部通过     | `pnpm test:run` 所有测试通过                         |
| 编译检查     | `tsc --noEmit` 无类型错误                            |
| Lint 检查    | `pnpm lint` 通过                                     |
| 无外部依赖   | 纯函数测试，不依赖数据库/网络                        |
| 测试命名     | 中文描述（如 `应该拒绝空教室ID`），与 A 模块风格一致 |

---

### 5.5 执行计划

```
1. ─ 建目录 backend/src/__tests__/modules/course-arrangement/
2. ├── classroom.schemas.test.ts     # 教室 Schema 单元测试 (~40 tests)
3. ├── schedule.schemas.test.ts      # 排课 Schema 单元测试 (~35 tests)
4. ├── rules.schemas.test.ts         # 规则 Schema 单元测试 (~30 tests)
5. ├── timetable.schemas.test.ts     # 课表 Schema 单元测试 (~25 tests)
6. └── auto-schedule.schemas.test.ts # 自动排课 Schema 单元测试 (~20 tests)
```

每写完一个文件执行 `pnpm test:run` 验证通过，再写下一个。

---

## 6. 分支合并检查清单

> 供大组长验收使用

| 检查项        | 要求                                             | 状态             |
| ------------- | ------------------------------------------------ | ---------------- |
| 鉴权          | 所有接口已接入 authMiddleware，自动化测试覆盖    | ✅ 14 条测试通过 |
| 类型一致性    | 前后端类型内容一致                               | ✅ 已验证        |
| 非 B 模块文件 | 未动其他模块业务代码                             | ✅ 已验证        |
| 公共组件修改  | 非侵入式，已有功能不受影响                       | ✅ 已梳理        |
| 编译          | `tsc --noEmit` 通过                              | 🔄 需要跑        |
| lint          | `pnpm lint` 通过                                 | 🔄 需要跑        |
| 自动化测试    | Schema 测试 ≥ 150 + Service 测试 ≥ 130，全部通过 | ⏳ 待补充        |
| 文档          | 更新记录、测试用例、用户手册已更新               | ✅ 已更新        |
