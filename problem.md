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

## 五、专业管理 API

本文以下内容以 `docs/apis/A-information-management.md` 中 `## 五、专业管理 API` 为标准，对当前实现的不一致点进行整理。

## 5.1 获取专业列表

### 当前对齐情况

- 前端 `majorsApi.getList` 已按文档发送 `page`、`page_size`、`department_id`、`keyword`。
- 前端专业列表页已提供关键词搜索、院系筛选和分页展示。
- 后端已返回文档要求的列表字段：`id`、`name`、`code`、`department_id`、`department_name`、`degree_type`、`total_credits`、`student_count`、`created_at`。

### 发现的问题

- 后端原先通过 `SystemLog` 创建日志回填 `created_at`：
  - 如果没有创建日志，会返回 `1970-01-01` 这样的默认时间。
  - 已删除或缺失日志会导致专业创建时间不稳定。
- `Major` 模型原先没有稳定的 `created_at`、`updated_at` 字段。

### 处理状态

- 已修复：`Major` 已补充 `created_at`、`updated_at` 字段。
- 已修复：列表 `created_at` 已改为直接取 `Major.createdAt`。

### 待确认

- `GET /majors` 成功响应 message 当前沿用全局默认 `Success`，文档示例是 `success`。如果严格校验大小写，需要统一响应工具或该接口单独传入 `success`。

## 5.2 获取专业详情

### 当前对齐情况

- 前端详情弹窗已展示专业基础信息、培养方案、学生列表、创建时间和更新时间。
- 后端已返回文档要求的基础字段、`curriculums`、`students`、`created_at`、`updated_at`。

### 发现的问题

- 后端原先通过 `SystemLog` 回填 `created_at` / `updated_at`，存在与 5.1 相同的不稳定问题。
- 后端原先将 `description` 返回为所属院系描述，而不是专业自身描述。
- `Major` 模型原先没有 `description` 字段。
- `:id` 参数需要严格 UUID 校验；当前详情路由已有校验，更新/删除路由原先没有同样校验。

### 处理状态

- 已修复：`Major` 已补充 `description` 字段。
- 已修复：详情 `description` 已改为使用 `Major.description`。
- 已修复：详情 `created_at`、`updated_at` 已改为直接取 `Major.createdAt`、`Major.updatedAt`。
- 已修复：专业更新、删除路由也补充了 `:id` UUID 校验。

### 待确认

- `GET /majors/:id` 成功响应 message 当前沿用全局默认 `Success`，文档示例是 `success`。如果严格校验大小写，需要统一响应工具或该接口单独传入 `success`。

## 5.3 创建专业

### 当前对齐情况

- 前端新增专业表单已提供 `name`、`code`、`department_id`、`degree_type`、`total_credits` 对应输入。
- `majorsApi.create` 已按文档字段提交 snake_case 请求。
- 后端创建接口权限限制为 `super_admin`。

### 发现的问题

- 后端原先缺少院系存在校验，可能依赖 Prisma 外键错误。
- 后端原先缺少专业名称重复校验。
- 后端原先缺少专业代码重复校验。
- 后端原先创建成功消息是 `创建成功`，与文档 `专业创建成功` 不一致。
- 后端原先创建接口返回完整 `Major`，前端类型也声明为完整 `Major`，但文档响应只要求 `{ id, name, code }`。

### 处理状态

- 已修复：创建前已校验院系存在、专业名称重复、专业代码重复。
- 已修复：创建成功消息已对齐为 `专业创建成功`。
- 已修复：创建接口返回已收敛为 `{ id, name, code }`。
- 已修复：前端 `majorsApi.create` 返回类型已收敛为 `MajorSummary`。

### 待确认

- 文档请求示例包含 `code`、`degree_type`、`total_credits`，但没有明确“必填”。当前前后端仍将这些字段视为可选；如果产品要求必填，需要同步收紧前端校验和后端 schema。

## 5.4 更新专业

### 当前对齐情况

- 前端编辑专业时仅提交 `name`、`total_credits`，与文档示例一致。
- 后端更新接口权限限制为 `admin`、`super_admin`。

### 发现的问题

- 后端原先没有校验空请求体，可能允许无实际字段更新。
- 后端原先没有校验更新后的专业名称是否与其他专业重复。
- 后端原先没有严格校验 `:id` UUID。
- 后端原先更新成功消息是 `更新成功`，与文档 `专业更新成功` 不一致。
- 前端 `majorsApi.update` 原先返回类型声明为完整 `Major`，但后端实际不需要返回完整列表项。

### 处理状态

- 已修复：`updateMajorSchema` 已要求至少提供 `name` 或 `total_credits` 之一。
- 已修复：更新前已校验专业名称重复。
- 已修复：更新路由已补充 `:id` UUID 校验。
- 已修复：更新成功消息已对齐为 `专业更新成功`。
- 已修复：`majorsApi.update` 返回类型已收敛为 `MajorSummary`。

### 待确认

- 文档响应写的是 `data: { ... }`，未明确字段集合。当前后端返回 `{ id, name, code }`；如果需要返回完整专业对象，需要再调整后端返回和前端类型。

## 5.5 删除专业

### 当前对齐情况

- 前端页面已提供删除入口。
- 前端删除确认弹窗会提示该专业关联学生数。
- 后端删除接口权限限制为 `super_admin`。

### 发现的问题

- 后端原先没有在业务层显式校验“专业下无关联学生”，可能依赖数据库外键失败。
- 后端原先没有严格校验 `:id` UUID。
- 后端原先删除成功消息是 `删除成功`，与文档 `专业已删除` 不一致。

### 处理状态

- 已修复：删除前已显式统计关联学生数。
- 已修复：存在关联学生时返回 `409` 与 `专业下存在关联学生，无法删除`。
- 已修复：删除路由已补充 `:id` UUID 校验。
- 已修复：删除成功消息已对齐为 `专业已删除`。

## 六、课程管理 API

本文以下内容以 `docs/apis/A-information-management.md` 中 `## 六、课程管理 API` 为标准，对当前前后端实现的不一致点进行整理。

## 6.1 获取课程列表

### 当前对齐情况

- 后端已实现 `GET /api/v1/courses`。
- 后端已支持 `page`、`page_size`、`keyword`、`department_id`、`course_type`、`status` 查询参数。
- 后端列表响应主体包含文档要求的字段：`id`、`code`、`name`、`credits`、`hours`、`course_type`、`category`、`department_id`、`department_name`、`teacher_id`、`teacher_name`、`status`、`created_at`。

### 发现的问题

- 前端 `/info/courses` 当前仍是 `ComingSoon` 页面，没有课程列表页。
- 前端缺少课程管理 API 封装，例如 `frontend/src/modules/info-management/api/courses.ts`。
- 前端缺少课程相关类型定义，例如 `frontend/src/modules/info-management/types/courses.ts`。
- 前端缺少课程表格、筛选、分页等页面组件。
- 后端成功响应 message 当前沿用全局默认 `Success`，文档示例为 `success`，如果严格校验大小写则不一致。
- 后端 service 内部返回字段混用 camelCase 和 snake_case，例如 `courseType`、`teacherName`，依赖响应工具再转换；最终响应大概率正确，但实现风格不稳定。

### 处理状态

- 已修复：`/info/courses` 已从 `ComingSoon` 改为课程管理页面。
- 已修复：已新增 `frontend/src/modules/info-management/api/courses.ts`。
- 已修复：已新增 `frontend/src/modules/info-management/types/courses.ts`。
- 已修复：已新增课程表格、筛选、分页页面组件。
- 已修复：课程列表接口已显式返回 message `success`。
- 已保留：后端 service 内部字段混用不影响最终响应，后续可作为代码风格清理。

## 6.2 获取课程详情

### 当前对齐情况

- 后端已实现 `GET /api/v1/courses/:course_id`。
- 后端已返回文档要求的基础字段、`description`、`assessment_method`、`prerequisites`、`created_at`、`updated_at`。
- 后端详情路由已校验 `:course_id` UUID。

### 发现的问题

- 文档路径参数为 `:id`，当前后端路由和参数 schema 使用 `:course_id`。Express 实际路径仍可匹配 `/courses/:id` 形式的 URL，但参数命名与文档不一致。
- 前端没有课程详情页或详情弹窗。
- 后端成功响应 message 当前沿用全局默认 `Success`，文档示例为 `success`，如果严格校验大小写则不一致。
- `Course.updatedAt` 在 Prisma schema 中当前只有 `@updatedAt`，没有 `@default(now())`。如果已有数据表通过 `prisma db push` 新增该字段，可能出现与院系/专业时间字段相同的“必填列无默认值”问题。

### 处理状态

- 已修复：已新增课程详情弹窗。
- 已修复：课程详情接口已显式返回 message `success`。
- 已修复：`Course.updatedAt` 已补充 `@default(now())`，避免已有数据表通过 `prisma db push` 新增字段时报必填列无默认值。
- 已保留：后端内部参数名仍为 `course_id`，外部路径 `/api/v1/courses/:id` 形式不受影响。

## 6.3 创建课程

### 当前对齐情况

- 后端已实现 `POST /api/v1/courses`。
- 后端创建接口权限限制为 `admin`、`super_admin`。
- 后端 schema 支持文档请求字段：`code`、`name`、`credits`、`hours`、`course_type`、`category`、`department_id`、`teacher_id`、`description`、`assessment_method`、`prerequisite_ids`。
- 后端创建响应 data 已返回 `{ id, code, name }`。

### 发现的问题

- 前端没有课程新增表单。
- 前端没有调用创建课程接口的 API 封装。
- 后端创建成功消息当前为 `创建成功`，文档要求 `课程创建成功`。
- 后端创建课程前缺少显式课程代码重复校验，可能依赖数据库唯一约束错误。
- 后端创建课程前缺少显式院系存在校验，可能依赖数据库外键错误。
- 后端创建课程前缺少显式教师存在校验，可能依赖数据库外键错误。
- 后端创建课程前缺少显式先修课程存在校验，可能依赖数据库外键错误。
- 如果 `prerequisite_ids` 为空或未传，当前仍会调用 `createMany({ data: [] })`，需确认 Prisma 当前版本是否稳定接受空数组。

### 处理状态

- 已修复：已新增课程新增表单。
- 已修复：已新增创建课程 API 封装。
- 已修复：后端创建成功消息已对齐为 `课程创建成功`。
- 已修复：后端创建前已显式校验课程代码重复、院系存在、教师存在、先修课程存在。
- 已修复：`prerequisite_ids` 为空或未传时不再调用空 `createMany`。

### 待确认

- 前端课程新增表单暂未提供 `teacher_id` 选择，因为当前 A 模块没有可直接复用的教师列表 API；后端仍支持提交 `teacher_id`。

## 6.4 更新课程

### 当前对齐情况

- 后端已实现 `PUT /api/v1/courses/:course_id`。
- 后端更新接口权限限制为 `admin`、`super_admin`。
- 后端支持文档示例中的 `name`、`credits`、`description`、`prerequisite_ids`。
- 后端更新路由已校验 `:course_id` UUID。

### 发现的问题

- 前端没有课程编辑表单。
- 前端没有调用更新课程接口的 API 封装。
- 文档路径参数为 `:id`，当前后端路由和参数 schema 使用 `:course_id`，参数命名与文档不一致。
- 后端更新成功消息当前为 `更新成功`，文档要求 `课程更新成功`。
- 后端 `updateCourseSchema` 没有要求至少提供一个更新字段，可能允许空请求体。
- 后端更新先修课程前缺少显式先修课程存在校验，可能依赖数据库外键错误。
- 后端当前只允许更新 `name`、`credits`、`description`、`prerequisite_ids`；文档示例也是这些字段，因此暂不视为不一致，但如果产品要求可编辑更多课程字段，需要扩展文档和实现。

### 处理状态

- 已修复：已新增课程编辑表单。
- 已修复：已新增更新课程 API 封装。
- 已修复：后端更新成功消息已对齐为 `课程更新成功`。
- 已修复：`updateCourseSchema` 已要求至少提供一个更新字段。
- 已修复：后端更新先修课程前已显式校验先修课程存在。
- 已保留：后端内部参数名仍为 `course_id`，外部路径 `/api/v1/courses/:id` 形式不受影响。

## 6.5 删除课程

### 当前对齐情况

- 后端已实现 `DELETE /api/v1/courses/:course_id`。
- 后端删除接口权限限制为 `super_admin`。
- 后端删除路由已校验 `:course_id` UUID。

### 发现的问题

- 前端没有课程删除入口。
- 文档路径参数为 `:id`，当前后端路由和参数 schema 使用 `:course_id`，参数命名与文档不一致。
- 后端删除成功消息当前为 `删除成功`，文档要求 `课程已删除`。
- 文档前置条件要求“课程未被任何培养方案引用”，但当前后端直接删除课程。
- 当前 Prisma schema 中 `CurriculumCourse.course` 对 `Course` 使用 `onDelete: Cascade`，删除课程时可能级联删除培养方案课程关联，而不是按文档阻止删除。
- 后端删除课程时没有显式检查 `curriculumCourses` 引用数量。

### 处理状态

- 已修复：前端课程页面已提供删除入口。
- 已修复：后端删除成功消息已对齐为 `课程已删除`。
- 已修复：后端删除课程前已显式检查 `curriculumCourses` 引用数量。
- 已修复：课程被培养方案引用时返回 `409` 与 `课程已被培养方案引用，无法删除`。
- 已保留：Prisma 关系仍存在 `onDelete: Cascade`，但业务层已先阻止被培养方案引用的课程删除。
- 已保留：后端内部参数名仍为 `course_id`，外部路径 `/api/v1/courses/:id` 形式不受影响。

## 6.6 批量创建课程

### 当前对齐情况

- 后端已实现 `POST /api/v1/courses/batch`。
- 后端批量创建接口权限限制为 `admin`、`super_admin`。
- 后端响应主体包含 `total`、`success_count`、`fail_count`、`results`，整体结构与文档一致。
- 后端成功消息已是 `批量创建完成`。

### 发现的问题

- 前端没有批量创建课程入口。
- 前端没有批量创建课程 API 封装。
- 后端批量结果中的 `index` 当前来自 `for...in` 的字符串下标，文档示例是数字下标。
- 后端批量创建每条课程时同样缺少课程代码重复、院系存在、教师存在、先修课程存在等显式校验。
- 后端批量创建失败时直接截取底层错误消息，可能返回 Prisma 原始错误，不稳定也不够贴近文档示例中的 `课程代码已存在`。
- 后端没有限制单次批量创建数量；文档未明确上限，此项属于稳定性建议，不一定是文档不一致。

### 处理状态

- 已修复：前端课程页面已提供批量创建入口。
- 已修复：已新增批量创建课程 API 封装。
- 已修复：后端批量结果 `index` 已改为数字下标。
- 已修复：后端批量创建每条课程时已复用课程代码重复、院系存在、教师存在、先修课程存在校验。
- 已保留：失败错误仍来自业务错误或底层异常的 message；显式业务校验已覆盖常见文档示例 `课程代码已存在`。
- 暂未处理：单次批量创建数量限制。文档未明确上限，此项作为稳定性建议保留。

## 七、培养方案管理 API

本文以下内容以 `docs/apis/A-information-management.md` 中 `## 七、培养方案管理 API` 为标准，对当前前后端实现的不一致点进行整理。

## 7.1 获取培养方案列表

### 当前对齐情况

- 后端已实现 `GET /api/v1/curriculums`。
- 后端已支持 `page`、`page_size`、`major_id`、`year` 查询参数。
- 后端列表响应主体包含文档要求字段。

### 发现的问题

- 前端原先没有培养方案管理页面和菜单入口。
- 前端原先缺少培养方案 API 封装和类型定义。
- 后端原先通过 `SystemLog` 创建日志回填 `created_at`，没有稳定时间字段。
- 后端成功响应 message 原先沿用全局默认 `Success`，文档示例为 `success`。

### 处理状态

- 已修复：已新增前端培养方案菜单、列表页、类型定义和 API 封装。
- 已修复：`Curriculum` 已补充 `created_at`、`updated_at` 字段。
- 已修复：列表 `created_at` 已改为直接取 `Curriculum.createdAt`。
- 已修复：列表接口已显式返回 message `success`。

## 7.2 获取培养方案详情

### 当前对齐情况

- 后端已实现 `GET /api/v1/curriculums/:id`。
- 后端详情响应包含文档要求字段和课程列表。
- 后端详情路由已校验 `:id` UUID。

### 发现的问题

- 前端原先没有培养方案详情弹窗。
- 后端原先通过 `SystemLog` 回填 `created_at` / `updated_at`。
- 后端成功响应 message 原先沿用全局默认 `Success`，文档示例为 `success`。

### 处理状态

- 已修复：已新增培养方案详情弹窗。
- 已修复：详情 `created_at`、`updated_at` 已改为直接取 `Curriculum.createdAt`、`Curriculum.updatedAt`。
- 已修复：详情接口已显式返回 message `success`。

## 7.3 创建培养方案

### 当前对齐情况

- 后端已实现 `POST /api/v1/curriculums`。
- 后端创建接口权限限制为 `admin`、`super_admin`。
- 后端创建成功消息已是 `培养方案创建成功`。
- 后端创建响应 data 返回 `{ id, name }`，与文档一致。

### 发现的问题

- 前端原先没有培养方案新增表单。
- 后端原先缺少专业存在校验，可能依赖 Prisma 外键错误。
- 后端原先缺少重复培养方案校验。

### 处理状态

- 已修复：已新增培养方案新增表单。
- 已修复：创建前已显式校验专业存在。
- 已修复：创建前已按同专业、同年份、同名称校验重复培养方案。

## 7.4 更新培养方案

### 当前对齐情况

- 后端已实现 `PUT /api/v1/curriculums/:id`。
- 后端更新接口权限限制为 `admin`、`super_admin`。
- 后端更新成功消息已是 `培养方案更新成功`。
- 后端更新路由已校验 `:id` UUID。

### 发现的问题

- 前端原先没有培养方案编辑表单。
- 后端 `updateCurriculumSchema` 原先没有要求至少提供一个更新字段。
- 后端原先缺少更新后名称重复校验。

### 处理状态

- 已修复：已新增培养方案编辑表单。
- 已修复：`updateCurriculumSchema` 已要求至少提供一个更新字段。
- 已修复：更新名称时已按同专业、同年份、同名称校验重复培养方案。

## 7.5 删除培养方案

### 当前对齐情况

- 后端已实现 `DELETE /api/v1/curriculums/:id`。
- 后端删除接口权限限制为 `super_admin`。
- 后端删除成功消息已是 `培养方案已删除`。
- 后端删除路由已校验 `:id` UUID。

### 发现的问题

- 前端原先没有培养方案删除入口。

### 处理状态

- 已修复：前端培养方案页面已提供删除入口和确认弹窗。

## 7.6 添加课程到培养方案

### 当前对齐情况

- 后端已实现 `POST /api/v1/curriculums/:id/courses`。
- 后端权限限制为 `admin`、`super_admin`。
- 后端成功消息已是 `课程已添加到培养方案`。

### 发现的问题

- 前端原先没有添加课程到培养方案的入口。
- 后端原先缺少重复添加课程的显式业务校验，可能依赖复合主键错误。

### 处理状态

- 已修复：培养方案详情弹窗已提供添加课程入口。
- 已修复：后端添加课程前已显式校验课程是否已在培养方案中。

## 7.7 批量添加课程到培养方案

### 当前对齐情况

- 后端已实现 `POST /api/v1/curriculums/:id/courses/batch`。
- 后端权限限制为 `admin`、`super_admin`。
- 后端响应包含 `success_count`、`fail_count`。
- 后端成功消息已是 `批量添加完成`。

### 发现的问题

- 前端暂未提供批量添加课程到培养方案入口。
- 后端原先批量添加遇到重复课程时可能抛出数据库错误并中断事务，不符合“统计失败项”的语义。

### 处理状态

- 已修复：后端批量添加时单条创建失败会计入 `fail_count`，不会直接中断整个批量流程。
- 已修复：培养方案详情弹窗已提供批量添加课程入口，并调用 `POST /api/v1/curriculums/:id/courses/batch`。

## 7.8 从培养方案移除课程

### 当前对齐情况

- 后端已实现 `DELETE /api/v1/curriculums/:id/courses/:course_id`。
- 后端权限限制为 `admin`、`super_admin`。
- 后端成功消息已是 `课程已从培养方案移除`。

### 发现的问题

- 前端原先没有从培养方案移除课程的入口。
- 后端原先未校验 `:course_id` UUID。
- 后端原先未显式校验课程是否确实属于该培养方案。

### 处理状态

- 已修复：培养方案详情弹窗已提供移除课程入口。
- 已修复：移除课程路由已补充 `:course_id` UUID 校验。
- 已修复：移除前已显式校验培养方案课程关联存在。

## 7.9 更新培养方案中的课程

### 当前对齐情况

- 后端已实现 `PUT /api/v1/curriculums/:id/courses/:course_id`。
- 后端权限限制为 `admin`、`super_admin`。
- 后端成功消息已是 `课程信息已更新`。

### 发现的问题

- 前端原先没有更新培养方案课程信息的入口。
- 后端原先未校验 `:course_id` UUID。
- `updateCurriculumCourseSchema` 原先把 `course_type`、`semester_suggestion` 都写成必填，导致文档语义中的“可更新其一或两者”不成立。
- 后端原先未显式校验课程是否确实属于该培养方案。

### 处理状态

- 已修复：培养方案详情弹窗已提供更新课程信息入口。
- 已修复：更新课程路由已补充 `:course_id` UUID 校验。
- 已修复：`updateCurriculumCourseSchema` 已改为两个字段可选但至少提供一个。
- 已修复：更新前已显式校验培养方案课程关联存在。

## 八、角色权限与令牌管理 API

本文以下内容以 `docs/apis/A-information-management.md` 中 `## 八、角色权限与令牌管理 API` 为标准，对当前前后端实现的不一致点进行整理。

## 8.1 获取角色列表（管理端）

### 当前对齐情况

- 后端已实现 `GET /api/v1/roles`。
- 后端权限限制为 `admin`、`super_admin`。
- 后端已支持 `keyword`、`builtin` 查询参数。
- 响应主体已包含角色基础信息、`builtin`、`user_count` 和权限摘要。

### 发现的问题

- 后端成功响应 message 原先沿用全局默认 `Success`，文档示例为 `success`。
- 前端 `/info/roles` 原先仍是 `ComingSoon`，没有角色权限管理页面。
- 前端原先没有 `/roles` 管理端 API 封装，只在用户管理里使用 `/users/roles` 简化列表。

### 处理状态

- 已修复：角色列表接口已显式返回 message `success`。
- 已修复：已新增 `/roles` 管理端 API 封装。
- 已修复：`/info/roles` 已替换为角色权限管理页面。

## 8.2 获取角色详情

### 当前对齐情况

- 后端已实现 `GET /api/v1/roles/:id`。
- 后端权限限制为 `admin`、`super_admin`。
- 响应主体已包含角色基础信息、权限列表、关联用户列表。

### 发现的问题

- 后端 `:id` 原先只校验非空，没有严格 UUID 校验。
- 后端成功响应 message 原先沿用全局默认 `Success`，文档示例为 `success`。
- 前端原先没有角色详情查看入口。

### 处理状态

- 已修复：角色 `:id` 参数已改为严格 UUID 校验。
- 已修复：角色详情接口已显式返回 message `success`。
- 已修复：角色权限管理页面已提供角色详情查看入口。

## 8.3 创建角色

### 当前对齐情况

- 后端已实现 `POST /api/v1/roles`。
- 后端权限限制为 `super_admin`。
- 后端创建成功消息已是 `角色创建成功`。
- 后端创建响应 data 返回 `{ id, code, name }`。

### 发现的问题

- 前端原先没有创建角色入口和表单。

### 处理状态

- 已修复：角色权限管理页面已提供创建角色入口和表单，并支持创建时分配初始权限。

## 8.4 更新角色

### 当前对齐情况

- 后端已实现 `PUT /api/v1/roles/:id`。
- 后端权限限制为 `super_admin`。
- 后端更新成功消息已是 `角色更新成功`。
- 更新请求只允许 `name`、`description`，没有开放修改 `code`，符合内置角色 code 不可修改说明。

### 发现的问题

- 后端 `:id` 原先只校验非空，没有严格 UUID 校验。
- 后端 `updateRoleSchema` 原先没有要求至少提供一个更新字段，空对象会被接受并返回当前角色。
- 前端原先没有更新角色入口和表单。

### 处理状态

- 已修复：角色 `:id` 参数已改为严格 UUID 校验。
- 已修复：`updateRoleSchema` 已要求至少提供一个更新字段。
- 已修复：角色权限管理页面已提供更新角色入口和表单。

## 8.5 删除角色

### 当前对齐情况

- 后端已实现 `DELETE /api/v1/roles/:id`。
- 后端权限限制为 `super_admin`。
- 后端删除成功消息已是 `角色已删除`。
- 后端已阻止删除系统内置角色。
- 后端已阻止删除仍被用户引用的角色。

### 发现的问题

- 后端 `:id` 原先只校验非空，没有严格 UUID 校验。
- 前端原先没有删除角色入口和确认弹窗。

### 处理状态

- 已修复：角色 `:id` 参数已改为严格 UUID 校验。
- 已修复：角色权限管理页面已提供删除角色入口和确认弹窗。

## 8.6 获取权限列表

### 当前对齐情况

- 后端已实现 `GET /api/v1/permissions`。
- 后端权限限制为 `admin`、`super_admin`。
- 后端已支持 `resource`、`action`、`keyword` 查询参数。

### 发现的问题

- 后端成功响应 message 原先沿用全局默认 `Success`，文档示例为 `success`。
- 后端权限列表原先没有返回文档要求的 `description` 字段。
- Prisma `Permission` 模型原先没有 `description` 字段，无法保存权限描述。
- 前端原先没有权限列表查看入口。

### 处理状态

- 已修复：权限列表接口已显式返回 message `success`。
- 已修复：Prisma `Permission` 模型已新增可空 `description` 字段。
- 已修复：权限列表响应已返回 `description` 字段。
- 已修复：角色权限管理页面已提供权限列表查看入口，并支持 `resource`、`action`、`keyword` 筛选。

## 8.7 为角色分配权限

### 当前对齐情况

- 后端已实现 `POST /api/v1/roles/:id/permissions`。
- 后端权限限制为 `super_admin`。
- 后端成功消息已是 `权限分配成功`。
- 响应主体包含 `role_id`、`added_count`。

### 发现的问题

- 后端 `:id` 原先只校验非空，没有严格 UUID 校验。
- 前端原先没有为角色分配权限入口。

### 处理状态

- 已修复：角色 `:id` 参数已改为严格 UUID 校验。
- 已修复：角色权限管理页面已提供为角色分配权限入口。

## 8.8 撤销角色权限

### 当前对齐情况

- 后端已实现 `DELETE /api/v1/roles/:id/permissions/:permission_id`。
- 后端权限限制为 `super_admin`。
- 后端成功消息已是 `权限已撤销`。
- 后端已校验角色确实拥有该权限。

### 发现的问题

- 后端 `:id`、`:permission_id` 原先只校验非空，没有严格 UUID 校验。
- 后端原先未实现“不能撤销导致系统没有任何超级管理员可用的关键权限”的保护逻辑。
- 前端原先没有撤销角色权限入口。

### 处理状态

- 已修复：角色 `:id`、`:permission_id` 参数已改为严格 UUID 校验。
- 已修复：撤销 `super_admin` 角色的角色/权限管理关键权限时会返回冲突错误，避免破坏超级管理员关键管理能力。
- 已修复：角色详情弹窗已提供撤销角色权限入口。

## 8.9 获取用户活跃令牌列表

### 当前对齐情况

- 后端已实现 `GET /api/v1/users/:id/tokens`。
- 后端权限限制为本人或 `admin`、`super_admin`。
- 后端仅返回未过期且未吊销的 RefreshToken。
- 响应主体字段与文档基本一致。

### 发现的问题

- 后端 `:id` 原先只校验非空，没有严格 UUID 校验。
- 后端成功响应 message 原先沿用全局默认 `Success`，文档示例为 `success`。
- 前端原先没有令牌列表 API 封装和管理入口。

### 处理状态

- 已修复：用户 `:id` 参数已改为严格 UUID 校验。
- 已修复：用户活跃令牌列表接口已显式返回 message `success`。
- 已修复：前端已新增令牌列表 API 封装和用户列表令牌管理入口。

## 8.10 吊销指定令牌

### 当前对齐情况

- 后端已实现 `DELETE /api/v1/users/:id/tokens/:token_id`。
- 后端权限限制为本人或 `admin`、`super_admin`。
- 后端成功消息已是 `令牌已吊销`。

### 发现的问题

- 后端 `:id`、`:token_id` 原先只校验非空，没有严格 UUID 校验。
- 前端原先没有吊销指定令牌入口。

### 处理状态

- 已修复：用户 `:id`、`:token_id` 参数已改为严格 UUID 校验。
- 已修复：用户令牌管理弹窗已提供吊销指定令牌入口。

## 8.11 吊销用户所有令牌

### 当前对齐情况

- 后端已实现 `POST /api/v1/users/:id/tokens/revoke-all`。
- 后端权限限制为本人或 `admin`、`super_admin`。
- 后端成功消息已是 `已吊销所有令牌`。
- 响应主体包含 `revoked_count`。

### 发现的问题

- 后端 `:id` 原先只校验非空，没有严格 UUID 校验。
- 前端原先没有吊销全部令牌入口。

### 处理状态

- 已修复：用户 `:id` 参数已改为严格 UUID 校验。
- 已修复：用户令牌管理弹窗已提供吊销全部令牌入口。
