---
filename: A-information-management.md
title: STSS A 模块 · 接口设计文档
status: active
version: 1.0.0
last_updated_at: 2026-04-01
last_updated_by: 程韬
description: 基础信息管理子系统 API 接口设计，包含认证、用户管理、角色权限、院系专业等模块
---

# STSS A 模块 · 接口设计文档 v0.4

---

## 一、设计规范

### 1.1 RESTful 风格约定

| 规则             | 说明                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Base URL         | `/api/v1`                                                                                                |
| 认证方式         | JWT Bearer Token（AccessToken + RefreshToken 双 Token 机制）                                             |
| 字段命名         | **全局统一使用 snake_case**（与 PostgreSQL / Prisma 惯例对齐）                                           |
| 分页（页码模式） | `page`（从 1 开始），`page_size`（默认 20，最大 100，后端强制校验）                                      |
| 分页（游标模式） | `cursor`（UUID），`direction`（`next`/`prev`），`page_size`；**cursor 与 page 模式互斥，以 cursor 为准** |
| 时间格式         | ISO 8601 / RFC 3339（带时区）                                                                            |
| UUID 格式        | 统一 string，前端需做 trim 处理                                                                          |
| 软删除策略       | 所有列表查询**默认排除 status=deleted 记录**；需查看已删除记录时显式传 `include_deleted=true`            |
| 敏感操作日志     | 以下操作必须写入 SystemLog：登录/登出、密码变更、角色分配/撤销、用户状态变更、权限变更、用户删除/恢复    |

### 1.2 统一响应格式

```json
{ "code": 200, "message": "success", "data": { ... } }
```

**错误响应：**

```json
{
  "code": 40001,
  "message": "参数校验失败",
  "errors": [{ "field": "username", "message": "用户名不能为空" }]
}
```

> **errors 字段使用规范：** `errors` 数组仅在 `code=40001`（参数校验失败）时返回；其他错误码（401/403/404/409/422/429/500）仅返回 `code` + `message`。

**分页响应:**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 1.3 HTTP 状态码

| 状态码 | 含义                                         |
| ------ | -------------------------------------------- |
| 200    | 成功（含返回体）                             |
| 201    | 创建成功                                     |
| 204    | 仅用于真正的无返回体删除（不用于业务软删除） |
| 400    | 请求参数校验失败                             |
| 401    | 未认证 / Token 无效                          |
| 403    | 认证通过但无权限 / 账号状态禁止访问          |
| 404    | 资源不存在                                   |
| 409    | 资源冲突（如唯一键冲突）                     |
| 410    | 资源已永久删除                               |
| 422    | 语义错误 / 业务规则不满足                    |
| 429    | 请求过于频繁                                 |
| 500    | 服务器内部错误                               |

---

## 二、认证相关

### 2.1 用户登录

```plaintext
POST /api/v1/auth/login
```

**请求体:**

```json
{
  "username": "string",
  "password": "string"
}
```

**响应 200:**

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 7200,
    "user": {
      "id": "uuid",
      "username": "string",
      "real_name": "string",
      "email": "string",
      "avatar_url": "string",
      "status": "active"
    }
  }
}
```

- `access_token`：JWT，TTL 2 小时
- `refresh_token`：Opaque Token，TTL 7 天，存储于数据库 RefreshToken 表
- `status=inactive` 时返回 403

**登录失败限制:** 同一 IP/账号 5 分钟内连续失败 5 次后，锁定 15 分钟，返回 429。

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`auth:login`）。

### 2.2 Token 刷新（双 Token 轮换）

```plaintext
POST /api/v1/auth/refresh
```

**请求体:**

```json
{
  "refresh_token": "string"
}
```

**行为:** 验证 refresh_token 有效性（未使用、未过期），颁发新的 access_token **和**新的 refresh_token（Token 轮换），旧 refresh_token 标记为已使用（`is_used=true`）。

**响应 200:**

```json
{
  "code": 200,
  "message": "刷新成功",
  "data": {
    "access_token": "new_access_token...",
    "refresh_token": "new_refresh_token...",
    "expires_in": 7200
  }
}
```

### 2.3 登出

```plaintext
POST /api/v1/auth/logout
```

**请求头:** `Authorization: Bearer <access_token>`

**请求体:**

```json
{
  "refresh_token": "string"
}
```

**行为:**

1. 服务端将 refresh_token 标记为已使用（`is_used=true`）或物理删除
2. **推荐实现**: 将 access_token 的 `jti` 加入 Redis 黑名单，TTL=access_token 剩余有效期

**响应 200:**

```json
{
  "code": 200,
  "message": "登出成功"
}
```

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`auth:logout`）。

### 2.4 获取当前用户信息

```plaintext
GET /api/v1/auth/me
```

**响应 200:**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "phone": "string",
    "real_name": "string",
    "avatar_url": "string",
    "gender": "male | female | other",
    "status": "active | inactive | banned",
    "last_login_at": "2026-03-27T10:00:00+08:00",
    "created_at": "2026-03-22T00:00:00+08:00",
    "roles": [
      {
        "id": "uuid",
        "code": "student",
        "name": "学生"
      }
    ],
    "permissions": ["user:read", "course:read", ...]
  }
}
```

**特殊响应:** `status=inactive` → 40303；`status=banned` → 40304

### 2.5 用户注册（发送激活邮件）

```plaintext
POST /api/v1/auth/register
```

**请求体:**

```json
{
  "username": "string",
  "password": "string",
  "email": "string",
  "user_type": "student | teacher | admin"
}
```

**行为:** 创建用户（`status=inactive`），发送激活邮件（Token TTL=24h）。

**响应 201:**

```json
{
  "code": 201,
  "message": "注册成功，请前往邮箱激活账号",
  "data": {
    "user_id": "uuid",
    "email": "string"
  }
}
```

### 2.6 激活账号

```plaintext
POST /api/v1/auth/activate
```

**请求体:**

```json
{
  "token": "string"
}
```

**行为:** 验证激活 Token，有效则将 `status: inactive → active`，Token 失效。

**响应 200:**

```json
{
  "code": 200,
  "message": "账号激活成功"
}
```

### 2.7 忘记密码（发送重置邮件)

```plaintext
POST /api/v1/auth/password/forgot
```

**请求体:**

```json
{
  "email": "string"
}
```

**行为:** 验证邮箱存在，发送含重置 Token 的链接邮件（Token TTL=1h）。

**响应 200:**

```json
{
  "code": 200,
  "message": "如该邮箱已注册，重置链接已发送"
}
```

> **安全说明:** 无论邮箱是否存在，均返回相同消息，防止用户枚举攻击。

### 2.8 重置密码（验证 Token + 设置新密码）

```plaintext
POST /api/v1/auth/password/reset/confirm
```

**请求体:**

```json
{
  "token": "string",
  "new_password": "string",
  "confirm_password": "string"
}
```

**行为:** 验证重置 Token，有效则更新密码，Token 失效，**强制使该用户所有 RefreshToken 失效**。

**响应 200:**

```json
{
  "code": 200,
  "message": "密码重置成功，请使用新密码登录"
}
```

---

## 三、用户管理

### 3.1 创建用户（管理员）

```plaintext
POST /api/v1/users
```

**权限要求:** `user:create`（教务管理员 / 超级管理员）

**事务说明:** 创建 User + Student/Teacher/Admin 扩展表 + 分配默认角色，全部在同一事务中执行，失败全部回滚。

**请求体:**

```json
{
  "username": "string",
  "password": "string",
  "email": "string",
  "phone": "string",
  "real_name": "string",
  "gender": "male | female | other",
  "user_type": "student | teacher | admin",
  "avatar_url": "string"
}
```

**学生必填:** `student_number`, `major_id`, `grade`, `class_name`

**教师必填:** `teacher_number`, `department_id`, `title`, `office_location`

**管理员字段:** `admin_type`（`academic | super | security`），`department_id`

**响应 201:**

```json
{
  "code": 201,
  "message": "用户创建成功",
  "data": {
    "id": "uuid",
    "username": "string",
    "user_type": "student",
    "status": "active",
    "created_at": "2026-03-27T10:00:00+08:00"
  }
}
```

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`user:create`）。

### 3.2 批量创建用户（管理员）

```plaintext
POST /api/v1/users/batch
```

**权限要求:** `user:create` + `user:read`（教务管理员 / 超级管理员）

**请求体:**

```json
{
  "users": [
    {
      "username": "string",
      "password": "string",
      "email": "string",
      "real_name": "string",
      "user_type": "student",
      "student_number": "string",
      "major_id": "uuid",
      "grade": 2023
    }
  ]
}
```

> 最多一次批量 100 条，超过时分批调用。

**响应 200:**

```json
{
  "code": 200,
  "message": "批量创建完成",
  "data": {
    "total": 50,
    "success_count": 48,
    "fail_count": 2,
    "results": [
      { "index": 0, "id": "uuid", "status": "created" },
      {
        "index": 1,
        "id": null,
        "error": "username 已存在",
        "reason_code": "USERNAME_CONFLICT",
        "status": "failed"
      }
    ]
  }
}
```

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`user:batch_create`）。

### 3.3 查询用户列表

```plaintext
GET /api/v1/users
```

**权限要求:** `user:read`（教务管理员 / 超级管理员）

**查询参数:**

| 参数              | 类型    | 说明                                                                                          |
| ----------------- | ------- | --------------------------------------------------------------------------------------------- |
| `user_type`       | string  | 筛选类型: `student` / `teacher` / `admin`                                                     |
| `status`          | string  | 状态: `active` / `inactive` / `banned`（**默认排除 deleted**）                                |
| `keyword`         | string  | 搜索关键词（匹配 username / real_name / email），最大 64 字符                                 |
| `major_id`        | uuid    | 按专业筛选（仅学生）                                                                          |
| `department_id`   | uuid    | 按院系筛选（教师/管理员）                                                                     |
| `include_deleted` | boolean | 是否包含已删除用户，默认 `false`                                                              |
| `created_after`   | ISO8601 | 按创建时间筛选（起始）                                                                        |
| `created_before`  | ISO8601 | 按创建时间筛选（截止）                                                                        |
| `page`            | int     | 页码，默认 1                                                                                  |
| `page_size`       | int     | 每页数量，默认 20，最大 100（后端强制校验）                                                   |
| `sort_by`         | string  | 排序字段: `created_at` / `updated_at` / `username` / `real_name` / `last_login_at` / `status` |
| `sort_order`      | string  | `asc` 或 `desc`，默认 `desc`                                                                  |

**响应 200:**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "username": "string",
        "real_name": "string",
        "email": "string",
        "phone": "string",
        "gender": "male",
        "user_type": "student",
        "status": "active",
        "created_at": "2026-03-27T10:00:00+08:00"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 3.4 获取用户详情

```plaintext
GET /api/v1/users/:id
```

**权限要求:** 本人或 `user:read`（管理员）

**N+1 优化说明:** 响应中 `profile.major.department` 等嵌套对象需使用 Prisma `include` 预加载，避免 N+1 查询。

**响应 200:**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "phone": "string",
    "real_name": "string",
    "avatar_url": "string",
    "gender": "male",
    "status": "active",
    "last_login_at": "2026-03-27T10:00:00+08:00",
    "created_at": "2026-03-22T00:00:00+08:00",
    "updated_at": "2026-03-27T10:00:00+08:00",
    "user_type": "student",
    "profile": {
      "student_number": "string",
      "major": {
        "id": "uuid",
        "name": "计算机科学与技术",
        "department": {
          "id": "uuid",
          "name": "计算机学院"
        }
      },
      "grade": 2023,
      "class_name": "1班"
    },
    "roles": [
      {
        "id": "uuid",
        "code": "student",
        "name": "学生"
      }
    ]
  }
}
```

### 3.5 更新用户信息

```plaintext
PATCH /api/v1/users/:id
```

**权限要求:** 本人可修改: `email`、`phone`、`real_name`、`avatar_url`、`gender`；管理员可额外修改: `status`、`user_type`。

**PATCH 修改 user_type 说明:**

- `student → teacher`: 需同时传入 `teacher_number` + `department_id`，系统自动创建 Teacher 记录，原 Student 记录保留但不激活
- `teacher → student`: 需同时传入 `student_number` + `major_id` + `grade`
- 类型变更后旧扩展表记录**不自动物理删除**，由管理员手动处理

**响应 200:** 更新后的用户对象

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`user:update`）。

### 3.6 删除用户（软删除）

```plaintext
DELETE /api/v1/users/:id
```

**权限要求:** `user:delete`（教务管理员 / 超级管理员）

**行为:** 将 `status` 设为 `deleted`；**保留 UserRole 记录**；用户无法再登录。

**响应 200:**

```json
{
  "code": 200,
  "message": "用户已删除",
  "data": {
    "id": "uuid",
    "status": "deleted"
  }
}
```

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`user:delete`）。

### 3.7 批量修改用户状态

```plaintext
PATCH /api/v1/users/batch/status
```

**权限要求:** `user:update`（教务管理员 / 超级管理员）

**请求体:**

```json
{
  "user_ids": ["uuid", "uuid"],
  "status": "active | inactive | banned",
  "reason": "string"
}
```

> `user_ids` 最多 100 条；`status=banned` 时 `reason` 必填。

**响应 200:**

```json
{
  "code": 200,
  "message": "批量状态更新完成",
  "data": {
    "total": 20,
    "success_count": 18,
    "fail_count": 2,
    "failures": [
      {
        "user_id": "uuid",
        "reason": "用户不存在或已删除"
      }
    ]
  }
}
```

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`user:batch_update_status`）。

### 3.8 修改密码（本人)

```plaintext
PATCH /api/v1/users/:id/password
```

**权限要求:** 本人（需验证旧密码）

**请求体:**

```json
{
  "old_password": "string",
  "new_password": "string",
  "confirm_password": "string"
}
```

> 密码要求: 最少 8 字符，至少包含大小写字母和数字；`new_password` 与 `old_password` 不能相同。

**行为:** 修改成功后，**强制使该用户所有 RefreshToken 失效**。

**响应 200:**

```json
{
  "code": 200,
  "message": "密码修改成功，请重新登录",
  "data": {
    "relogin_required": true
  }
}
```

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`user:password_change`）。

### 3.9 重置密码（管理员)

```plaintext
POST /api/v1/users/:id/password/reset
```

**权限要求:** `user:update`（教务管理员 / 超级管理员）

**行为:** 将密码重置为系统默认密码（或生成临时密码），**强制使该用户所有 RefreshToken 失效**，临时密码通过私密通道告知用户。

> **安全说明:** 临时密码不通过 HTTP Response 返回明文，而是通过邮件/短信发送。

**响应 200:**

```json
{
  "code": 200,
  "message": "密码已重置，已发送通知",
  "data": {
    "temporary_password_sent_via": "email"
  }
}
```

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`user:password_reset`）。

### 3.10 用户状态管理

```plaintext
PATCH /api/v1/users/:id/status
```

**权限要求:** `user:update`（教务管理员 / 超级管理员）

**请求体:**

```json
{
  "status": "active | inactive | banned",
  "reason": "string"
}
```

> `status=banned` 时 `reason` 必填；`status=active` 用于管理员手动激活账号（跳过邮件激活）。

**响应 200:**

```json
{
  "code": 200,
  "message": "状态已更新",
  "data": {
    "id": "uuid",
    "status": "banned"
  }
}
```

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`user:status_change`）。

---

## 四、角色与权限管理

### 4.1 角色列表

```plaintext
GET /api/v1/roles
```

**权限要求:** `role:read`（管理员）

**响应 200:**

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "uuid",
      "name": "学生",
      "code": "student",
      "description": "学生默认角色",
      "permissions": [
        {
          "id": "uuid",
          "code": "user:read",
          "name": "查看用户信息",
          "resource": "user",
          "action": "read"
        }
      ]
    }
  ]
}
```

### 4.2 创建角色

```plaintext
POST /api/v1/roles
```

**权限要求:** `role:create`（超级管理员）

**事务说明:** 创建 Role + 批量插入 RolePermission，全部在同一事务中。

**请求体:**

```json
{
  "name": "string",
  "code": "string",
  "description": "string",
  "permission_ids": ["uuid", "uuid"]
}
```

**响应 201:** 创建的角色对象

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`role:create`）。

### 4.3 更新角色

```plaintext
PATCH /api/v1/roles/:id
```

**权限要求:** `role:update`（超级管理员）

**行为:** 更新 Role 信息 + 替换 RolePermission 关联（先删后插，同事务）。

**响应 200:** 更新后的角色对象

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`role:update`）。

### 4.4 删除角色

```plaintext
DELETE /api/v1/roles/:id
```

**权限要求:** `role:delete`（超级管理员）

**约束:** 角色已分配给用户时返回 422（业务规则不满足）。

**响应 422:**

```json
{
  "code": 42201,
  "message": "无法删除：此角色已分配给用户",
  "errors": [
    {
      "field": "role_id",
      "message": "请先为用户移除此角色后再删除"
    }
  ]
}
```

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`role:delete`）。

### 4.5 分配角色给用户

```plaintext
POST /api/v1/users/:id/roles
```

**权限要求:** `role:assign`（管理员）

**行为:** 追加分配（已存在角色跳过），返回最终角色列表。

**请求体:**

```json
{
  "role_ids": ["uuid", "uuid"]
}
```

**响应 200:**

```json
{
  "code": 200,
  "message": "角色分配成功",
  "data": {
    "user_id": "uuid",
    "roles": [...]
  }
}
```

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`role:assign`）。

### 4.6 撤销用户角色

```plaintext
DELETE /api/v1/users/:id/roles/:role_id
```

**权限要求:** `role:assign`（管理员）

**响应 200:**

```json
{
  "code": 200,
  "message": "角色已撤销"
}
```

> ⚠️ **敏感操作日志:** 本接口必须写入 SystemLog（action=`role:revoke`）。

### 4.7 权限列表

```plaintext
GET /api/v1/permissions
```

**权限要求:** `permission:read`（管理员）

**响应 200:**

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "uuid",
      "code": "user:create",
      "name": "创建用户",
      "resource": "user",
      "action": "create"
    }
  ]
}
```

### 4.8 检查用户权限

```plaintext
GET /api/v1/users/:id/permissions
```

**权限要求:** 本人或管理员

**多角色权限合并策略:** 取所有角色权限的并集；同名权限不冲突。

**响应 200:**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "user_id": "uuid",
    "permissions": ["user:read", "user:update", "course:read", ...],
    "roles": [
      {
        "id": "uuid",
        "code": "student",
        "name": "学生"
      }
    ]
  }
}
```

---

## 五、院系与专业管理

### 5.1 院系列表

```plaintext
GET /api/v1/departments
```

**权限要求:** `department:read`

**查询参数:**

| 参数         | 类型   | 说明                            |
| ------------ | ------ | ------------------------------- |
| `keyword`    | string | 搜索院系名称/代码，最大 64 字符 |
| `page`       | int    | 页码                            |
| `page_size`  | int    | 每页数量，最大 100              |
| `sort_by`    | string | 排序字段: `name` / `created_at` |
| `sort_order` | string | `asc` 或 `desc`，默认 `asc`     |

**响应 200:**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "计算机学院",
        "code": "CS",
        "description": "..."
      }
    ],
    "pagination": { ... }
  }
}
```

### 5.2 创建院系

```plaintext
POST /api/v1/departments
```

**权限要求:** `department:create`（教务管理员）

**请求体:**

```json
{
  "name": "string",
  "code": "string",
  "description": "string"
}
```

**响应 201:** 创建后的院系对象

### 5.3 更新院系

```plaintext
PATCH /api/v1/departments/:id
```

**权限要求:** `department:update`（教务管理员）

**请求体:**

```json
{
  "name": "string",
  "code": "string",
  "description": "string"
}
```

**响应 200:** 更新后的院系对象

### 5.4 删除院系

```plaintext
DELETE /api/v1/departments/:id
```

**权限要求:** `department:delete`（超级管理员）

**约束检查:** 院系下存在专业或教师时，禁止删除。

**约束违反响应 409:**

```json
{
  "code": 40901,
  "message": "无法删除：此院系下存在专业或教师",
  "errors": [
    {
      "field": "department_id",
      "message": "请先删除或迁移下属专业（X个）和教师（X人）"
    }
  ]
}
```

**响应 200:**

```json
{
  "code": 200,
  "message": "院系已删除",
  "data": {
    "id": "uuid"
  }
}
```

### 5.5 专业列表

```plaintext
GET /api/v1/majors
```

**权限要求:** `major:read`

**查询参数:**

| 参数            | 类型   | 说明                            |
| --------------- | ------ | ------------------------------- |
| `department_id` | uuid   | 按院系筛选                      |
| `keyword`       | string | 搜索专业名称/代码，最大 64 字符 |
| `page`          | int    | 页码                            |
| `page_size`     | int    | 每页数量，最大 100              |
| `sort_by`       | string | 排序字段: `name` / `created_at` |
| `sort_order`    | string | `asc` 或 `desc`，默认 `asc`     |

**响应 200:**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "计算机科学与技术",
        "code": "CS001",
        "department": {
          "id": "uuid",
          "name": "计算机学院"
        },
        "degree_type": "bachelor",
        "total_credits": 160.0
      }
    ],
    "pagination": { ... }
  }
}
```

### 5.6 创建专业

```plaintext
POST /api/v1/majors
```

**权限要求:** `major:create`（教务管理员）

**请求体:**

```json
{
  "name": "string",
  "code": "string",
  "department_id": "uuid",
  "degree_type": "bachelor | master | doctor",
  "total_credits": 160.0
}
```

**响应 201:** 创建后的专业对象

### 5.7 更新专业

```plaintext
PATCH /api/v1/majors/:id
```

**权限要求:** `major:update`（教务管理员）

**请求体:** 同 5.6

**响应 200:** 更新后的专业对象

### 5.8 删除专业

```plaintext
DELETE /api/v1/majors/:id
```

**权限要求:** `major:delete`（超级管理员）

**约束检查:** 专业下存在学生时，禁止删除。（注: `status=deleted` 的软删除学生不计入）

**约束违反响应 409:**

```json
{
  "code": 40902,
  "message": "无法删除：此专业下存在在校学生",
  "errors": [
    {
      "field": "major_id",
      "message": "请先删除或迁移学生（X人）"
    }
  ]
}
```

**响应 200:**

```json
{
  "code": 200,
  "message": "专业已删除",
  "data": {
    "id": "uuid"
  }
}
```

---

## 六、系统日志

### 6.1 日志列表

```plaintext
GET /api/v1/system-logs
```

**权限要求:** `log:read`（安全管理员 / 超级管理员）

**查询参数:**

| 参数            | 类型    | 说明               |
| --------------- | ------- | ------------------ |
| `user_id`       | uuid    | 筛选操作用户       |
| `action`        | string  | 筛选操作类型       |
| `resource_type` | string  | 筛选资源类型       |
| `start_time`    | ISO8601 | 起始时间           |
| `end_time`      | ISO8601 | 结束时间           |
| `page`          | int     | 页码               |
| `page_size`     | int     | 每页数量，最大 100 |

**响应 200:**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "user_id": "uuid",
        "user": {
          "id": "uuid",
          "username": "string",
          "real_name": "string"
        },
        "action": "user:delete",
        "resource_type": "user",
        "resource_id": "uuid",
        "ip_address": "10.0.0.1",
        "user_agent": "Mozilla/5.0...",
        "details": {
          "deleted_username": "xxx"
        },
        "created_at": "2026-03-27T10:00:00+08:00"
      }
    ],
    "pagination": { ... }
  }
}
```

### 6.2 用户操作日志

```plaintext
GET /api/v1/users/:id/logs
```

**权限要求:** 本人或 `log:read`（安全管理员 / 超级管理员）

> **安全管理员说明:** 安全管理员无 `user:read` 权限，通过此接口可获取用户基本信息（id / username / real_name），用于日志关联分析。响应中不包含 profile、roles 等敏感信息。

**响应 200:** 同 6.1，返回该用户的所有操作记录

---

## 七、文件上传

### 7.1 上传头像

```plaintext
POST /api/v1/upload/avatar
```

**权限要求:** 登录用户

**请求:** `multipart/form-data`，字段名 `file`

**约束:** 支持 `jpg`/`jpeg`/`png`/`webp`，最大 2MB；服务端压缩为三个尺寸（small=64x64 / medium=200x200 / large=400x400），中心裁剪。

**响应 200:**

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "https://cdn.example.com/avatars/uuid_l.jpg",
    "sizes": {
      "small": "https://cdn.example.com/avatars/uuid_s.jpg",
      "medium": "https://cdn.example.com/avatars/uuid_m.jpg",
      "large": "https://cdn.example.com/avatars/uuid_l.jpg"
    },
    "file_id": "uuid"
  }
}
```

> `url` 默认返回大尺寸（large）URL；`sizes` 包含全部三个尺寸的前缀映射（`_s`/`_m`/`_l`）。

### 7.2 上传通用文件

```plaintext
POST /api/v1/upload/file
```

**权限要求:** 登录用户

**请求:** `multipart/form-data`，字段名 `file`

**约束:** 最大 10MB；`file_type` 必填（`document`/`Image`/`video`/`other`）；服务端自动校验文件扩展名与 `file_type` 是否匹配。

**响应 200:**

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "https://cdn.example.com/files/uuid.pdf",
    "file_id": "uuid",
    "file_name": "原始文件名.pdf",
    "file_size": 1024000,
    "file_type": "document"
  }
}
```

### 7.3 删除文件

```plaintext
DELETE /api/v1/upload/files/:file_id
```

**权限要求:** 文件上传者本人或管理员

**响应 204:** No Content

---

## 八、数据字典

### 8.1 用户状态枚举

| 值         | 说明                                 |
| ---------- | ------------------------------------ |
| `active`   | 正常，可登录                         |
| `inactive` | 未激活（需邮件激活或管理员手动激活） |
| `banned`   | 已封禁，不可登录                     |
| `deleted`  | 已删除（软删除，不可见于默认列表）   |

### 8.2 管理员类型枚举

| 值         | 说明       |
| ---------- | ---------- |
| `academic` | 教务管理员 |
| `super`    | 超级管理员 |
| `security` | 安全管理员 |

### 8.3 性别枚举

| 值       | 说明 |
| -------- | ---- |
| `male`   | 男   |
| `female` | 女   |
| `other`  | 其他 |

### 8.4 学位类型枚举

| 值         | 说明 |
| ---------- | ---- |
| `bachelor` | 学士 |
| `master`   | 硕士 |
| `doctor`   | 博士 |

### 8.5 预定义角色（统一使用 code）

| code             | 名称       | 默认权限                           |
| ---------------- | ---------- | ---------------------------------- |
| `student`        | 学生       | `user:read`（本人）、`course:read` |
| `teacher`        | 教师       | `user:read`（本人）、`course:read` |
| `academic_admin` | 教务管理员 | 院系/专业管理、用户管理            |
| `security_admin` | 安全管理员 | 系统日志、安全管理                 |
| `super_admin`    | 超级管理员 | 全部权限                           |

> ⚠️ 权限矩阵中全部使用 Role.code（如 `academic_admin`），AdminType 枚举值（`academic`/`super`/`security`）为 `admin_type` 字段值，与 Role.code 是两个独立维度。
