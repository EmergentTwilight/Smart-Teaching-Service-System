---
filename: A-information-management.md
title: STSS A 模块 · 接口设计文档
status: active
version: 2.0.0
last_updated_at: 2026-04-04
last_updated_by: 程韬
description: 基础信息管理子系统 API 接口设计，包含认证、用户管理、角色权限、院系专业、课程管理、培养方案等模块
link: https://tcncx9czflpz.feishu.cn/wiki/DQQewmdsgi6d8kkR1E6cTFbpnzh
---

# STSS A 模块 · 接口设计文档

> Smart Teaching Service System — Subsystem A: 基础信息管理（Information Management）
> 版本：2.0.0 | 更新时间：2026-04-04

---

## 一、设计规范

### 1.1 RESTful 约定

| 规则      | 说明                                                  |
| --------- | ----------------------------------------------------- |
| Base URL  | `/api/v1`                                             |
| 认证方式  | JWT Bearer Token（Access + Refresh 双 Token 机制）    |
| 字段命名  | **响应统一使用 snake_case**（后端自动转换）           |
| 分页参数  | `page`（从 1 开始），`page_size`（默认 20，最大 100） |
| 时间格式  | ISO 8601（带时区）                                    |
| UUID 格式 | 统一 string                                           |

### 1.2 响应格式

**成功：**

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

**分页：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

**错误：**

```json
{
  "code": 40001,
  "message": "参数校验失败",
  "errors": [{ "field": "username", "message": "用户名不能为空" }]
}
```

### 1.3 HTTP 状态码

| 状态码 | 说明           |
| ------ | -------------- |
| 200    | 成功           |
| 201    | 创建成功       |
| 400    | 参数错误       |
| 401    | 未认证         |
| 403    | 无权限         |
| 404    | 资源不存在     |
| 409    | 资源冲突       |
| 422    | 业务规则不满足 |
| 500    | 服务器内部错误 |

---

## 二、认证 API

### 2.1 用户登录

```plaintext
POST /api/v1/auth/login
```

**请求：**

```json
{
  "username": "admin",
  "password": "Admin123"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "opaque_token...",
    "token_type": "Bearer",
    "expires_in": 7200,
    "user": {
      "id": "uuid",
      "username": "admin",
      "real_name": "管理员",
      "email": "admin@example.com",
      "status": "active"
    }
  }
}
```

### 2.2 Token 刷新

```plaintext
POST /api/v1/auth/refresh
```

**请求：**

```json
{
  "refresh_token": "opaque_token..."
}
```

**响应：**

```json
{
  "code": 200,
  "message": "令牌刷新成功",
  "data": {
    "access_token": "new_jwt...",
    "refresh_token": "new_opaque...",
    "token_type": "Bearer",
    "expires_in": 7200
  }
}
```

### 2.3 登出

```plaintext
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

**请求：**

```json
{
  "refresh_token": "opaque_token..."
}
```

**响应：**

```json
{
  "code": 200,
  "message": "登出成功"
}
```

### 2.4 获取当前用户

```plaintext
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "phone": "13800138000",
    "real_name": "管理员",
    "avatar_url": null,
    "gender": "male",
    "status": "active",
    "last_login_at": "2026-04-01T10:00:00+08:00",
    "roles": [
      { "id": "uuid", "code": "super_admin", "name": "超级管理员" }
    ],
    "permissions": ["user:read", "user:create", ...]
  }
}
```

### 2.5 用户注册

```plaintext
POST /api/v1/auth/register
```

**请求：**

```json
{
  "username": "newuser",
  "password": "Password123",
  "email": "user@example.com",
  "real_name": "张三",
  "phone": "13800138000",
  "gender": "MALE"
}
```

**响应：**

```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "id": "uuid",
    "username": "newuser",
    "email": "user@example.com",
    "real_name": "张三",
    "status": "inactive"
  }
}
```

### 2.6 激活账号

```plaintext
POST /api/v1/auth/activate
```

**请求：**

```json
{
  "token": "activation_token..."
}
```

**响应：**

```json
{
  "code": 200,
  "message": "账号激活成功"
}
```

### 2.7 忘记密码

```plaintext
POST /api/v1/auth/password/forgot
```

**请求：**

```json
{
  "email": "user@example.com"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "如该邮箱已注册，重置链接已发送"
}
```

### 2.8 验证重置 Token

```plaintext
GET /api/v1/auth/password/reset/verify?token=xxx
```

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "valid": true,
    "email": "user@example.com"
  }
}
```

### 2.9 重置密码

```plaintext
POST /api/v1/auth/password/reset/confirm
```

**请求：**

```json
{
  "token": "reset_token...",
  "new_password": "NewPassword123"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "密码重置成功"
}
```

### 2.10 修改密码

```plaintext
POST /api/v1/auth/change-password
Authorization: Bearer <access_token>
```

**请求：**

```json
{
  "old_password": "OldPassword123",
  "new_password": "NewPassword123"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "密码修改成功"
}
```

---

## 三、用户管理 API

### 3.1 获取用户列表

```plaintext
GET /api/v1/users
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**查询参数：**

| 参数              | 类型    | 说明                        |
| ----------------- | ------- | --------------------------- |
| `page`            | int     | 页码，默认 1                |
| `page_size`       | int     | 每页数量，默认 20，最大 100 |
| `keyword`         | string  | 搜索关键词                  |
| `status`          | string  | 状态筛选                    |
| `role`            | string  | 角色代码筛选                |
| `include_deleted` | boolean | 是否包含已删除用户          |

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "username": "student1",
        "real_name": "张三",
        "email": "student@example.com",
        "status": "active",
        "roles": ["student"],
        "created_at": "2026-03-01T00:00:00+08:00"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

### 3.2 获取用户统计

```plaintext
GET /api/v1/users/stats
Authorization: Bearer <access_token>
```

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 100,
    "students": 80,
    "teachers": 15,
    "admins": 5,
    "active": 95,
    "inactive": 3,
    "banned": 2
  }
}
```

### 3.3 获取用户详情

```plaintext
GET /api/v1/users/:id
Authorization: Bearer <access_token>
```

**权限：** 本人或管理员

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "username": "student1",
    "email": "student@example.com",
    "phone": "13800138000",
    "real_name": "张三",
    "avatar_url": null,
    "gender": "male",
    "status": "active",
    "last_login_at": "2026-04-01T10:00:00+08:00",
    "created_at": "2026-03-01T00:00:00+08:00",
    "roles": [{ "id": "uuid", "code": "student", "name": "学生" }],
    "student": {
      "student_number": "2023001",
      "major_id": "uuid",
      "major_name": "计算机科学与技术",
      "grade": 2023,
      "class_name": "1班"
    },
    "teacher": null,
    "admin": null
  }
}
```

### 3.4 创建用户

```plaintext
POST /api/v1/users
Authorization: Bearer <access_token>
```

**权限：** `super_admin`

**请求：**

```json
{
  "username": "newuser",
  "password": "Password123",
  "email": "user@example.com",
  "real_name": "张三",
  "phone": "13800138000",
  "gender": "MALE",
  "role_ids": ["uuid"],
  "student": {
    "student_number": "2023001",
    "major_id": "uuid",
    "grade": 2023,
    "class_name": "1班"
  }
}
```

**响应：**

```json
{
  "code": 201,
  "message": "用户创建成功",
  "data": {
    "id": "uuid",
    "username": "newuser",
    "status": "active"
  }
}
```

### 3.5 批量创建用户

```plaintext
POST /api/v1/users/batch
Authorization: Bearer <access_token>
```

**权限：** `super_admin`

**请求：**

```json
{
  "users": [
    { "username": "user1", "password": "Password123", ... },
    { "username": "user2", "password": "Password123", ... }
  ]
}
```

**响应：**

```json
{
  "code": 200,
  "message": "批量创建完成",
  "data": {
    "total": 10,
    "success_count": 9,
    "fail_count": 1,
    "results": [
      { "index": 0, "id": "uuid", "status": "created" },
      { "index": 1, "error": "用户名已存在", "status": "failed" }
    ]
  }
}
```

### 3.6 更新用户

```plaintext
PUT /api/v1/users/:id
Authorization: Bearer <access_token>
```

**权限：** 本人或管理员

**请求：**

```json
{
  "email": "newemail@example.com",
  "phone": "13900139000",
  "real_name": "李四",
  "gender": "MALE",
  "role_ids": ["uuid1", "uuid2"]
}
```

**响应：**

```json
{
  "code": 200,
  "message": "用户更新成功",
  "data": { ... }
}
```

### 3.7 删除用户

```plaintext
DELETE /api/v1/users/:id
Authorization: Bearer <access_token>
```

**权限：** `super_admin`

**响应：**

```json
{
  "code": 200,
  "message": "用户已删除"
}
```

### 3.8 修改用户状态

```plaintext
PATCH /api/v1/users/:id/status
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "status": "banned",
  "reason": "违反使用规定"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "状态已更新"
}
```

### 3.9 批量修改状态

```plaintext
PATCH /api/v1/users/batch/status
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "user_ids": ["uuid1", "uuid2"],
  "status": "active",
  "role_ids": ["uuid"]
}
```

**响应：**

```json
{
  "code": 200,
  "message": "批量状态更新完成",
  "data": {
    "updated_count": 10,
    "failed_count": 0
  }
}
```

### 3.10 修改密码（用户自己）

```plaintext
PATCH /api/v1/users/:id/password
Authorization: Bearer <access_token>
```

**权限：** 本人

**请求：**

```json
{
  "old_password": "OldPassword123",
  "new_password": "NewPassword123"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "密码修改成功"
}
```

### 3.11 重置密码（管理员）

```plaintext
POST /api/v1/users/:id/password/reset
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "new_password": "TempPassword123"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "密码已重置"
}
```

### 3.12 分配角色

```plaintext
POST /api/v1/users/:id/roles
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "role_ids": ["uuid1", "uuid2"]
}
```

**响应：**

```json
{
  "code": 200,
  "message": "角色分配成功"
}
```

### 3.13 撤销角色

```plaintext
DELETE /api/v1/users/:id/roles/:role_id
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**响应：**

```json
{
  "code": 200,
  "message": "角色已撤销"
}
```

### 3.14 获取用户权限

```plaintext
GET /api/v1/users/:id/permissions
Authorization: Bearer <access_token>
```

**权限：** 本人或管理员

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "user_id": "uuid",
    "permissions": ["user:read", "user:create"],
    "roles": [{ "id": "uuid", "code": "admin", "name": "管理员" }]
  }
}
```

### 3.15 获取角色列表

```plaintext
GET /api/v1/roles
Authorization: Bearer <access_token>
```

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "uuid",
      "code": "student",
      "name": "学生",
      "description": "学生角色"
    }
  ]
}
```

### 3.16 获取系统日志

```plaintext
GET /api/v1/logs
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**查询参数：**

| 参数         | 类型   | 说明         |
| ------------ | ------ | ------------ |
| `user_id`    | uuid   | 筛选用户     |
| `action`     | string | 筛选操作类型 |
| `start_time` | string | 起始时间     |
| `end_time`   | string | 结束时间     |
| `page`       | int    | 页码         |
| `page_size`  | int    | 每页数量     |

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "user_id": "uuid",
        "username": "admin",
        "real_name": "管理员",
        "action": "auth:login",
        "resource_type": "user",
        "resource_id": "uuid",
        "ip_address": "10.0.0.1",
        "user_agent": "Mozilla/5.0...",
        "details": {},
        "created_at": "2026-04-01T10:00:00+08:00"
      }
    ],
    "pagination": { ... }
  }
}
```

---

## 四、院系管理 API

### 4.1 获取院系列表

```plaintext
GET /api/v1/departments
Authorization: Bearer <access_token>
```

**查询参数：**

| 参数     | 类型   | 说明         |
| -------- | ------ | ------------ |
| `page`   | int    | 页码         |
| `page_size` | int | 每页数量  |
| `keyword` | string | 搜索关键词 |

**响应：**

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
        "description": "...",
        "teacher_count": 50,
        "student_count": 500,
        "major_count": 3,
        "created_at": "2026-03-01T00:00:00+08:00"
      }
    ],
    "pagination": { ... }
  }
}
```

### 4.2 获取院系详情

```plaintext
GET /api/v1/departments/:id
Authorization: Bearer <access_token>
```

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "计算机学院",
    "code": "CS",
    "description": "...",
    "majors": [
      {
        "id": "uuid",
        "name": "计算机科学与技术",
        "code": "CS001",
        "degree_type": "bachelor",
        "student_count": 200
      }
    ],
    "teachers": [
      {
        "id": "uuid",
        "teacher_number": "T001",
        "real_name": "张教授",
        "title": "教授"
      }
    ],
    "created_at": "2026-03-01T00:00:00+08:00",
    "updated_at": "2026-04-01T00:00:00+08:00"
  }
}
```

### 4.3 创建院系

```plaintext
POST /api/v1/departments
Authorization: Bearer <access_token>
```

**权限：** `super_admin`

**请求：**

```json
{
  "name": "计算机学院",
  "code": "CS",
  "description": "计算机科学与技术相关学科"
}
```

**响应：**

```json
{
  "code": 201,
  "message": "院系创建成功",
  "data": {
    "id": "uuid",
    "name": "计算机学院",
    "code": "CS"
  }
}
```

### 4.4 更新院系

```plaintext
PUT /api/v1/departments/:id
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "name": "计算机科学与技术学院",
  "description": "更新后的描述"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "院系更新成功",
  "data": { ... }
}
```

### 4.5 删除院系

```plaintext
DELETE /api/v1/departments/:id
Authorization: Bearer <access_token>
```

**权限：** `super_admin`

**前置条件：** 院系下无关联教师、专业

**响应：**

```json
{
  "code": 200,
  "message": "院系已删除"
}
```

---

## 五、专业管理 API

### 5.1 获取专业列表

```plaintext
GET /api/v1/majors
Authorization: Bearer <access_token>
```

**查询参数：**

| 参数            | 类型    | 说明         |
| --------------- | ------- | ------------ |
| `page`          | int     | 页码         |
| `page_size`     | int     | 每页数量     |
| `department_id` | uuid    | 院系ID筛选   |
| `keyword`       | string  | 搜索关键词   |

**响应：**

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
        "department_id": "uuid",
        "department_name": "计算机学院",
        "degree_type": "bachelor",
        "total_credits": 160.0,
        "student_count": 200,
        "created_at": "2026-03-01T00:00:00+08:00"
      }
    ],
    "pagination": { ... }
  }
}
```

### 5.2 获取专业详情

```plaintext
GET /api/v1/majors/:id
Authorization: Bearer <access_token>
```

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "计算机科学与技术",
    "code": "CS001",
    "department_id": "uuid",
    "department_name": "计算机学院",
    "degree_type": "bachelor",
    "total_credits": 160.0,
    "description": "...",
    "curriculums": [
      {
        "id": "uuid",
        "name": "2023级培养方案",
        "year": 2023,
        "total_credits": 160.0
      }
    ],
    "students": [
      {
        "user_id": "uuid",
        "student_number": "2023001",
        "real_name": "张三",
        "grade": 2023
      }
    ],
    "created_at": "2026-03-01T00:00:00+08:00",
    "updated_at": "2026-04-01T00:00:00+08:00"
  }
}
```

### 5.3 创建专业

```plaintext
POST /api/v1/majors
Authorization: Bearer <access_token>
```

**权限：** `super_admin`

**请求：**

```json
{
  "name": "计算机科学与技术",
  "code": "CS001",
  "department_id": "uuid",
  "degree_type": "bachelor",
  "total_credits": 160.0
}
```

**响应：**

```json
{
  "code": 201,
  "message": "专业创建成功",
  "data": {
    "id": "uuid",
    "name": "计算机科学与技术",
    "code": "CS001"
  }
}
```

### 5.4 更新专业

```plaintext
PUT /api/v1/majors/:id
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "name": "计算机科学与技术（更新）",
  "total_credits": 165.0
}
```

**响应：**

```json
{
  "code": 200,
  "message": "专业更新成功",
  "data": { ... }
}
```

### 5.5 删除专业

```plaintext
DELETE /api/v1/majors/:id
Authorization: Bearer <access_token>
```

**权限：** `super_admin`

**前置条件：** 专业下无关联学生

**响应：**

```json
{
  "code": 200,
  "message": "专业已删除"
}
```

---

## 六、课程管理 API

### 6.1 获取课程列表

```plaintext
GET /api/v1/courses
Authorization: Bearer <access_token>
```

**查询参数：**

| 参数            | 类型   | 说明               |
| --------------- | ------ | ------------------ |
| `page`          | int    | 页码               |
| `page_size`     | int    | 每页数量           |
| `keyword`       | string | 搜索关键词         |
| `department_id` | uuid   | 院系ID筛选         |
| `course_type`   | string | 类型：required/elective/general |
| `status`        | string | 状态：active/archived |

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "code": "CS101",
        "name": "数据结构",
        "credits": 4.0,
        "hours": 64,
        "course_type": "required",
        "category": "专业必修",
        "department_id": "uuid",
        "department_name": "计算机学院",
        "teacher_id": "uuid",
        "teacher_name": "张教授",
        "status": "active",
        "created_at": "2026-03-01T00:00:00+08:00"
      }
    ],
    "pagination": { ... }
  }
}
```

### 6.2 获取课程详情

```plaintext
GET /api/v1/courses/:id
Authorization: Bearer <access_token>
```

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "code": "CS101",
    "name": "数据结构",
    "credits": 4.0,
    "hours": 64,
    "course_type": "required",
    "category": "专业必修",
    "department_id": "uuid",
    "department_name": "计算机学院",
    "teacher_id": "uuid",
    "teacher_name": "张教授",
    "description": "本课程介绍基本数据结构...",
    "assessment_method": "平时30% + 期末70%",
    "status": "active",
    "prerequisites": [
      {
        "id": "uuid",
        "code": "CS100",
        "name": "程序设计基础"
      }
    ],
    "created_at": "2026-03-01T00:00:00+08:00",
    "updated_at": "2026-04-01T00:00:00+08:00"
  }
}
```

### 6.3 创建课程

```plaintext
POST /api/v1/courses
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "code": "CS101",
  "name": "数据结构",
  "credits": 4.0,
  "hours": 64,
  "course_type": "required",
  "category": "专业必修",
  "department_id": "uuid",
  "teacher_id": "uuid",
  "description": "本课程介绍基本数据结构...",
  "assessment_method": "平时30% + 期末70%",
  "prerequisite_ids": ["uuid"]
}
```

**响应：**

```json
{
  "code": 201,
  "message": "课程创建成功",
  "data": {
    "id": "uuid",
    "code": "CS101",
    "name": "数据结构"
  }
}
```

### 6.4 更新课程

```plaintext
PUT /api/v1/courses/:id
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "name": "数据结构（更新版）",
  "credits": 3.5,
  "description": "更新后的描述",
  "prerequisite_ids": ["uuid1", "uuid2"]
}
```

**响应：**

```json
{
  "code": 200,
  "message": "课程更新成功",
  "data": { ... }
}
```

### 6.5 删除课程

```plaintext
DELETE /api/v1/courses/:id
Authorization: Bearer <access_token>
```

**权限：** `super_admin`

**前置条件：** 课程未被任何培养方案引用

**响应：**

```json
{
  "code": 200,
  "message": "课程已删除"
}
```

### 6.6 批量创建课程

```plaintext
POST /api/v1/courses/batch
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "courses": [
    { "code": "CS101", "name": "数据结构", ... },
    { "code": "CS102", "name": "算法设计", ... }
  ]
}
```

**响应：**

```json
{
  "code": 200,
  "message": "批量创建完成",
  "data": {
    "total": 10,
    "success_count": 9,
    "fail_count": 1,
    "results": [
      { "index": 0, "id": "uuid", "status": "created" },
      { "index": 1, "error": "课程代码已存在", "status": "failed" }
    ]
  }
}
```

---

## 七、培养方案管理 API

### 7.1 获取培养方案列表

```plaintext
GET /api/v1/curriculums
Authorization: Bearer <access_token>
```

**查询参数：**

| 参数       | 类型   | 说明       |
| ---------- | ------ | ---------- |
| `page`     | int    | 页码       |
| `page_size` | int   | 每页数量   |
| `major_id` | uuid   | 专业ID筛选 |
| `year`     | int    | 年份筛选   |

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "2023级培养方案",
        "major_id": "uuid",
        "major_name": "计算机科学与技术",
        "year": 2023,
        "total_credits": 160.0,
        "required_credits": 120.0,
        "elective_credits": 40.0,
        "course_count": 45,
        "created_at": "2026-03-01T00:00:00+08:00"
      }
    ],
    "pagination": { ... }
  }
}
```

### 7.2 获取培养方案详情

```plaintext
GET /api/v1/curriculums/:id
Authorization: Bearer <access_token>
```

**响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "2023级培养方案",
    "major_id": "uuid",
    "major_name": "计算机科学与技术",
    "year": 2023,
    "total_credits": 160.0,
    "required_credits": 120.0,
    "elective_credits": 40.0,
    "courses": [
      {
        "course_id": "uuid",
        "course_code": "CS101",
        "course_name": "数据结构",
        "credits": 4.0,
        "course_type": "required",
        "semester_suggestion": 2
      }
    ],
    "created_at": "2026-03-01T00:00:00+08:00",
    "updated_at": "2026-04-01T00:00:00+08:00"
  }
}
```

### 7.3 创建培养方案

```plaintext
POST /api/v1/curriculums
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "name": "2023级培养方案",
  "major_id": "uuid",
  "year": 2023,
  "total_credits": 160.0,
  "required_credits": 120.0,
  "elective_credits": 40.0
}
```

**响应：**

```json
{
  "code": 201,
  "message": "培养方案创建成功",
  "data": {
    "id": "uuid",
    "name": "2023级培养方案"
  }
}
```

### 7.4 更新培养方案

```plaintext
PUT /api/v1/curriculums/:id
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "name": "2023级培养方案（修订版）",
  "total_credits": 165.0,
  "required_credits": 125.0,
  "elective_credits": 40.0
}
```

**响应：**

```json
{
  "code": 200,
  "message": "培养方案更新成功",
  "data": { ... }
}
```

### 7.5 删除培养方案

```plaintext
DELETE /api/v1/curriculums/:id
Authorization: Bearer <access_token>
```

**权限：** `super_admin`

**响应：**

```json
{
  "code": 200,
  "message": "培养方案已删除"
}
```

### 7.6 添加课程到培养方案

```plaintext
POST /api/v1/curriculums/:id/courses
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "course_id": "uuid",
  "course_type": "required",
  "semester_suggestion": 2
}
```

**响应：**

```json
{
  "code": 200,
  "message": "课程已添加到培养方案"
}
```

### 7.7 批量添加课程到培养方案

```plaintext
POST /api/v1/curriculums/:id/courses/batch
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "courses": [
    { "course_id": "uuid1", "course_type": "required", "semester_suggestion": 1 },
    { "course_id": "uuid2", "course_type": "elective", "semester_suggestion": 3 }
  ]
}
```

**响应：**

```json
{
  "code": 200,
  "message": "批量添加完成",
  "data": {
    "success_count": 10,
    "fail_count": 0
  }
}
```

### 7.8 从培养方案移除课程

```plaintext
DELETE /api/v1/curriculums/:id/courses/:course_id
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**响应：**

```json
{
  "code": 200,
  "message": "课程已从培养方案移除"
}
```

### 7.9 更新培养方案中的课程

```plaintext
PUT /api/v1/curriculums/:id/courses/:course_id
Authorization: Bearer <access_token>
```

**权限：** `admin`、`super_admin`

**请求：**

```json
{
  "course_type": "elective",
  "semester_suggestion": 4
}
```

**响应：**

```json
{
  "code": 200,
  "message": "课程信息已更新"
}
```

---

## 八、权限说明

### 8.1 角色类型

| 角色       | 代码          | 说明          |
| ---------- | ------------- | ------------- |
| 学生       | `student`     | 学生默认角色  |
| 教师       | `teacher`     | 教师默认角色  |
| 教务管理员 | `admin`       | 院系/用户管理 |
| 超级管理员 | `super_admin` | 最高权限      |

### 8.2 权限代码

| 权限              | 说明           |
| ----------------- | -------------- |
| `user:read`       | 查看用户信息   |
| `user:create`     | 创建用户       |
| `user:update`     | 更新用户       |
| `user:delete`     | 删除用户       |
| `department:read` | 查看院系       |
| `department:create` | 创建院系     |
| `department:update` | 更新院系     |
| `department:delete` | 删除院系     |
| `major:read`      | 查看专业       |
| `major:create`    | 创建专业       |
| `major:update`    | 更新专业       |
| `major:delete`    | 删除专业       |
| `course:read`     | 查看课程       |
| `course:create`   | 创建课程       |
| `course:update`   | 更新课程       |
| `course:delete`   | 删除课程       |
| `curriculum:read` | 查看培养方案   |
| `curriculum:create` | 创建培养方案 |
| `curriculum:update` | 更新培养方案 |
| `curriculum:delete` | 删除培养方案 |

---

## 变更记录

### v2.0.0 (2026-04-04)

- **重大更新：** 完善所有 A 模块功能接口
- 新增课程管理 API（6.1 - 6.6）
- 新增院系管理 API（4.3 - 4.5）
- 新增专业管理 API（5.1 - 5.5）
- 新增培养方案管理 API（7.1 - 7.9）
- 完善权限代码列表
- 修正 `GET /roles` 路径（原 `/users/roles`）
- 修正 `GET /logs` 路径（原 `/users/logs`）
- 完善响应字段（增加关联数据）

### v1.1.0 (2026-04-01)

- 与实际实现对齐
- 添加 `GET /users/stats` 接口
- 添加 `GET /auth/password/reset/verify` 接口
- 修正 `PUT /users/:id`（原文档为 PATCH）
- 标注院系/专业增删改接口未实现
- 简化文档结构

### v1.0.0 (2026-03-27)

- 初始版本
