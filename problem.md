# A 模块用户管理 API 问题清单

本文以 `docs/apis/A-information-management.md` 中 `## 三、用户管理 API` 为标准，对当前前后端实现的不一致点进行整理。

## 3.1 获取用户列表（已解决）

### 已解决

- 后端已实现真正软删除：
  - `User` 模型已新增 `deleted_at` / `deletedAt` 字段。
  - `usersService.deleteUser` 已改为软删除，不再物理删除用户记录。
  - `usersService.getUsers` 已直接基于用户表查询 `include_deleted`，不再依赖系统日志快照拼接。
  - `include_deleted` 场景下，已删除用户与未删除用户参与统一排序、统一分页。
  - 已删除用户也会参与统一的 `keyword`、`status`、`role` 过滤逻辑。
- `UserQueryParams` 已新增 `includeDeleted`。
- `usersApi.getList` 已按文档发送 `page_size` 和 `include_deleted`。
- 用户列表页面已新增“包含已删除”筛选入口。

## 3.2 获取用户统计

### 暂未发现明显问题

- 后端返回结构与文档基本一致。
- 前端 `getStats` 类型基本一致。
- 当前用户列表页没有明显展示统计数据，这属于页面展示缺口，不是接口对接错误。

## 3.3 获取用户详情（已解决）

### 已处理

- 文档中 `gender` 响应示例原为小写 `male`，但后端和前端实际统一使用 Prisma 枚举 `MALE` / `FEMALE` / `OTHER`。
- 已将文档示例统一为大写枚举。

## 3.4 创建用户（已解决）

### 已处理

- 后端 `createUserSchema` 已支持 `student`、`teacher`、`admin` 嵌套字段，并兼容文档 snake_case 请求字段。
- 后端 `usersService.createUser` 已使用事务创建 `User`、`UserRole` 和可选的 `Student`、`Teacher`、`Admin` 扩展记录。
- 后端创建用户时已记录 `SystemLog`。
- 前端已新增 `CreateUserDTO`，`usersApi.create` 不再使用 `Partial<UserDetail>`。
- 前端创建用户请求会将 camelCase 转为文档要求的 snake_case。
- `UserForm` 新建用户时已根据角色显示学生、教师、管理员扩展信息表单。
- 新建用户时已不再显示或提交 `status` 字段。

### 备注

- 管理员类型已按 Prisma 实际枚举使用 `ACADEMIC`、`SUPER`、`SECURITY`。
- 当前前端通过角色 code 判断是否显示扩展信息：`student`、`teacher`、`admin`、`super_admin`、`security_admin`；如果种子数据 code 变化，需要同步调整。

## 3.5 批量创建用户（已解决）

### 已处理

- 后端返回结构已符合文档：`total`、`success_count`、`fail_count`、`results`。
- 后端批量创建 schema 已支持 `student`、`teacher`、`admin` 扩展信息。
- 后端批量创建服务已在事务内创建用户、角色和扩展身份记录。
- `usersApi.batchCreate` 返回类型已对齐后端批量创建结果。
- `BatchImportModal` CSV 模板和解析逻辑已覆盖学生、教师、管理员扩展身份字段。

## 3.6 更新用户

### 后端情况

- 按当前文档请求体，后端已支持基本信息和 `role_ids` / `roleIds` 更新。

### 后端备注

- 后端 `updateUserSchema` 不支持更新 `student`、`teacher`、`admin` 扩展信息；当前文档 3.6 也未列出这些字段。如果后续要求编辑扩展身份信息，需要同步扩展文档和实现。

### 前端情况

- 已新增 `UpdateUserDTO`，`usersApi.update` 不再使用 `Partial<UserDetail>`。
- `usersApi.update` 已将前端 camelCase 转为文档要求的 snake_case。

### 已处理

- 编辑用户表单原先会通过 `PUT /users/:id` 提交 `status`，但后端更新接口不接收 `status`。
- 已改为：基础信息仍走 `PUT /users/:id`，状态变化时额外调用 `PATCH /users/:id/status`。

## 3.7 删除用户（已解决）

### 当前情况

- 后端删除接口与文档基本一致。
- 当前后端已改为软删除。
- 删除时仍会写入 `SystemLog`，用于审计追踪。

## 3.8 修改用户状态（已解决）

### 已解决

- 后端已使用 `reason` 写入状态修改系统日志。
- `usersApi.updateStatus(id, status, reason)` 已支持传 `reason`。
- 用户列表已新增单个用户状态修改独立入口，可直接填写状态和原因。

## 3.9 批量修改状态（已解决）

### 已解决

- 后端接口已支持接收 `reason`。
- 批量状态更新时已按用户写入状态变更系统日志，并记录 `reason`。
- `usersApi.batchUpdateStatus` 已声明并返回 `updated_count`、`failed_count`。
- 前端已按文档发送 `user_ids`、`role_ids`。
- 前端批量状态修改弹窗已支持填写 `reason`。
- UI 成功提示已使用后端返回的更新和失败数量。
- 响应仅返回汇总数量仍符合当前文档要求，不再视为缺陷。

## 3.10 修改密码（用户自己）（已解决）

### 已解决

- 后端路由权限表达已收敛为“已登录用户 + controller 强制本人”，不再显式表现为“管理员也可修改”。
- `usersApi.changePassword` 已按文档发送 `old_password`、`new_password`。
- 前端“修改自己密码”入口已统一收敛到 `/profile` 页面。
- 原先用户列表中误导性的 `ChangePasswordModal` 入口已移除。

## 3.11 重置密码（管理员）（已解决）

### 已解决

- `usersApi.resetPassword` 已按文档发送 `new_password`。
- `UserList` 操作列已新增重置密码入口。

## 3.12 分配角色（已解决）

### 已解决

- 接口可用，并且支持角色 ID 或角色 code，能力比文档更宽。

- `usersApi.assignRoles` 已按文档发送 `role_ids`。
- `UserList` 操作列已新增角色分配入口。
- 编辑用户表单也会通过 `PUT /users/:id` 更新 `roleIds`，与文档中的独立分配角色接口存在功能重叠。

## 3.13 撤销角色（已解决）

### 已解决

- 接口可用，并且支持 `role_id` 是角色 ID 或 code，能力比文档更宽。

- `UserList` 操作列已新增角色分配入口，`RoleAssignModal` 内可调用撤销角色接口。

## 3.14 获取用户权限（已解决）

### 已解决

- 实现基本符合文档。

- `UserList` 操作列已新增权限查看入口。

## 3.15 获取角色列表（已解决）

### 已解决

- 接口实现基本符合文档。
- 当前只要求登录，不额外限制角色。文档未明确权限，因此不一定是问题。

- 前端已用于用户表单和批量角色选择，基本符合文档。

## 3.16 获取系统日志（已解决）

### 已解决

- 实现基本符合文档。

- `usersApi.getLogs` 多了 `resourceType` 参数，文档没有列出；后端也支持，属于扩展。
- `usersApi.getLogs` 已按文档发送 `user_id`、`start_date`、`end_date`、`page_size`，扩展参数 `resource_type` 也按 snake_case 发送。
- 前端日志类型里的 `details` 已修正为对象类型，日志页面展示也已兼容对象数据。

## 3.17 上传头像（已解决）

### 已解决

- 后端接口已实现。
- 前端 `usersApi.uploadAvatar` 已补充。
- 管理员编辑用户表单里已可上传头像。
- `/profile` 页面已新增“本人上传头像”入口。

### 后端问题

- 接口已实现，上传到本地 `/uploads/avatars/...`。文档示例是 CDN URL，这可能只是示例，不一定是错误。
- 没有旧头像异步清理。

## 3.18 更新学生专业（已解决）

### 已处理

- 接口已实现，并已补系统日志记录。
- `usersApi.updateStudentMajor` 已补充。
- 用户编辑页已可更新学生专业。

## 3.19 更新教师院系（已解决）

### 已处理

- 接口已实现，并已补系统日志记录。
- `usersApi.updateTeacherDepartment` 已补充。
- 用户编辑页已可更新教师院系。

## 3.20 更新管理员院系（已解决）

### 已处理

- 接口已实现，并已补系统日志记录。
- `usersApi.updateAdminDepartment` 已补充。
- 用户编辑页已可更新管理员院系。

## 额外相关问题

### 后端问题

- 已复核当前 Prisma schema：`RefreshToken` 已包含 `lastUsedAt`、`ipAddress`、`userAgent`、`revokedAt` 字段，原先“字段不存在导致运行时报错”的问题已不存在。

### 前端问题

- 暂未发现仍需单独记录的前端类型问题；原先 `usersApi.update` 使用 `Partial<UserDetail>`、`batchUpdateStatus` 使用 `Promise<void>` 的问题已处理。

## 四、院系管理 API

本文以下内容以 `docs/apis/A-information-management.md` 中 `## 四、院系管理 API` 为标准，对当前实现的不一致点进行整理。

## 4.1 获取院系列表（已解决）

### 已解决

- 后端已支持 `page`、`page_size`、`keyword` 查询参数。
- 后端响应结构与文档主体一致，返回 `items + pagination`。
- `created_at` 已改为直接取 `Department.createdAt`，不再依赖 `SystemLog` 回填。
- 已为 `Department` 模型补充稳定的 `created_at`、`updated_at` 字段。
- `departmentsApi.getList` 已按文档发送 `page_size`。
- 列表页已支持关键词搜索、分页展示。

## 4.2 获取院系详情（已解决）

### 已解决

- 后端已返回文档要求的基础字段、`majors`、`teachers`、`created_at`、`updated_at`。
- `:id` 参数校验已改为严格 UUID 校验：
  - 传入非法 UUID 时会按文档语义返回 `400` 参数错误，
  - 合法但不存在的 UUID 仍返回 `404`。
- 前端院系详情弹窗已补充展示 `updated_at`。

## 4.3 创建院系（已解决）

### 已解决

- 后端已实现创建接口，并限制为 `super_admin`。
- 请求字段 `name`、`code`、`description` 与文档一致。
- 创建时已记录 `SystemLog`。
- 页面已提供新建院系入口。
- `departmentsApi.create` 已按文档字段提交请求。
- 前端已将创建接口返回类型收敛为真实响应 `{ id, name, code }`，不再错误声明为完整 `Department`。

## 4.4 更新院系（已解决）

### 已解决

- 后端已实现更新接口，并限制为 `admin`、`super_admin`。
- 请求体仅支持 `name`、`description`，与文档一致。
- 更新时已记录 `SystemLog`。
- `:id` 参数已使用严格 UUID 校验，非法参数会返回 `400`。
- 后端更新前已补充“院系名称重复”校验：
  - 若更新后的名称与其他院系重复，会返回 `409`。
- `departmentsApi.update` 返回类型已收敛为真实响应 `{ id, name, code }`，不再错误声明为完整 `Department`。

## 4.5 删除院系

### 后端情况

- 后端已实现删除接口，并限制为 `super_admin`。
- 删除时已记录 `SystemLog`。

### 后端问题

- `:id` 参数同样未严格校验 UUID，存在与 4.2 相同的问题。
- 文档前置条件写的是“院系下无关联教师、专业”，但后端实际还额外限制了：
  - `admins`
  - `courses`
  - 也就是说当前实现比文档更严格，文档未覆盖完整删除阻塞条件。
- 成功消息当前返回的是 `院系删除成功`，文档示例为 `院系已删除`。

### 前端情况

- 页面已提供删除入口，并会在弹窗中提示教师数、专业数。

### 前端问题

- 删除确认弹窗目前只提示“教师数”和“专业数”，没有提示后端同样会因“管理员关联”或“课程关联”而拒绝删除：
  - 这会导致前端提示与实际删除规则不完全一致。
