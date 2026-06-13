# A 模块信息管理 API 更新记录

本文用于配合 `problem.md` 交接当前处理进度，当前记录范围聚焦 `docs/apis/A-information-management.md` 中 `## 三、用户管理 API` 与 `## 四、院系管理 API` 已完成和刚完成的修复。

## 本阶段已处理

### 3.1 获取用户列表

#### 后端更新

- `backend/prisma/schema.prisma`
  - `User` 模型已新增软删除字段 `deletedAt`（映射数据库字段 `deleted_at`）。
- `backend/prisma/migrations/20260613174000_add_user_soft_delete/migration.sql`
  - 已新增 `users.deleted_at` 字段迁移脚本。
  - 已补 `users_deleted_at_idx` 索引，用于软删除筛选和排序。

- `backend/src/modules/info-management/users.service.ts`
  - `getUsers` 已改为直接基于用户表查询软删除数据，不再依赖删除日志快照拼接。
  - `include_deleted=true` 时，已删除用户与未删除用户参与统一排序、统一分页。
  - `keyword`、`status`、`role` 过滤已统一作用于软删除用户和未删除用户。
  - 已删除用户在列表中以 `status: 'DELETED'` 返回。

#### 前端情况

- 前端原有 `includeDeleted` 参数和列表筛选入口可直接复用，无需额外改动。

### 3.4 创建用户

#### 后端更新

- `backend/src/modules/info-management/users.types.ts`
  - `createUserSchema` 已新增 `student`、`teacher`、`admin` 嵌套字段。
  - 已支持文档中的 snake_case 请求字段：
    - `student.student_number`
    - `student.major_id`
    - `student.class_name`
    - `teacher.teacher_number`
    - `teacher.department_id`
    - `teacher.office_location`
    - `admin.admin_type`
    - `admin.department_id`
  - 仍兼容前端/内部 camelCase 字段。
  - 管理员类型使用 Prisma 实际枚举 `AdminType`：`ACADEMIC`、`SUPER`、`SECURITY`。

- `backend/src/modules/info-management/users.service.ts`
  - `createUser` 已改为事务创建。
  - 创建用户时会同时创建：
    - `User`
    - `UserRole`
    - 可选 `Student`
    - 可选 `Teacher`
    - 可选 `Admin`
  - 如果扩展记录创建失败，事务会回滚，避免只创建基础用户但缺少身份扩展记录。
  - 创建用户时已记录 `SystemLog`。

#### 前端更新

- `frontend/src/shared/types/index.ts`
  - 新增 `CreateUserDTO`，用于替代 `usersApi.create` 原来的 `Partial<UserDetail>`。
  - `UserFormData` 已新增 `student`、`teacher`、`admin` 扩展字段。
  - `UserDetail.admin.adminType` 已从错误的 `DEPARTMENT` 修正为 `ACADEMIC`。

- `frontend/src/modules/info-management/api/users.ts`
  - `usersApi.create` 入参改为 `CreateUserDTO`。
  - 创建用户请求会将前端 camelCase 转为文档要求的 snake_case。

- `frontend/src/modules/info-management/pages/users/UserForm.tsx`
  - 新建用户时会根据选中的角色显示扩展信息表单：
    - 学生角色：学号、专业、年级、班级
    - 教师角色：工号、院系、职称、办公地点
    - 管理员角色：管理员类型、院系
  - 新建用户时不再显示或提交 `status` 字段，符合文档 3.4。

- `frontend/src/modules/info-management/pages/users/UserList.tsx`
  - 创建用户分支已显式校验 `password`，满足 `CreateUserDTO` 的必填要求。

### 3.5 批量创建用户

#### 后端更新

- `backend/src/modules/info-management/users.types.ts`
  - `batchCreateUsersSchema` 已支持 `student`、`teacher`、`admin` 扩展信息。

- `backend/src/modules/info-management/users.service.ts`
  - 批量创建返回结构已符合文档：`total`、`success_count`、`fail_count`、`results`。
  - 批量创建服务已在事务内创建用户、角色和扩展身份记录。

#### 前端更新

- `frontend/src/modules/info-management/api/users.ts`
  - `usersApi.batchCreate` 返回类型已对齐后端批量创建结果。

- `frontend/src/modules/info-management/pages/users/BatchImportModal.tsx`
  - CSV 模板和解析逻辑已覆盖学生、教师、管理员扩展身份字段。

### 3.6 更新用户

#### 前端更新

- `frontend/src/shared/types/index.ts`
  - 已新增 `UpdateUserDTO`，替代 `Partial<UserDetail>`。

- `frontend/src/modules/info-management/api/users.ts`
  - `usersApi.update` 已将前端 camelCase 转为文档要求的 snake_case。
  - 已统一 `getById/create/update/updateStatus` 的返回用户结构，兼容列表接口和详情接口 `roles` 形状不一致的问题。

- `frontend/src/modules/info-management/pages/users/UserList.tsx`
  - 编辑用户时基础信息仍走 `PUT /users/:id`。
  - 状态变化时额外调用 `PATCH /users/:id/status`，不再错误地把 `status` 提交给更新用户接口。
  - 编辑前会先拉取 `GET /users/:id` 详情，再打开表单。

### 3.8 修改用户状态

#### 后端更新

- `backend/src/modules/info-management/users.service.ts`
  - `updateStatus` 已使用 `reason` 写入状态修改系统日志。

#### 前端更新

- `frontend/src/modules/info-management/api/users.ts`
  - `usersApi.updateStatus(id, status, reason)` 已支持发送 `reason`。

- `frontend/src/modules/info-management/pages/users/UserStatusModal.tsx`
  - 已新增单个用户状态修改弹窗，支持填写目标状态和修改原因。

- `frontend/src/modules/info-management/pages/users/UserList.tsx`
  - 用户列表操作列已新增“状态”独立入口，不再只能通过编辑表单间接修改状态。

#### 测试更新

- `backend/src/__tests__/unit/modules/info-management/users.controller.test.ts`
  - 已按当前 controller/service 签名更新断言，`updateStatus` 单测已兼容第三个 `req` 参数。

### 3.9 批量修改状态

#### 后端更新

- `backend/src/modules/info-management/users.types.ts`
  - `batchUpdateStatusSchema` 已新增 `reason` 字段支持。

- `backend/src/modules/info-management/users.controller.ts`
  - `batchUpdateStatus` 已将 `req` 传入 service，用于写入操作日志上下文。

- `backend/src/modules/info-management/users.service.ts`
  - 批量状态修改时已按用户写入 `update_status` 系统日志。
  - 日志 `details` 已包含 `from_status`、`to_status`、`reason` 和 `batch` 标记。

#### 前端更新

- `frontend/src/modules/info-management/api/users.ts`
  - `usersApi.batchUpdateStatus` 已支持发送 `reason`。

- `frontend/src/modules/info-management/pages/users/BatchStatusModal.tsx`
  - 批量状态修改弹窗已新增“修改原因”输入框。
  - 提交时会将 `reason` 一并发送到后端。

### 3.10 修改密码（用户自己）

#### 后端更新

- `backend/src/modules/info-management/users.routes.ts`
  - `/:id/password` 路由已移除 `requireSelfOrAdmin('admin', 'super_admin')`。
  - 当前权限表达为“已登录用户可访问路由 + controller 强制只能修改本人密码”，与接口语义一致。

#### 前端更新

- `frontend/src/modules/info-management/pages/Profile.tsx`
  - 本人修改密码入口继续保留在 `/profile` 页面。

- `frontend/src/modules/info-management/pages/users/UserList.tsx`
  - 已移除用户列表中的“修改密码”误导性入口。

- `frontend/src/modules/info-management/pages/users/ChangePasswordModal.tsx`
  - 已删除未使用且语义错误的“管理员为用户修改密码”弹窗组件。

### 3.12 / 3.13 / 3.14 / 3.15 / 3.16 收尾整理

#### 前端更新

- `frontend/src/modules/info-management/pages/users/RoleAssignModal.tsx`
  - 角色分配弹窗已改为内部使用角色 ID 进行分配和撤销，不再依赖后端对角色 code 的兼容能力。
  - 保持界面展示角色名称，但提交严格按文档使用角色 ID。

#### 文档同步

- `problem.md`
  - `3.11` 到 `3.16` 中已满足文档要求的项已统一标注为“已解决”。

### 3.16 获取系统日志

#### 前端更新

- `frontend/src/shared/types/index.ts`
  - 新增 `SystemLogItem`，将 `details` 修正为对象类型。

- `frontend/src/modules/info-management/api/users.ts`
  - `usersApi.getLogs` 已按文档发送 `user_id`、`start_date`、`end_date`、`page_size`。
  - 扩展参数 `resource_type` 仍保留，作为非破坏性扩展。

- `frontend/src/modules/info-management/pages/users/SystemLogs.tsx`
  - 日志详情展示已兼容对象型 `details`。

### 3.18 更新学生专业

#### 后端更新

- `backend/src/modules/info-management/users.service.ts`
  - `updateStudentMajor` 已补系统日志记录，满足文档说明。

#### 前端更新

- `frontend/src/modules/info-management/api/users.ts`
  - 已新增 `usersApi.updateStudentMajor`。

- `frontend/src/modules/info-management/pages/users/UserForm.tsx`
  - 编辑学生用户时已提供专业变更入口。

- `frontend/src/modules/info-management/pages/users/UserList.tsx`
  - 提交编辑时，如学生专业变化，会额外调用 `PATCH /users/:id/student/major`。

### 3.19 更新教师院系

#### 后端更新

- `backend/src/modules/info-management/users.service.ts`
  - `updateTeacherDepartment` 已补系统日志记录。

#### 前端更新

- `frontend/src/modules/info-management/api/users.ts`
  - 已新增 `usersApi.updateTeacherDepartment`。

- `frontend/src/modules/info-management/pages/users/UserForm.tsx`
  - 编辑教师用户时已提供院系变更入口。

- `frontend/src/modules/info-management/pages/users/UserList.tsx`
  - 提交编辑时，如教师院系变化，会额外调用 `PATCH /users/:id/teacher/department`。

### 3.20 更新管理员院系

#### 后端更新

- `backend/src/modules/info-management/users.service.ts`
  - `updateAdminDepartment` 已补系统日志记录。

#### 前端更新

- `frontend/src/modules/info-management/api/users.ts`
  - 已新增 `usersApi.updateAdminDepartment`。

- `frontend/src/modules/info-management/pages/users/UserForm.tsx`
  - 编辑管理员用户时已提供院系变更入口。

- `frontend/src/modules/info-management/pages/users/UserList.tsx`
  - 提交编辑时，如管理员院系变化，会额外调用 `PATCH /users/:id/admin/department`。

## 四、院系管理 API

### 4.1 获取院系列表

#### 后端更新

- `backend/prisma/schema.prisma`
  - `Department` 模型已补充稳定时间字段：
    - `createdAt` -> `created_at`
    - `updatedAt` -> `updated_at`

- `backend/prisma/migrations/20260613213000_add_department_timestamps/migration.sql`
  - 已新增 `departments.created_at` 与 `departments.updated_at` 字段迁移脚本。

- `backend/src/modules/info-management/departments.routes.ts`
  - 院系列表 `created_at` 已改为直接取 `Department.createdAt`。
  - 已移除通过 `SystemLog` 回填 `created_at` / `updated_at` 的旧逻辑。

#### 前端情况

- 前端列表页原有 `page_size`、关键词搜索、分页展示逻辑可直接复用，无需额外调整。

### 4.2 获取院系详情

#### 后端更新

- `backend/src/modules/info-management/departments.types.ts`
  - `departmentIdSchema` 已改为严格 UUID 校验。
  - 非法 `:id` 现在会按参数错误返回 `400`，不再误落为 `404`。

- `backend/src/__tests__/integration/modules/info-management/departments.routes.integration.test.ts`
  - 已拆分测试语义：
    - 合法但不存在的 UUID 返回 `404`
    - 非法 UUID 返回 `400`

#### 前端更新

- `frontend/src/modules/info-management/components/DepartmentDetail.tsx`
  - 院系详情弹窗已补充展示 `updatedAt`。

### 4.3 创建院系

#### 前端更新

- `frontend/src/modules/info-management/types/departments.ts`
  - 已新增 `DepartmentSummary`，用于表示创建/更新接口返回的精简结构。

- `frontend/src/modules/info-management/api/departments.ts`
  - `departmentsApi.create` 返回类型已从错误的完整 `Department` 改为真实响应：
    - `{ id, name, code }`

#### 说明

- 页面逻辑本身未依赖创建接口返回完整院系对象，因此本次主要是类型收敛与接口事实对齐。

### 4.4 更新院系

#### 后端更新

- `backend/src/modules/info-management/departments.routes.ts`
  - 更新院系前已补充“名称重复”校验。
  - 当更新后的名称与其他院系重复时，会返回 `409` 与 `部门名称已存在`。

- `backend/src/__tests__/integration/modules/info-management/departments.routes.integration.test.ts`
  - 已新增“更新为重复院系名称时应该返回 409”的集成测试。

#### 前端更新

- `frontend/src/modules/info-management/api/departments.ts`
  - `departmentsApi.update` 返回类型已从错误的完整 `Department` 改为真实响应：
    - `{ id, name, code }`

### 4.5 删除院系

#### 后端更新

- 后端删除接口本身可用，且 `:id` 的 UUID 校验问题已随 4.2 一并修复。
- 后端严格删除阻塞条件保持不变：
  - `majors`
  - `teachers`
  - `admins`
  - `courses`
- `backend/src/modules/info-management/departments.routes.ts`
  - 院系列表和详情响应已补充 `admin_count`、`course_count`，用于前端展示完整删除阻塞信息。

#### 前端更新

- `frontend/src/modules/info-management/types/departments.ts`
  - `Department` 已新增可选 `adminCount`、`courseCount`。

- `frontend/src/modules/info-management/pages/departments/DepartmentList.tsx`
  - 删除确认弹窗已补充管理员关联、课程关联提示。
  - 删除失败提示已兼容请求拦截器抛出的 `Error.message`。

- `frontend/src/modules/info-management/components/DepartmentDetail.tsx`
  - 院系详情已展示管理员数量、课程数量。

#### 文档同步

- `docs/apis/A-information-management.md`
  - 4.1 / 4.2 示例响应已补充 `admin_count`、`course_count`。
  - 4.5 删除前置条件已改为“院系下无关联教师、专业、管理员、课程”。
  - 4.5 成功消息已对齐后端真实返回：`院系删除成功`。

## 当前进行中

- 暂无。

## 已验证

- `pnpm --filter @stss/server typecheck` 通过。
- `pnpm --filter @stss/web typecheck` 通过。
- `UsersController > updateStatus > 应该成功修改用户状态` 单测已通过。
- `pnpm --filter @stss/server db:generate` 已完成，Prisma Client 已包含 `deletedAt` 软删除字段。

## 当前未处理 / 残留问题

- 未跑完整测试套件；当前本地集成测试受 `localhost:5432` 和 `127.0.0.1:6379` 不可达影响。
- `3.9 批量修改状态` 仍未记录修改原因。
- `3.10 修改密码（用户自己）` 的路由权限表达仍不够清晰。
- 头像旧文件异步清理仍未处理。

## 注意事项

- 当前前端通过角色 code 判断扩展身份表单显示：
  - `student`
  - `teacher`
  - `admin`、`super_admin`、`security_admin`
- 如果角色 code 与数据库种子数据不一致，需要同步调整前端判断逻辑。
- 管理员扩展记录的 `admin_type` 必须使用 Prisma 枚举值：`ACADEMIC`、`SUPER`、`SECURITY`。
