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

## 五、专业管理 API

### 5.1 获取专业列表

#### 后端更新

- `backend/prisma/schema.prisma`
  - `Major` 模型已补充稳定字段：
    - `description`
    - `createdAt` -> `created_at`
    - `updatedAt` -> `updated_at`

- `backend/prisma/migrations/20260614093000_add_major_timestamps/migration.sql`
  - 已新增 `majors.description`、`majors.created_at`、`majors.updated_at` 字段迁移脚本。

- `backend/src/modules/info-management/major.service.ts`
  - 专业列表 `created_at` 已改为直接取 `Major.createdAt`。
  - 已移除通过 `SystemLog` 回填 `created_at` 的旧逻辑。
  - 列表已按名称稳定排序。

#### 前端情况

- 前端列表页已有 `page_size`、`department_id`、关键词搜索、分页展示逻辑，可直接复用。

### 5.2 获取专业详情

#### 后端更新

- `backend/src/modules/info-management/major.types.ts`
  - `getMajorIdSchema` 已改为严格 UUID 校验。

- `backend/src/modules/info-management/major.routes.ts`
  - 专业更新、删除路由已补充 `:id` 参数校验。

- `backend/src/modules/info-management/major.service.ts`
  - 专业详情 `created_at`、`updated_at` 已改为直接取 `Major.createdAt`、`Major.updatedAt`。
  - `description` 已改为使用 `Major.description`，不再错误返回院系描述。

### 5.3 创建专业

#### 后端更新

- `backend/src/modules/info-management/major.service.ts`
  - 创建前已补充院系存在校验。
  - 创建前已补充专业名称、专业代码重复校验。
  - 创建接口返回已收敛为文档结构：`{ id, name, code }`。

- `backend/src/modules/info-management/major.controller.ts`
  - 创建成功消息已对齐文档：`专业创建成功`。

#### 前端更新

- `frontend/src/modules/info-management/types/majors.ts`
  - 新增 `MajorSummary`，用于表示创建/更新接口返回的精简结构。

- `frontend/src/modules/info-management/api/majors.ts`
  - `majorsApi.create` 返回类型已从错误的完整 `Major` 改为真实响应 `{ id, name, code }`。

### 5.4 更新专业

#### 后端更新

- `backend/src/modules/info-management/major.types.ts`
  - `updateMajorSchema` 已要求至少提供 `name` 或 `total_credits` 之一。

- `backend/src/modules/info-management/major.service.ts`
  - 更新前已补充“专业名称重复”校验。
  - 更新接口返回已收敛为文档结构：`{ id, name, code }`。

- `backend/src/modules/info-management/major.controller.ts`
  - 更新成功消息已对齐文档：`专业更新成功`。

#### 前端更新

- `frontend/src/modules/info-management/api/majors.ts`
  - `majorsApi.update` 返回类型已从错误的完整 `Major` 改为真实响应 `{ id, name, code }`。

### 5.5 删除专业

#### 后端更新

- `backend/src/modules/info-management/major.service.ts`
  - 删除前已显式校验专业下是否有关联学生。
  - 如果存在关联学生，会返回 `409` 与 `专业下存在关联学生，无法删除`。

- `backend/src/modules/info-management/major.controller.ts`
  - 删除成功消息已对齐文档：`专业已删除`。

#### 前端情况

- 前端删除弹窗已有学生数量提示，可直接复用。

#### 测试更新

- `backend/src/__tests__/integration/modules/info-management/majors.routes.integration.test.ts`
  - 已更新创建、更新、删除成功消息断言。
  - 已新增更新/删除非法 UUID 返回 `400` 的断言。
  - 已新增专业下有关联学生时删除返回 `409` 的断言。

## 六、课程管理 API

### 6.1 获取课程列表

#### 后端更新

- `backend/src/modules/info-management/course.controller.ts`
  - 课程列表成功响应 message 已显式对齐文档为 `success`。

#### 前端更新

- `frontend/src/modules/info-management/types/courses.ts`
  - 新增课程列表、详情、创建、更新、批量创建相关类型。

- `frontend/src/modules/info-management/api/courses.ts`
  - 新增 `coursesApi.getList`，按文档发送 `page_size`、`department_id`、`course_type`、`status`。

- `frontend/src/modules/info-management/components/CourseTable.tsx`
  - 新增课程表格，展示文档列表字段。

- `frontend/src/modules/info-management/pages/courses/CourseList.tsx`
  - `/info/courses` 已从占位页改为课程列表页。
  - 已支持关键词搜索、院系筛选、课程类型筛选、状态筛选和分页。

### 6.2 获取课程详情

#### 后端更新

- `backend/prisma/schema.prisma`
  - `Course.updatedAt` 已补 `@default(now())`，避免已有表通过 `prisma db push` 新增必填更新时间字段时报错。

- `backend/src/modules/info-management/course.controller.ts`
  - 课程详情成功响应 message 已显式对齐文档为 `success`。

#### 前端更新

- `frontend/src/modules/info-management/api/courses.ts`
  - 新增 `coursesApi.getById`。

- `frontend/src/modules/info-management/components/CourseDetail.tsx`
  - 新增课程详情弹窗，展示基础信息、考核方式、课程描述、先修课程、创建/更新时间。

### 6.3 创建课程

#### 后端更新

- `backend/src/modules/info-management/course.service.ts`
  - 创建前已显式校验课程代码重复、院系存在、教师存在、先修课程存在。
  - `prerequisite_ids` 为空或未传时不再调用空 `createMany`。

- `backend/src/modules/info-management/course.controller.ts`
  - 创建成功消息已对齐文档：`课程创建成功`。

#### 前端更新

- `frontend/src/modules/info-management/api/courses.ts`
  - 新增 `coursesApi.create`，请求字段已转为文档 snake_case。

- `frontend/src/modules/info-management/components/CourseModal.tsx`
  - 新增课程创建表单。

### 6.4 更新课程

#### 后端更新

- `backend/src/modules/info-management/course.types.ts`
  - `updateCourseSchema` 已要求至少提供一个更新字段。

- `backend/src/modules/info-management/course.service.ts`
  - 更新先修课程前已显式校验先修课程存在。
  - 更新接口返回已收敛为 `{ id, code, name }`。

- `backend/src/modules/info-management/course.controller.ts`
  - 更新成功消息已对齐文档：`课程更新成功`。

#### 前端更新

- `frontend/src/modules/info-management/api/courses.ts`
  - 新增 `coursesApi.update`。

- `frontend/src/modules/info-management/components/CourseModal.tsx`
  - 编辑课程时按文档提交 `name`、`credits`、`description`、`prerequisite_ids`。

### 6.5 删除课程

#### 后端更新

- `backend/src/modules/info-management/course.service.ts`
  - 删除前已显式检查课程是否被培养方案引用。
  - 如果存在引用，会返回 `409` 与 `课程已被培养方案引用，无法删除`。

- `backend/src/modules/info-management/course.controller.ts`
  - 删除成功消息已对齐文档：`课程已删除`。

#### 前端更新

- `frontend/src/modules/info-management/pages/courses/CourseList.tsx`
  - 课程列表已提供删除入口和确认弹窗。

### 6.6 批量创建课程

#### 后端更新

- `backend/src/modules/info-management/course.service.ts`
  - 批量创建结果 `index` 已改为数字下标。
  - 每条课程创建时已复用课程代码重复、院系存在、教师存在、先修课程存在校验。

#### 前端更新

- `frontend/src/modules/info-management/api/courses.ts`
  - 新增 `coursesApi.batchCreate`。

- `frontend/src/modules/info-management/components/CourseBatchModal.tsx`
  - 新增 CSV 文本批量创建课程弹窗。

- `frontend/src/modules/info-management/pages/courses/CourseList.tsx`
  - 课程列表已提供批量创建入口。

#### 测试更新

- `backend/src/__tests__/modules/info-management/course.service.test.ts`
  - 已补课程代码重复、先修课程不存在、课程被培养方案引用、批量数字下标等断言。

- `backend/src/__tests__/integration/modules/info-management/courses.routes.integration.test.ts`
  - 已更新创建、更新、删除成功消息断言。
  - 已新增课程被培养方案引用时删除返回 `409` 的断言。

## 七、培养方案管理 API

### 7.1 / 7.2 获取培养方案列表和详情

#### 后端更新

- `backend/prisma/schema.prisma`
  - `Curriculum` 模型已新增稳定的 `createdAt`、`updatedAt` 字段。

- `backend/prisma/migrations/20260614093000_add_major_timestamps/migration.sql`
  - 已补充 `curriculums.created_at`、`curriculums.updated_at` 字段迁移，使用默认时间避免已有数据表推送失败。

- `backend/src/modules/info-management/curriculums.service.ts`
  - 列表和详情的 `created_at` / `updated_at` 已改为直接读取 `Curriculum` 字段，不再依赖 `SystemLog` 回填。

- `backend/src/modules/info-management/curriculums.controller.ts`
  - 列表和详情成功响应 message 已显式对齐文档为 `success`。

#### 前端更新

- `frontend/src/modules/info-management/types/curriculums.ts`
  - 新增培养方案列表、详情、课程关联和请求 DTO 类型。

- `frontend/src/modules/info-management/api/curriculums.ts`
  - 新增培养方案 API 封装，请求字段已转为文档 snake_case。

- `frontend/src/modules/info-management/pages/curriculums/CurriculumList.tsx`
  - 新增培养方案列表页面，支持专业和年份筛选、分页、详情查看。

- `frontend/src/modules/info-management/components/CurriculumTable.tsx`
  - 新增培养方案列表表格。

- `frontend/src/modules/info-management/components/CurriculumDetail.tsx`
  - 新增培养方案详情弹窗，展示课程列表、创建时间和更新时间。

- `frontend/src/App.tsx`、`frontend/src/shared/config/menu.tsx`
  - 已新增 `/info/curriculums` 路由和“培养方案”菜单入口。

### 7.3 / 7.4 创建和更新培养方案

#### 后端更新

- `backend/src/modules/info-management/curriculums.types.ts`
  - `updateCurriculumSchema` 已要求至少提供一个更新字段。

- `backend/src/modules/info-management/curriculums.service.ts`
  - 创建前已显式校验专业存在。
  - 创建和更新名称时已按同专业、同年份、同名称校验重复培养方案。

#### 前端更新

- `frontend/src/modules/info-management/components/CurriculumModal.tsx`
  - 新增培养方案创建和编辑表单。
  - 编辑时仅提交文档 7.4 要求的可更新字段。

### 7.5 删除培养方案

#### 前端更新

- `frontend/src/modules/info-management/pages/curriculums/CurriculumList.tsx`
  - 培养方案列表已提供删除入口和确认弹窗。

### 7.6 / 7.7 添加课程到培养方案

#### 后端更新

- `backend/src/modules/info-management/curriculums.service.ts`
  - 单个添加课程前已显式校验课程是否已在培养方案中。
  - 批量添加课程时，单条创建失败会计入 `fail_count`，不会直接中断整个批量流程。

#### 前端更新

- `frontend/src/modules/info-management/components/CurriculumCourseModal.tsx`
  - 新增单个添加课程弹窗。

- `frontend/src/modules/info-management/components/CurriculumBatchCourseModal.tsx`
  - 新增批量添加课程弹窗。

- `frontend/src/modules/info-management/pages/curriculums/CurriculumList.tsx`
  - 培养方案详情内已接入单个添加和批量添加课程操作。

### 7.8 / 7.9 移除和更新培养方案课程

#### 后端更新

- `backend/src/modules/info-management/curriculums.types.ts`
  - 已新增 `curriculumCourseParamsSchema` 校验 `:id` 和 `:course_id`。
  - `updateCurriculumCourseSchema` 已改为 `course_type`、`semester_suggestion` 可选但至少提供一个。

- `backend/src/modules/info-management/curriculums.service.ts`
  - 移除和更新课程前已显式校验培养方案课程关联存在。

#### 前端更新

- `frontend/src/modules/info-management/components/CurriculumDetail.tsx`
  - 培养方案课程列表已提供编辑和移除入口。

## 八、角色权限与令牌管理 API

### 8.1 / 8.2 获取角色列表和详情

#### 后端更新

- `backend/src/modules/info-management/roles.controller.ts`
  - 角色列表和详情成功响应 message 已显式对齐文档为 `success`。

- `backend/src/modules/info-management/roles.types.ts`
  - 角色 `:id` 参数已改为严格 UUID 校验。

#### 前端更新

- `frontend/src/modules/info-management/types/roles.ts`
  - 新增角色、权限、令牌相关类型定义。

- `frontend/src/modules/info-management/api/roles.ts`
  - 新增 `/roles`、`/permissions`、用户令牌管理 API 封装。

- `frontend/src/modules/info-management/pages/roles/RoleList.tsx`
  - 新增角色权限管理页面，支持角色列表、筛选、详情查看。

- `frontend/src/App.tsx`
  - `/info/roles` 已从 `ComingSoon` 替换为角色权限管理页面，并限制 `admin`、`super_admin` 访问。

### 8.3 / 8.4 / 8.5 创建、更新、删除角色

#### 后端更新

- `backend/src/modules/info-management/roles.types.ts`
  - `updateRoleSchema` 已要求至少提供一个更新字段。

#### 前端更新

- `frontend/src/modules/info-management/components/RoleModal.tsx`
  - 新增角色创建和编辑表单。
  - 创建角色时可选择初始权限。
  - 编辑角色时不允许修改 `code`。

- `frontend/src/modules/info-management/pages/roles/RoleList.tsx`
  - 已提供创建、编辑、删除角色入口。
  - 删除按钮会对系统内置角色和已被用户引用的角色置灰。

### 8.6 获取权限列表

#### 后端更新

- `backend/prisma/schema.prisma`
  - `Permission` 模型已新增可空 `description` 字段。

- `backend/prisma/migrations/20260614093000_add_major_timestamps/migration.sql`
  - 已补充 `permissions.description` 字段迁移。

- `backend/src/modules/info-management/roles.service.ts`
  - 权限列表响应已返回 `description`。

- `backend/prisma/seed.ts`
  - 已为现有基础权限补充描述字段。

#### 前端更新

- `frontend/src/modules/info-management/pages/roles/RoleList.tsx`
  - 已提供权限列表查看入口，并支持 `resource`、`action`、`keyword` 筛选。

### 8.7 / 8.8 分配和撤销角色权限

#### 后端更新

- `backend/src/modules/info-management/roles.types.ts`
  - `:permission_id` 参数已改为严格 UUID 校验。

- `backend/src/modules/info-management/roles.service.ts`
  - 撤销 `super_admin` 角色的角色/权限管理关键权限时会返回冲突错误，避免破坏超级管理员关键管理能力。

#### 前端更新

- `frontend/src/modules/info-management/components/AssignPermissionsModal.tsx`
  - 新增为角色分配权限弹窗。

- `frontend/src/modules/info-management/components/RoleDetail.tsx`
  - 角色详情中已提供撤销角色权限入口。

### 8.9 / 8.10 / 8.11 用户活跃令牌管理

#### 后端更新

- `backend/src/modules/info-management/users.types.ts`
  - 用户令牌相关 `:id`、`:token_id` 参数已改为严格 UUID 校验。

- `backend/src/modules/info-management/users.controller.ts`
  - 活跃令牌列表成功响应 message 已显式对齐文档为 `success`。

#### 前端更新

- `frontend/src/modules/info-management/components/UserTokensModal.tsx`
  - 新增用户活跃令牌弹窗，支持查看、吊销指定令牌、吊销全部令牌。

- `frontend/src/modules/info-management/api/users.ts`
  - 已补充用户令牌列表、吊销指定令牌、吊销全部令牌 API。

- `frontend/src/modules/info-management/pages/users/UserList.tsx`
  - 用户列表操作列已新增“令牌”入口。

## 当前进行中

- 暂无。

## 已验证

- `pnpm --filter @stss/server typecheck` 通过。
- `pnpm --filter @stss/web typecheck` 通过。
- `UsersController > updateStatus > 应该成功修改用户状态` 单测已通过。
- `pnpm --filter @stss/server db:generate` 已完成，Prisma Client 已包含 `deletedAt` 软删除字段。
- 本阶段新增验证：
  - `pnpm --filter @stss/server db:generate` 通过，Prisma Client 已包含 `Major.description`、`Major.createdAt`、`Major.updatedAt`。
  - `pnpm --filter @stss/server typecheck` 通过。
  - `pnpm --filter @stss/web typecheck` 通过。
  - `pnpm --filter @stss/server exec vitest run src/__tests__/modules/info-management/major.service.test.ts` 通过，26 个专业服务单测全部通过。
  - `pnpm --filter @stss/server db:generate` 通过，Prisma Client 已包含 `Course.updatedAt @default(now())`。
  - `pnpm --filter @stss/server typecheck` 通过。
  - `pnpm --filter @stss/web typecheck` 通过。
  - `pnpm --filter @stss/server exec vitest run src/__tests__/modules/info-management/course.service.test.ts` 通过，14 个课程服务单测全部通过。
  - `DATABASE_URL=postgresql://user:pass@localhost:5432/db pnpm --filter @stss/server exec prisma validate` 通过。
  - `pnpm --filter @stss/web lint` 通过，有 1 个既有 `Toast.tsx` 的 `any` warning。
  - `pnpm --filter @stss/server lint` 通过，有若干测试文件 `any` warning。
  - 第七章新增验证：
    - `pnpm --filter @stss/server db:generate` 通过，Prisma Client 已包含 `Curriculum.createdAt`、`Curriculum.updatedAt`。
    - `pnpm --filter @stss/server typecheck` 通过。
    - `pnpm --filter @stss/web typecheck` 通过。
    - `DATABASE_URL=postgresql://user:pass@localhost:5432/db pnpm --filter @stss/server exec prisma validate` 通过。
    - `pnpm --filter @stss/web lint` 通过，有 1 个既有 `Toast.tsx` 的 `any` warning。
    - `pnpm --filter @stss/server lint` 通过，有若干既有测试文件 `any` warning。
  - 第八章新增验证：
    - `pnpm --filter @stss/server db:generate` 通过，Prisma Client 已包含 `Permission.description`。
    - `pnpm --filter @stss/server typecheck` 通过。
    - `pnpm --filter @stss/web typecheck` 通过。
    - `DATABASE_URL=postgresql://user:pass@localhost:5432/db pnpm --filter @stss/server exec prisma validate` 通过。
    - `pnpm --filter @stss/web lint` 通过，有 1 个既有 `Toast.tsx` 的 `any` warning。
    - `pnpm --filter @stss/server lint` 通过，有若干既有测试文件 `any` warning。

## 当前未处理 / 残留问题

- 未跑完整测试套件；当前本地集成测试受 `localhost:5432` 和 `127.0.0.1:6379` 不可达影响。
- 本阶段尝试运行 `pnpm --filter @stss/server test:integration -- src/__tests__/integration/modules/info-management/majors.routes.integration.test.ts`，失败原因仍是 `localhost:5432` 数据库不可达，且 Redis `127.0.0.1:6379` 连接受限。
- 本阶段尝试运行 `pnpm --filter @stss/server exec vitest run src/__tests__/integration/modules/info-management/curriculums.routes.integration.test.ts`，15 个用例因 `localhost:5432` 数据库不可达被跳过并导致 suite 初始化失败。
- 本阶段尝试运行 `pnpm --filter @stss/server exec vitest run src/__tests__/integration/modules/info-management/roles.routes.integration.test.ts`，7 个用例因 `localhost:5432` 数据库不可达被跳过并导致 suite 初始化失败。
- 头像旧文件异步清理仍未处理。

## 注意事项

- 当前前端通过角色 code 判断扩展身份表单显示：
  - `student`
  - `teacher`
  - `admin`、`super_admin`、`security_admin`
- 如果角色 code 与数据库种子数据不一致，需要同步调整前端判断逻辑。
- 管理员扩展记录的 `admin_type` 必须使用 Prisma 枚举值：`ACADEMIC`、`SUPER`、`SECURITY`。
