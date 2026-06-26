# C 组智能选课前端手动测试指南

本文档用于在本地 Docker 环境中手动验证 C 组智能选课前端页面。覆盖学生选课、培养方案确认、课表、AI 推荐、教务阶段管理、教务手动加课和教师名单导出。

## 1. 环境准备

前端地址：

```text
http://localhost:5173
```

如果容器还未启动，执行：

```bash
docker compose up -d postgres redis server web
```

首次启动可能需要等待 `server` 和 `web` 安装依赖、生成 Prisma Client 并启动开发服务。查看日志：

```bash
docker compose logs -f server web
```

确认数据库已同步并灌入 C 组手测数据：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/server db:generate && pnpm --filter @stss/server db:push'
./scripts/codex-docker-run.sh 'pnpm --filter @stss/server db:seed:c-manual'
```

可选：确认手测数据规模。

```bash
docker compose exec -T postgres psql -U stss -d stss -P pager=off -c "SELECT 'courses' name, count(*) FROM courses WHERE code LIKE 'CMAN-%' UNION ALL SELECT 'offerings', count(*) FROM course_offerings WHERE id LIKE 'cmanual-offering-%' UNION ALL SELECT 'schedules', count(*) FROM schedules WHERE id LIKE 'cmanual-schedule-%' UNION ALL SELECT 'enrollments', count(*) FROM enrollments WHERE id LIKE 'cmanual-enrollment-%' UNION ALL SELECT 'scores', count(*) FROM scores WHERE id LIKE 'cmanual-score-%' UNION ALL SELECT 'confirmations', count(*) FROM student_curriculum_confirmations WHERE id LIKE 'cmanual-confirmation-%';"
```

期望数据大致为：

| 数据 | 期望数量 |
| --- | ---: |
| `CMAN-*` 课程 | 45 |
| `cmanual-*` 开课 | 48 |
| 排课 | 32 |
| 选课记录 | 28 |
| 成绩 | 13 |
| 培养方案确认 | 4 |

## 2. 测试账号

| 角色 | 账号 | 密码 | 用途 |
| --- | --- | --- | --- |
| 学生 | `cstudent01` | `student123` | 正常选课、AI 推荐、课表 |
| 学生 | `cstudent02` | `student123` | 未确认培养方案 |
| 学生 | `cstudent03` | `student123` | 培养方案确认过期 |
| 学生 | `cstudent04` | `student123` | 接近最大学分上限 |
| 学生 | `cstudent05` | `student123` | 手动加课目标 |
| 教务 | `academic` | `Admin123` | 阶段管理、手动加课 |
| 教师 | `cteacher01` | `teacher123` | 教师名单 |
| 教师 | `cteacher02` | `teacher123` | 教师名单权限对照 |

登录页：

```text
http://localhost:5173/login
```

如果登录状态异常，先点右上角退出登录。仍异常时，在浏览器控制台执行：

```js
localStorage.removeItem('auth-storage')
location.href = '/login'
```

## 3. 学生端测试

学生菜单路径：`智能选课`

直接 URL：

| 页面 | URL |
| --- | --- |
| 课程列表 | `/selection/courses` |
| 培养方案 | `/selection/curriculum` |
| 我的课表 | `/selection/timetable` |
| AI 推荐 | `/selection/ai` |

### 3.1 正常学生选课

账号：`cstudent01 / student123`

1. 打开 `/selection/curriculum`。
2. 期望看到 `C Manual 2026 Curriculum`，确认状态应为已确认或无需再次确认。
3. 打开 `/selection/courses`。
4. 期望顶部出现“选课准入已生效”，描述里有当前在线人数。
5. 搜索 `CMAN-009`。
6. 点课程详情，确认能打开详情抽屉。
7. 点选课，确认弹窗后提交。
8. 期望提示选课成功，列表状态刷新，学分进展更新。

### 3.2 先修课不满足

账号：`cstudent01 / student123`

1. 打开 `/selection/courses`。
2. 搜索 `CMAN-011`。
3. 尝试选课。
4. 期望失败，并提示未满足先修课程。

### 3.3 时间冲突

账号：`cstudent01 / student123`

1. 打开 `/selection/courses`。
2. 搜索 `CMAN-020`。
3. 尝试选课。
4. 期望失败，并提示课程时间冲突。

注意：建议先测试时间冲突，再测试退课。如果先退掉 `CMAN-001`，冲突条件可能消失。

### 3.4 满员课程

账号：`cstudent01 / student123`

1. 打开 `/selection/courses`。
2. 搜索 `CMAN-044`。
3. 尝试选课。
4. 期望列表显示不可选，或提交后提示容量已满。

### 3.5 退课成功

账号：`cstudent01 / student123`

1. 打开 `/selection/courses`。
2. 找到已选课程，例如 `CMAN-008`。
3. 点退选。
4. 期望退课成功，课程状态和课表刷新。

当前手测阶段 `cmanual-period-adjustment` 的 `allow_drop=true`，因此应允许退课。

### 3.6 未确认培养方案

账号：`cstudent02 / student123`

1. 打开 `/selection/courses`。
2. 期望课程不可正式选择，原因包含“请先确认当前培养方案”。
3. 打开 `/selection/curriculum`。
4. 点击“确认培养方案”。
5. 回到 `/selection/courses`。
6. 搜索 `CMAN-025`，尝试选课。
7. 期望确认后可以进入正常选课流程。

### 3.7 培养方案确认过期

账号：`cstudent03 / student123`

1. 打开 `/selection/curriculum`。
2. 期望显示需要重新确认。
3. 点击确认。
4. 回到 `/selection/courses`。
5. 期望培养方案确认阻断解除。

### 3.8 最大学分上限

账号：`cstudent04 / student123`

1. 打开 `/selection/courses`。
2. 搜索 `CMAN-021`。
3. 尝试选课。
4. 期望失败，并提示超过当前阶段最大学分或类似学分上限错误。

### 3.9 我的课表

账号：`cstudent01 / student123`

1. 打开 `/selection/timetable`。
2. 期望能看到网格课表。
3. 若刚才完成选课或退课，刷新后课表应同步变化。

### 3.10 AI 推荐

账号：`cstudent01 / student123` 或 `cstudent04 / student123`

1. 打开 `/selection/ai`。
2. 推荐参数建议：
   - 返回数量：`5`
   - 目标学分：`18`
   - 风险偏好：低风险或适中
   - 勾选“优先毕业进度”“优先必修”
   - 偏好说明：`这学期想稳妥一点，不要课太满，也尽量别影响毕业进度。`
3. 点击“生成建议”。
4. 期望：
   - 有 AI key 时，可能返回完整 AI 推荐。
   - 无 AI key 或服务不可用时，应降级为规则或模板建议。
   - 页面不能崩溃，普通选课流程不受影响。
5. 对推荐课程点击“解释”。
6. 期望出现解释内容，且不会直接创建选课记录。

## 4. 教务端测试

账号：`academic / Admin123`

直接 URL：

| 页面 | URL |
| --- | --- |
| 阶段管理 | `/selection/admin/periods` |
| 手动加课 | `/selection/admin/manual-enrollment` |

### 4.1 阶段管理

1. 打开 `/selection/admin/periods`。
2. 期望看到 `cmanual-period-adjustment` 相关阶段。
3. 重点检查：
   - phase 为 `ADJUSTMENT`
   - `allow_drop=true`
   - `max_credits=30`
   - 当前 active

注意：不建议随意修改 active 阶段时间，否则会影响学生端选课准入。

### 4.2 手动加课成功

打开 `/selection/admin/manual-enrollment`，填写：

| 字段 | 值 |
| --- | --- |
| 学生ID | `4021725e-2e3f-494f-8171-3b82a0c89c8d` |
| 课程开设ID | `cmanual-offering-021` |
| 加课原因 | `C组手动验收：教务手动加课` |

该学生为 `cstudent05`。

期望：提交成功，并显示 Enrollment ID、课程容量、剩余容量、审计状态。

### 4.3 手动加课重复拦截

1. 使用 4.2 中同样的数据再次提交。
2. 期望失败，并提示重复选课或类似错误。

### 4.4 手动加课满员拦截

填写：

| 字段 | 值 |
| --- | --- |
| 学生ID | `bfdf9d9c-caea-41db-838b-fb7ba03a5b2b` |
| 课程开设ID | `cmanual-offering-044` |
| 加课原因 | `C组手动验收：满员课程加课拦截` |

该学生为 `cstudent02`。

期望：提交失败，并提示容量不足或课程已满。

## 5. 教师端测试

账号：`cteacher01 / teacher123`

直接 URL：

```text
/selection/teacher/roster
```

### 5.1 本人课程名单

1. 打开 `/selection/teacher/roster`。
2. 课程开设 ID 填：`cmanual-offering-001`。
3. 状态选择“仅已选”。
4. 点击查询。
5. 期望显示学生名单，至少有多条记录。
6. 点击“导出名单”。
7. 期望浏览器开始下载 xlsx 文件。

### 5.2 教师越权拦截

账号：`cteacher01 / teacher123`

1. 打开 `/selection/teacher/roster`。
2. 课程开设 ID 填：`cmanual-offering-044`。
3. 点击查询。
4. 期望提示无权查看，因为该开课属于 `cteacher02`。

## 6. 常用关键数据

### 6.1 学生主键

| 学生 | user_id |
| --- | --- |
| `cstudent01` | `5e82da71-171f-4244-9af0-f0de3165e653` |
| `cstudent02` | `bfdf9d9c-caea-41db-838b-fb7ba03a5b2b` |
| `cstudent03` | `3f8af8ea-31e6-4e44-99c5-82bae2d7dacc` |
| `cstudent04` | `556f77d4-63d1-406f-8ca0-e61133d99127` |
| `cstudent05` | `4021725e-2e3f-494f-8171-3b82a0c89c8d` |
| `cstudent06` | `9e205c60-780e-4a91-8dc4-da00485748f7` |

### 6.2 关键开课

| 开课 ID | 用途 |
| --- | --- |
| `cmanual-offering-009` | 正常可选 |
| `cmanual-offering-011` | 先修不满足 |
| `cmanual-offering-020` | 时间冲突 |
| `cmanual-offering-021` | 手动加课目标 |
| `cmanual-offering-044` | 满员课程 |
| `cmanual-offering-001` | `cteacher01` 名单查询 |

## 7. 验收判定标准

- 页面不能白屏。
- 接口失败时必须有明确错误提示，不能静默失败。
- 学生端不能传或选择 studentId。
- 未确认培养方案必须阻断正式选课。
- 先修、冲突、满员、超学分必须由后端拦截。
- 退课是否成功取决于当前阶段 `allow_drop`。
- 手动加课必须填写 reason。
- 教师只能查本人课程名单。
- AI 推荐失败时应降级，不应影响普通选课流程。

## 8. 排查方式

浏览器 DevTools Network：

- `401/403`：多半是登录角色不对或 token 旧了，退出重登。
- `422`：通常是业务校验失败，查看响应 message。
- `500`：后端异常，需要看 server 日志。

后端日志：

```bash
docker compose logs -f server
```

前端日志：

```bash
docker compose logs -f web
```

重新灌 C 组手测数据：

```bash
./scripts/codex-docker-run.sh 'pnpm --filter @stss/server db:seed:c-manual'
```
