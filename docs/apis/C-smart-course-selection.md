---
filename: C-smart-course-selection.md
title: STSS C 模块 · 接口设计文档
status: active
version: 1.0.0
last_updated_at: 2026-05-13
last_updated_by: C 组
description: 智能选课子系统 API 接口设计，包含培养方案、课程搜索、选课退选、课表结果、教师名单、教务管理和 AI 辅助选课
link: https://tcncx9czflpz.feishu.cn/wiki/BgpmwKkYqifNkjk1Psdc0gitn2b
---

# STSS C 模块 · 接口设计文档

本 API 文档依据 C 组 SRS（ docs/srs/C-smart-course-selection-srs.md ）、数据库设计（ docs/database-design.md ）、项目要求（ docs/project-requirements.md ）、开发规范（ docs/development-specifications.md ）等文件。

> Smart Teaching Service System — Subsystem C: 智能选课（Smart Course Selection）
> 版本：1.0.0 | 更新时间：2026-05-13

---

## 一、设计约定

### 1.1 基础约定

| 项目 | 约定 |
| ---- | ---- |
| Base URL | `/api/v1/course-selection` |
| 认证方式 | JWT Bearer Token |
| 字段命名 | 请求与响应统一使用 `snake_case` |
| 时间格式 | ISO 8601（带时区），选课阶段判断以服务端时间为准 |
| UUID | string |
| 分页参数 | `page` 从 1 开始，`page_size` 默认 20，最大 100 |
| 数据来源 | 仅引用现有 `Student`、`Course`、`CourseOffering`、`Schedule`、`Curriculum`、`CurriculumCourse`、`CoursePrerequisite`、`Enrollment`、`SelectionPeriod`、`Semester`、`Teacher`、`SystemLog` 等表，不新增数据库业务表 |

### 1.2 统一响应格式

成功：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

分页：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

错误：

```json
{
  "code": 42201,
  "message": "课程容量已满",
  "errors": [
    {
      "field": "course_offering_id",
      "message": "当前课程开设已达到容量上限"
    }
  ]
}
```

### 1.3 角色与权限

| 角色 | 角色代码建议 | C 模块权限边界 |
| ---- | ------------ | -------------- |
| 学生 | `student` | 查看本人培养方案、课程、可选课程、本人选课记录、本人课表；发起本人选课、退选和 AI 辅助请求 |
| 教师 | `teacher` | 查看和导出本人授课的课程开设名单 |
| 教务管理人员 | `academic_admin` | 管理选课时间段；在特殊情况下为指定学生手动加课 |
| 系统管理员 | `system_admin` | 仅负责系统级权限、连接控制、异常审计等，不替代教务业务审批 |

学生端接口必须从当前登录用户解析 `student_id`，不得由前端传入 `student_id`。教师端接口必须校验当前教师是目标 `CourseOffering.teacher_id`。教务端接口必须校验 `academic_admin` 权限，并对关键操作写入 `SystemLog`。

### 1.4 C 模块枚举

| 枚举 | 值 | 来源 |
| ---- | -- | ---- |
| `course_type` | `required`、`elective`、`general` | `Course.course_type`、`CurriculumCourse.course_type` |
| `course_status` | `active`、`archived` | `Course.status` |
| `offering_status` | `planned`、`open`、`closed`、`cancelled` | `CourseOffering.status` |
| `enrollment_status` | `enrolled`、`dropped`、`withdrawn` | `Enrollment.status` |
| `selection_phase` | `first_round`、`second_round`、`adjustment` | `SelectionPeriod.phase` |
| `semester_status` | `upcoming`、`current`、`ended` | `Semester.status` |

### 1.5 跨接口事务与校验规则

| 编号 | 规则 | 对应需求 |
| ---- | ---- | -------- |
| `RULE-C-01` | 所有学生端接口通过 JWT 解析当前学生，禁止信任前端传入的学生身份。 | `FR-C-26`、`NFR-C-06` |
| `RULE-C-02` | 选课、退选、教务手动加课必须在数据库事务中完成，并保持 `Enrollment` 与 `CourseOffering.enrolled_count` 一致。 | `FR-C-17`、`FR-C-21`、`FR-C-22`、`NFR-C-04` |
| `RULE-C-03` | 选课写入前必须校验课程开设状态、容量、重复有效选课、选课时间段、最大学分、培养方案适配性、课表冲突和先修课程。 | `FR-C-14`、`FR-C-16` 至 `FR-C-20`、`FR-C-23` |
| `RULE-C-04` | 并发选课必须避免容量超卖，建议对目标 `CourseOffering` 行加锁或使用条件更新。 | `FR-C-22`、`NFR-C-05` |
| `RULE-C-05` | 退选不得删除 `Enrollment`，只能将状态更新为 `dropped` 并记录 `dropped_at`。 | `FR-C-21` |
| `RULE-C-06` | AI 只能推荐和解释，不得直接写入 `Enrollment`，不得绕过硬性业务规则。 | `FR-C-38` 至 `FR-C-43`、`NFR-C-10` |
| `RULE-C-07` | 课程搜索、可选课程、选课结果和教师名单应支持筛选或分页，避免一次性返回过大结果集。 | `FR-C-12`、`FR-C-29`、`NFR-C-13` |
| `RULE-C-08` | 选课核心流程应接入准入控制和无操作释放机制，释放会话不得影响已保存的选课记录。 | `FR-C-35`、`FR-C-36`、`NFR-C-01` 至 `NFR-C-03` |

---

## 二、接口列表

### 2.1 学生端

| 接口 | 方法 | 路由 | 对应需求 |
| ---- | ---- | ---- | -------- |
| 查看本人培养方案 | GET | `/curriculum/me` | `FR-C-01` 至 `FR-C-07` |
| 查看本人培养方案进度 | GET | `/curriculum/me/progress` | `FR-C-05` |
| 搜索课程目录 | GET | `/courses` | `FR-C-08` 至 `FR-C-12` |
| 查询课程开设列表 | GET | `/offerings` | `FR-C-08` 至 `FR-C-12`、`FR-C-15` |
| 查询本人可选课程 | GET | `/offerings/available` | `FR-C-13` 至 `FR-C-20` |
| 查看课程开设详情 | GET | `/offerings/:id` | `FR-C-11`、`FR-C-18`、`FR-C-19` |
| 查看本人选课记录 | GET | `/enrollments/me` | `FR-C-24`、`FR-C-26`、`FR-C-29` |
| 提交选课 | POST | `/enrollments` | `FR-C-14` 至 `FR-C-23` |
| 退选课程 | PATCH | `/enrollments/:id/drop` | `FR-C-14`、`FR-C-21`、`FR-C-22` |
| 查看本人课表 | GET | `/timetable/me` | `FR-C-25`、`FR-C-26` |
| AI 推荐课程 | POST | `/ai-advisor/recommend` | `FR-C-38` 至 `FR-C-43` |
| AI 解释课程 | POST | `/ai-advisor/explain` | `FR-C-38` 至 `FR-C-43` |

### 2.2 教师端

| 接口 | 方法 | 路由 | 对应需求 |
| ---- | ---- | ---- | -------- |
| 查看课程学生名单 | GET | `/teacher/offerings/:id/roster` | `FR-C-27` |
| 导出课程学生名单 | GET | `/teacher/offerings/:id/roster/export` | `FR-C-28` |

### 2.3 教务管理端

| 接口 | 方法 | 路由 | 对应需求 |
| ---- | ---- | ---- | -------- |
| 查询选课时间段 | GET | `/admin/periods` | `FR-C-30` 至 `FR-C-32` |
| 创建选课时间段 | POST | `/admin/periods` | `FR-C-30`、`FR-C-31`、`FR-C-37` |
| 修改选课时间段 | PATCH | `/admin/periods/:id` | `FR-C-30` 至 `FR-C-32`、`FR-C-37` |
| 教务手动加课 | POST | `/admin/enrollments` | `FR-C-33`、`FR-C-34`、`FR-C-37` |

> 路由注册时应将 `/offerings/available` 放在 `/offerings/:id` 之前，避免静态路由被动态参数吞掉。

---

## 三、学生端接口

### 3.1 查看本人培养方案

```plaintext
GET /api/v1/course-selection/curriculum/me
Authorization: Bearer <access_token>
```

**权限说明**

仅 `student` 可访问。后端通过当前登录用户关联 `Student.major_id` 与 `Student.grade`，查询匹配的 `Curriculum` 和 `CurriculumCourse`。前端不得传 `student_id`。

**请求参数**

| 位置 | 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| query | `include_courses` | boolean | 否 | 是否返回培养方案课程明细，默认 `true` |
| query | `course_type` | string | 否 | 过滤课程类型：`required`、`elective`、`general` |

**请求示例**

```bash
curl -X GET "https://stss.example.com/api/v1/course-selection/curriculum/me?include_courses=true" \
  -H "Authorization: Bearer <access_token>"
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "curriculum": {
      "id": "7a3b2b6e-6a68-4e38-8f2c-f0c8c6f7a001",
      "name": "计算机科学与技术 2024 级培养方案",
      "year": 2024,
      "major": {
        "id": "d62f6b62-cfa4-49e9-b52a-7bc7e23a1001",
        "name": "计算机科学与技术",
        "code": "CS"
      },
      "total_credits": 160.0,
      "required_credits": 92.0,
      "elective_credits": 36.0
    },
    "course_groups": [
      {
        "course_type": "required",
        "course_type_name": "专业必修课",
        "courses": [
          {
            "course_id": "4bdbb890-1a21-4707-98d8-2a7746e80001",
            "course_code": "CS101",
            "course_name": "程序设计基础",
            "credits": 4.0,
            "semester_suggestion": 1,
            "status": "active"
          }
        ]
      }
    ],
    "confirmation": {
      "required_before_selection": true,
      "confirmed": false,
      "message": "请先查看并确认培养方案后再进入正式选课流程"
    }
  }
}
```

**校验与说明**

- 若当前学生无法匹配培养方案，返回 `422`，并阻止自动生成可选课程列表。
- 培养方案、课程分类和课程代码只读取主数据，不由 C 模块复制或新建。
- TODO-C-01（`FR-C-04`）：当前数据库设计未提供培养方案确认记录字段或表。后续需确认“确认”是否仅作为前端流程状态，或通过已有用户配置能力承载；不得在 C 模块擅自新增业务表。

### 3.2 查看本人培养方案进度

```plaintext
GET /api/v1/course-selection/curriculum/me/progress
Authorization: Bearer <access_token>
```

**权限说明**

仅 `student` 可访问。后端只统计当前登录学生的 `Enrollment`，不得接收或透传其他学生 ID。

**请求参数**

| 位置 | 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| query | `semester_id` | string | 否 | 限定统计到某一学期；不传则统计当前所有有效选课 |
| query | `include_dropped` | boolean | 否 | 是否包含退选记录，默认 `false` |

**请求示例**

```bash
curl -X GET "https://stss.example.com/api/v1/course-selection/curriculum/me/progress?semester_id=2b5741c4-40c4-4c7f-990e-cc880a9f0001" \
  -H "Authorization: Bearer <access_token>"
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "curriculum_id": "7a3b2b6e-6a68-4e38-8f2c-f0c8c6f7a001",
    "requirements": {
      "total_credits": 160.0,
      "required_credits": 92.0,
      "elective_credits": 36.0,
      "general_credits": null
    },
    "selected": {
      "total_credits": 18.0,
      "required_credits": 10.0,
      "elective_credits": 4.0,
      "general_credits": 4.0
    },
    "remaining": {
      "total_credits": 142.0,
      "required_credits": 82.0,
      "elective_credits": 32.0
    },
    "by_course_type": [
      {
        "course_type": "required",
        "selected_credits": 10.0,
        "requirement_credits": 92.0,
        "course_count": 3
      }
    ],
    "warnings": [
      {
        "code": "GENERAL_REQUIREMENT_NOT_MODELED",
        "message": "数据库设计暂未提供公共课最低学分字段，仅返回已选公共课学分"
      }
    ]
  }
}
```

**校验与说明**

- 仅统计 `status = enrolled` 的有效选课；`include_dropped=true` 仅用于展示历史，不计入进度。
- 进度按 `Course.course_type` 或 `CurriculumCourse.course_type` 聚合，字段冲突时以培养方案课程关系为准。
- TODO-C-02（`FR-C-05`）：公共课最低学分要求在数据库设计中暂无独立字段，后续需与数据库负责人确认是否由 `Curriculum.elective_credits` 拆分、由课程分类派生，或修改数据库设计。

### 3.3 搜索课程目录

```plaintext
GET /api/v1/course-selection/courses
Authorization: Bearer <access_token>
```

**权限说明**

`student` 可访问；`teacher`、`academic_admin` 如需复用课程检索也可只读访问。该接口只读取 `Course` 主数据和必要的开设摘要，不执行选课可行性判断。

**请求参数**

| 位置 | 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| query | `keyword` | string | 否 | 按课程代码或课程名称模糊搜索 |
| query | `teacher` | string | 否 | 按教师姓名或工号搜索相关课程开设 |
| query | `course_type` | string | 否 | `required`、`elective`、`general` |
| query | `status` | string | 否 | `active`、`archived`，默认 `active` |
| query | `page` | number | 否 | 默认 1 |
| query | `page_size` | number | 否 | 默认 20，最大 100 |

**请求示例**

```bash
curl -X GET "https://stss.example.com/api/v1/course-selection/courses?keyword=程序设计&course_type=required&page=1&page_size=20" \
  -H "Authorization: Bearer <access_token>"
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "course_id": "4bdbb890-1a21-4707-98d8-2a7746e80001",
        "course_code": "CS101",
        "course_name": "程序设计基础",
        "credits": 4.0,
        "course_type": "required",
        "category": "专业基础",
        "assessment_method": "闭卷考试 + 平时作业",
        "status": "active",
        "offering_summary": {
          "open_count": 2,
          "planned_count": 0,
          "latest_semester_name": "2025-2026-1"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

**校验与说明**

- `keyword` 与 `teacher` 可同时使用，表示交集过滤。
- 返回课程目录，不保证该学生可选；学生可选性以 `/offerings/available` 和选课提交校验为准。
- TODO-C-03（`FR-C-08` 至 `FR-C-12`）：后续实现需确认课程名称、教师姓名模糊查询的索引策略，避免大表扫描。

### 3.4 查询课程开设列表

```plaintext
GET /api/v1/course-selection/offerings
Authorization: Bearer <access_token>
```

**权限说明**

`student`、`teacher`、`academic_admin` 可只读访问。学生访问时仍不传 `student_id`；该接口返回开设信息，不代表可直接选课。

**请求参数**

| 位置 | 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| query | `semester_id` | string | 否 | 学期 ID |
| query | `keyword` | string | 否 | 课程代码或名称 |
| query | `teacher` | string | 否 | 教师姓名或工号 |
| query | `course_type` | string | 否 | 课程类型 |
| query | `offering_status` | string | 否 | `planned`、`open`、`closed`、`cancelled` |
| query | `available_only` | boolean | 否 | 是否只返回容量未满且开设中的课程；不做学生个性化校验 |
| query | `page` | number | 否 | 默认 1 |
| query | `page_size` | number | 否 | 默认 20，最大 100 |

**请求示例**

```bash
curl -X GET "https://stss.example.com/api/v1/course-selection/offerings?semester_id=2b5741c4-40c4-4c7f-990e-cc880a9f0001&offering_status=open&page=1&page_size=20" \
  -H "Authorization: Bearer <access_token>"
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "course_offering_id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
        "course": {
          "id": "4bdbb890-1a21-4707-98d8-2a7746e80001",
          "code": "CS101",
          "name": "程序设计基础",
          "credits": 4.0,
          "course_type": "required"
        },
        "semester": {
          "id": "2b5741c4-40c4-4c7f-990e-cc880a9f0001",
          "name": "2025-2026-1"
        },
        "teacher": {
          "id": "9d4ccf53-7856-4d30-aafb-f4b265550001",
          "real_name": "王老师",
          "teacher_number": "T2024001"
        },
        "capacity": 80,
        "enrolled_count": 56,
        "remaining_capacity": 24,
        "status": "open",
        "schedules": [
          {
            "day_of_week": 1,
            "start_week": 1,
            "end_week": 16,
            "start_period": 1,
            "end_period": 2,
            "classroom": {
              "building": "第一教学楼",
              "room_number": "101",
              "campus": "主校区"
            }
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

**校验与说明**

- `available_only=true` 仅做通用过滤：`CourseOffering.status = open` 且 `enrolled_count < capacity`。
- 学生个性化的培养方案、冲突、先修、已选状态请使用 `/offerings/available`。
- TODO-C-04（`FR-C-12`、`NFR-C-13`）：后续实现需统一课程搜索页与可选课程页的筛选字段，减少前后端重复适配。

### 3.5 查询本人可选课程

```plaintext
GET /api/v1/course-selection/offerings/available
Authorization: Bearer <access_token>
```

**权限说明**

仅 `student` 可访问。后端根据当前登录学生的培养方案、已选课程、当前选课阶段和排课结果计算可选性，不接受前端传入 `student_id`。

**请求参数**

| 位置 | 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| query | `semester_id` | string | 否 | 学期 ID；不传默认当前学期 |
| query | `course_type` | string | 否 | 课程类型 |
| query | `keyword` | string | 否 | 课程代码或名称 |
| query | `include_unavailable` | boolean | 否 | 是否同时返回不可选课程及原因，默认 `true` |
| query | `page` | number | 否 | 默认 1 |
| query | `page_size` | number | 否 | 默认 20，最大 100 |

**请求示例**

```bash
curl -X GET "https://stss.example.com/api/v1/course-selection/offerings/available?semester_id=2b5741c4-40c4-4c7f-990e-cc880a9f0001&include_unavailable=true" \
  -H "Authorization: Bearer <access_token>"
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "selection_period": {
      "id": "5fd9ab57-93db-4c1d-b9f2-86f208e70001",
      "phase": "first_round",
      "start_time": "2026-05-13T08:00:00+08:00",
      "end_time": "2026-05-20T18:00:00+08:00",
      "max_credits": 28.0,
      "is_active": true
    },
    "items": [
      {
        "course_offering_id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
        "course_code": "CS101",
        "course_name": "程序设计基础",
        "credits": 4.0,
        "course_type": "required",
        "teacher_name": "王老师",
        "capacity": 80,
        "enrolled_count": 56,
        "remaining_capacity": 24,
        "status": "open",
        "eligibility": {
          "is_available": true,
          "is_enrolled": false,
          "is_full": false,
          "has_time_conflict": false,
          "prerequisite_satisfied": true,
          "within_curriculum": true,
          "reasons": []
        }
      },
      {
        "course_offering_id": "7851ac21-1f39-471a-9c24-f7261f200001",
        "course_code": "CS302",
        "course_name": "编译原理",
        "credits": 3.0,
        "course_type": "required",
        "teacher_name": "李老师",
        "capacity": 60,
        "enrolled_count": 60,
        "remaining_capacity": 0,
        "status": "open",
        "eligibility": {
          "is_available": false,
          "is_enrolled": false,
          "is_full": true,
          "has_time_conflict": false,
          "prerequisite_satisfied": false,
          "within_curriculum": true,
          "reasons": ["课程容量已满", "未满足先修课程：数据结构"]
        }
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 2,
      "total_pages": 1
    }
  }
}
```

**校验与说明**

- 无匹配培养方案时返回 `422`，不生成可选课程列表。
- 可选性解释必须覆盖容量、已选、冲突、先修、培养方案适配、当前阶段等原因。
- TODO-C-05（`FR-C-19`）：先修课程是否满足需要依赖 F 子系统成绩或通过情况；F 接口未完成前可返回风险提示，正式阻止策略需与 `FR-C-19` 对齐。
- TODO-C-06（`FR-C-35`、`FR-C-36`）：该接口属于选课核心流程，后续应接入 Redis 准入控制、心跳或无操作释放机制；不得新增数据库业务表。

### 3.6 查看课程开设详情

```plaintext
GET /api/v1/course-selection/offerings/:id
Authorization: Bearer <access_token>
```

**权限说明**

`student`、`teacher`、`academic_admin` 可访问。学生访问时可返回本人可选性；教师和教务访问时只返回通用详情或管理视角数据。

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `id` | string | 是 | `CourseOffering.id` |

**请求参数**

| 位置 | 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| query | `include_eligibility` | boolean | 否 | 学生是否返回本人可选性，默认 `true` |

**请求示例**

```bash
curl -X GET "https://stss.example.com/api/v1/course-selection/offerings/8bb51f34-82a7-4e30-b89a-6326909d0001?include_eligibility=true" \
  -H "Authorization: Bearer <access_token>"
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "course_offering_id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
    "course": {
      "id": "4bdbb890-1a21-4707-98d8-2a7746e80001",
      "code": "CS101",
      "name": "程序设计基础",
      "credits": 4.0,
      "course_type": "required",
      "category": "专业基础",
      "description": "介绍程序设计基础概念、控制结构和基础算法。",
      "assessment_method": "闭卷考试 + 平时作业",
      "status": "active"
    },
    "semester": {
      "id": "2b5741c4-40c4-4c7f-990e-cc880a9f0001",
      "name": "2025-2026-1"
    },
    "teacher": {
      "id": "9d4ccf53-7856-4d30-aafb-f4b265550001",
      "real_name": "王老师",
      "teacher_number": "T2024001",
      "title": "副教授"
    },
    "capacity": 80,
    "enrolled_count": 56,
    "remaining_capacity": 24,
    "status": "open",
    "prerequisites": [
      {
        "course_id": "b8469842-89d4-467b-995a-3a6d61f50001",
        "course_code": "MATH101",
        "course_name": "高等数学 A"
      }
    ],
    "schedules": [
      {
        "id": "8bb2e6a4-c61b-4bc3-8b8c-41f598080001",
        "day_of_week": 1,
        "start_week": 1,
        "end_week": 16,
        "start_period": 1,
        "end_period": 2,
        "classroom": {
          "building": "第一教学楼",
          "room_number": "101",
          "campus": "主校区"
        },
        "notes": null
      }
    ],
    "eligibility": {
      "is_available": true,
      "reasons": []
    }
  }
}
```

**校验与说明**

- 不存在的课程开设返回 `404`。
- 课程已归档或课程开设关闭时仍可查看详情，但 `eligibility.is_available` 必须为 `false`。
- TODO-C-07（`FR-C-11`）：课程详情页应与 B 子系统排课结果保持一致，排课数据缺失时返回空 `schedules` 并给出前端可展示提示。

### 3.7 查看本人选课记录

```plaintext
GET /api/v1/course-selection/enrollments/me
Authorization: Bearer <access_token>
```

**权限说明**

仅 `student` 可访问。只返回当前登录学生的 `Enrollment`，不得根据前端参数查询其他学生。

**请求参数**

| 位置 | 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| query | `semester_id` | string | 否 | 学期 ID |
| query | `status` | string | 否 | `enrolled`、`dropped`、`withdrawn` |
| query | `keyword` | string | 否 | 课程代码或名称 |
| query | `page` | number | 否 | 默认 1 |
| query | `page_size` | number | 否 | 默认 20，最大 100 |

**请求示例**

```bash
curl -X GET "https://stss.example.com/api/v1/course-selection/enrollments/me?status=enrolled&page=1&page_size=20" \
  -H "Authorization: Bearer <access_token>"
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "enrollment_id": "c9e15b80-9277-4f63-8f3b-8017be620001",
        "status": "enrolled",
        "enrolled_at": "2026-05-13T09:10:30+08:00",
        "dropped_at": null,
        "course_offering": {
          "id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
          "course_code": "CS101",
          "course_name": "程序设计基础",
          "credits": 4.0,
          "course_type": "required",
          "teacher_name": "王老师",
          "semester_name": "2025-2026-1"
        }
      }
    ],
    "summary": {
      "enrolled_count": 1,
      "enrolled_credits": 4.0
    },
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

**校验与说明**

- 默认只查询当前学期或全部学期由实现配置决定，但必须在响应中清楚返回 `semester_name`。
- 退选记录保留可查，便于追踪选课历史。
- TODO-C-08（`FR-C-29`）：前端筛选条件需与本接口的 `semester_id`、`keyword`、`status` 对齐。

### 3.8 提交选课

```plaintext
POST /api/v1/course-selection/enrollments
Authorization: Bearer <access_token>
Content-Type: application/json
```

**权限说明**

仅 `student` 可访问。选课学生必须来自当前登录用户，不允许请求体传 `student_id`。

**请求 Body**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `course_offering_id` | string | 是 | 目标 `CourseOffering.id` |
| `client_request_id` | string | 否 | 前端幂等请求 ID，用于避免重复点击造成重复提交 |

**请求示例**

```bash
curl -X POST "https://stss.example.com/api/v1/course-selection/enrollments" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "course_offering_id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
    "client_request_id": "select-20260513-0001"
  }'
```

**响应示例**

```json
{
  "code": 201,
  "message": "选课成功",
  "data": {
    "enrollment": {
      "id": "c9e15b80-9277-4f63-8f3b-8017be620001",
      "status": "enrolled",
      "enrolled_at": "2026-05-13T09:10:30+08:00",
      "dropped_at": null
    },
    "course_offering": {
      "id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
      "course_code": "CS101",
      "course_name": "程序设计基础",
      "capacity": 80,
      "enrolled_count": 57,
      "remaining_capacity": 23
    },
    "credit_summary": {
      "current_selected_credits": 22.0,
      "max_credits": 28.0
    }
  }
}
```

**失败响应示例**

```json
{
  "code": 42203,
  "message": "选课失败：存在课表冲突",
  "errors": [
    {
      "field": "course_offering_id",
      "message": "与已选课程 数据结构 在第 1-16 周、星期一、第 1-2 节冲突"
    }
  ]
}
```

**事务、校验与说明**

- 必须在一个事务中完成：锁定或条件更新 `CourseOffering`、检查有效 `Enrollment`、创建或恢复选课记录、更新 `enrolled_count`。
- 必须校验当前存在启用且服务端时间位于起止范围内的 `SelectionPeriod`。
- 必须校验 `CourseOffering.status = open`、`Course.status = active`、容量未满、未重复选课、未超过 `max_credits`、课表不冲突、符合培养方案和先修要求。
- 若已有同一学生同一课程开设的 `dropped` 记录，可更新为 `enrolled` 并刷新 `enrolled_at`；不得创建多个有效 `enrolled` 记录。
- TODO-C-09（`FR-C-16`、`FR-C-18`、`FR-C-22`、`NFR-C-05`）：后续实现需明确 PostgreSQL 行锁或条件更新方案，并补充并发测试。
- TODO-C-10（`FR-C-19`）：先修课校验需与 F 子系统确定“已通过课程”的读取方式。
- TODO-C-11（`FR-C-35`、`FR-C-36`）：选课提交必须纳入选课准入控制和无操作释放机制。

### 3.9 退选课程

```plaintext
PATCH /api/v1/course-selection/enrollments/:id/drop
Authorization: Bearer <access_token>
Content-Type: application/json
```

**权限说明**

仅 `student` 可访问。只能退选当前登录学生本人的 `Enrollment`。

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `id` | string | 是 | `Enrollment.id` |

**请求 Body**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `reason` | string | 否 | 退选原因，前端可选填 |
| `client_request_id` | string | 否 | 前端幂等请求 ID |

**请求示例**

```bash
curl -X PATCH "https://stss.example.com/api/v1/course-selection/enrollments/c9e15b80-9277-4f63-8f3b-8017be620001/drop" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "课表调整",
    "client_request_id": "drop-20260513-0001"
  }'
```

**响应示例**

```json
{
  "code": 200,
  "message": "退选成功",
  "data": {
    "enrollment": {
      "id": "c9e15b80-9277-4f63-8f3b-8017be620001",
      "status": "dropped",
      "enrolled_at": "2026-05-13T09:10:30+08:00",
      "dropped_at": "2026-05-13T10:02:18+08:00"
    },
    "course_offering": {
      "id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
      "course_code": "CS101",
      "course_name": "程序设计基础",
      "capacity": 80,
      "enrolled_count": 56,
      "remaining_capacity": 24
    }
  }
}
```

**事务、校验与说明**

- 必须校验当前选课阶段允许退选，且以服务端时间判断。
- 必须校验 `Enrollment.student_id` 属于当前登录学生，且当前状态为 `enrolled`。
- 退选只更新状态为 `dropped` 并写入 `dropped_at`，不得删除记录。
- 退选事务内同步减少 `CourseOffering.enrolled_count`，并保证计数不小于 0。
- TODO-C-12（`FR-C-14`、`FR-C-32`）：不同阶段是否允许退选的具体阶段规则需由教务确认，默认 `second_round` 和 `adjustment` 可退选，`first_round` 是否允许由配置决定。

### 3.10 查看本人课表

```plaintext
GET /api/v1/course-selection/timetable/me
Authorization: Bearer <access_token>
```

**权限说明**

仅 `student` 可访问。只返回当前登录学生有效选课对应的课表。

**请求参数**

| 位置 | 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| query | `semester_id` | string | 否 | 学期 ID；不传默认当前学期 |
| query | `format` | string | 否 | `grid` 或 `list`，默认 `grid` |

**请求示例**

```bash
curl -X GET "https://stss.example.com/api/v1/course-selection/timetable/me?semester_id=2b5741c4-40c4-4c7f-990e-cc880a9f0001&format=grid" \
  -H "Authorization: Bearer <access_token>"
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "semester": {
      "id": "2b5741c4-40c4-4c7f-990e-cc880a9f0001",
      "name": "2025-2026-1"
    },
    "printable": true,
    "items": [
      {
        "enrollment_id": "c9e15b80-9277-4f63-8f3b-8017be620001",
        "course_offering_id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
        "course_code": "CS101",
        "course_name": "程序设计基础",
        "teacher_name": "王老师",
        "credits": 4.0,
        "day_of_week": 1,
        "start_week": 1,
        "end_week": 16,
        "start_period": 1,
        "end_period": 2,
        "classroom": "主校区 第一教学楼 101"
      }
    ],
    "missing_schedule_items": [
      {
        "course_offering_id": "98a26b9a-5378-4f2f-9f32-842c23fe0001",
        "course_name": "形势与政策",
        "message": "该课程暂无排课信息"
      }
    ]
  }
}
```

**校验与说明**

- 只展示 `Enrollment.status = enrolled` 的课程。
- 课程暂无排课时仍应展示选课结果，并在 `missing_schedule_items` 中提示。
- TODO-C-13（`FR-C-25`）：打印样式由前端实现，本接口只提供稳定的可打印课表数据。

### 3.11 AI 推荐课程

```plaintext
POST /api/v1/course-selection/ai-advisor/recommend
Authorization: Bearer <access_token>
Content-Type: application/json
```

**权限说明**

仅 `student` 可访问。AI 输入由后端根据当前学生的培养方案、已选课程、可选课程、容量和课表组装；前端不得传 `student_id`，AI 不具备写入权限。

**请求 Body**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `semester_id` | string | 否 | 学期 ID；不传默认当前学期 |
| `preferences` | object | 否 | 学生偏好，如课程类型、时间偏好、学分目标 |
| `max_recommendations` | number | 否 | 推荐数量，默认 5，最大 10 |

**请求示例**

```bash
curl -X POST "https://stss.example.com/api/v1/course-selection/ai-advisor/recommend" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "semester_id": "2b5741c4-40c4-4c7f-990e-cc880a9f0001",
    "preferences": {
      "target_credits": 22,
      "preferred_course_types": ["required", "elective"],
      "avoid_early_morning": true
    },
    "max_recommendations": 5
  }'
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "disclaimer": "AI 建议仅供参考，最终选课必须通过系统选课入口并接受容量、冲突、阶段和培养方案校验。",
    "credit_progress_summary": {
      "current_selected_credits": 18.0,
      "target_credits": 22.0,
      "max_credits": 28.0
    },
    "recommendations": [
      {
        "course_offering_id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
        "course_code": "CS101",
        "course_name": "程序设计基础",
        "credits": 4.0,
        "teacher_name": "王老师",
        "recommendation_score": 0.91,
        "reasons": [
          "属于当前培养方案专业必修课",
          "补足本阶段目标学分",
          "与已选课程无时间冲突"
        ],
        "risks": [],
        "eligibility_snapshot": {
          "is_available": true,
          "remaining_capacity": 24,
          "has_time_conflict": false,
          "prerequisite_satisfied": true
        }
      }
    ],
    "conflict_notes": [
      {
        "course_offering_id": "7851ac21-1f39-471a-9c24-f7261f200001",
        "course_name": "编译原理",
        "message": "该课程容量已满，暂不推荐"
      }
    ]
  }
}
```

**校验与说明**

- AI 结果不得写入 `Enrollment`，学生必须再调用 `POST /enrollments` 主动提交。
- AI 推荐必须使用后端计算的可选性快照，不能让模型自行决定硬性规则是否通过。
- AI 服务超时或不可用时返回可解释错误，普通课程搜索、查看和选课功能不受影响。
- TODO-C-14（`FR-C-38` 至 `FR-C-43`）：后续需确定 AI 服务提供方、超时时间、脱敏策略和提示词版本管理。

### 3.12 AI 解释课程

```plaintext
POST /api/v1/course-selection/ai-advisor/explain
Authorization: Bearer <access_token>
Content-Type: application/json
```

**权限说明**

仅 `student` 可访问。解释基于当前学生上下文生成，不接收 `student_id`，不写入选课记录。

**请求 Body**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `course_offering_id` | string | 是 | 要解释的课程开设 ID |
| `question` | string | 否 | 学生补充问题 |

**请求示例**

```bash
curl -X POST "https://stss.example.com/api/v1/course-selection/ai-advisor/explain" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "course_offering_id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
    "question": "这门课为什么适合我本学期选择？"
  }'
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "course_offering_id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
    "course_name": "程序设计基础",
    "explanation": "这门课属于你的培养方案专业必修课，当前容量仍有剩余，并且与已选课程没有时间冲突。选择后你的本学期已选学分将从 18.0 增加到 22.0，仍低于当前阶段 28.0 学分上限。",
    "hard_rule_result": {
      "is_selectable_now": true,
      "reasons": []
    },
    "disclaimer": "该解释仅辅助理解，最终是否选课以提交选课时的服务端校验结果为准。"
  }
}
```

**校验与说明**

- `hard_rule_result` 由后端规则引擎生成，AI 只负责自然语言解释。
- 若课程不可选，必须明确说明容量、冲突、先修或阶段等具体原因。
- TODO-C-15（`FR-C-41`、`NFR-C-09`）：后续需为 AI 输出增加安全审查和兜底模板，避免输出与硬性规则结果矛盾。

---

## 四、教师端接口

### 4.1 查看课程学生名单

```plaintext
GET /api/v1/course-selection/teacher/offerings/:id/roster
Authorization: Bearer <access_token>
```

**权限说明**

仅 `teacher` 可访问。当前教师必须是目标 `CourseOffering.teacher_id` 对应教师；非任课教师返回 `403`。

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `id` | string | 是 | `CourseOffering.id` |

**请求参数**

| 位置 | 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| query | `status` | string | 否 | `enrolled`、`dropped`、`withdrawn`，默认 `enrolled` |
| query | `keyword` | string | 否 | 学号、姓名、专业或班级 |
| query | `page` | number | 否 | 默认 1 |
| query | `page_size` | number | 否 | 默认 50，最大 100 |

**请求示例**

```bash
curl -X GET "https://stss.example.com/api/v1/course-selection/teacher/offerings/8bb51f34-82a7-4e30-b89a-6326909d0001/roster?status=enrolled&page=1&page_size=50" \
  -H "Authorization: Bearer <access_token>"
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "course_offering": {
      "id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
      "course_code": "CS101",
      "course_name": "程序设计基础",
      "semester_name": "2025-2026-1",
      "capacity": 80,
      "enrolled_count": 56
    },
    "items": [
      {
        "enrollment_id": "c9e15b80-9277-4f63-8f3b-8017be620001",
        "student": {
          "user_id": "df6c0d35-0d7f-4b4f-b338-78065bb10001",
          "student_number": "2024001001",
          "real_name": "张三",
          "major_name": "计算机科学与技术",
          "class_name": "计科 2401"
        },
        "status": "enrolled",
        "enrolled_at": "2026-05-13T09:10:30+08:00",
        "dropped_at": null
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 50,
      "total": 56,
      "total_pages": 2
    }
  }
}
```

**校验与说明**

- 名单默认只返回有效选课记录，导出时也应保持一致。
- 教师不可查看非本人授课课程的名单。
- TODO-C-16（`FR-C-27`、`NFR-C-06`）：若未来支持多教师共同授课，需要数据库设计明确助教或联合授课关系；当前仅按 `CourseOffering.teacher_id` 校验。

### 4.2 导出课程学生名单

```plaintext
GET /api/v1/course-selection/teacher/offerings/:id/roster/export
Authorization: Bearer <access_token>
```

**权限说明**

仅 `teacher` 可访问。当前教师必须是目标课程开设的任课教师。

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `id` | string | 是 | `CourseOffering.id` |

**请求参数**

| 位置 | 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| query | `status` | string | 否 | 默认 `enrolled` |
| query | `format` | string | 否 | 默认 `xlsx`，当前只规划 Excel |

**请求示例**

```bash
curl -X GET "https://stss.example.com/api/v1/course-selection/teacher/offerings/8bb51f34-82a7-4e30-b89a-6326909d0001/roster/export?status=enrolled&format=xlsx" \
  -H "Authorization: Bearer <access_token>" \
  -o roster.xlsx
```

**成功响应示例**

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="CS101-2025-2026-1-roster.xlsx"
```

**错误响应示例**

```json
{
  "code": 40301,
  "message": "无权导出该课程学生名单",
  "errors": [
    {
      "field": "id",
      "message": "当前教师不是该课程开设的任课教师"
    }
  ]
}
```

**校验与说明**

- Excel 内容至少包含学号、姓名、专业、班级、选课状态、选课时间。
- 导出数据必须与名单查询接口在相同筛选条件下保持一致。
- TODO-C-17（`FR-C-28`）：后续实现需确定 Excel 生成库、文件名编码和大名单导出性能策略。

---

## 五、教务管理端接口

### 5.1 查询选课时间段

```plaintext
GET /api/v1/course-selection/admin/periods
Authorization: Bearer <access_token>
```

**权限说明**

仅 `academic_admin` 可访问。系统管理员如需查看应通过授权角色获得教务管理权限。

**请求参数**

| 位置 | 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| query | `semester_id` | string | 否 | 学期 ID |
| query | `phase` | string | 否 | `first_round`、`second_round`、`adjustment` |
| query | `is_active` | boolean | 否 | 是否启用 |
| query | `page` | number | 否 | 默认 1 |
| query | `page_size` | number | 否 | 默认 20，最大 100 |

**请求示例**

```bash
curl -X GET "https://stss.example.com/api/v1/course-selection/admin/periods?semester_id=2b5741c4-40c4-4c7f-990e-cc880a9f0001" \
  -H "Authorization: Bearer <access_token>"
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "5fd9ab57-93db-4c1d-b9f2-86f208e70001",
        "semester": {
          "id": "2b5741c4-40c4-4c7f-990e-cc880a9f0001",
          "name": "2025-2026-1"
        },
        "phase": "first_round",
        "start_time": "2026-05-13T08:00:00+08:00",
        "end_time": "2026-05-20T18:00:00+08:00",
        "max_credits": 28.0,
        "is_active": true,
        "server_status": "open"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

**校验与说明**

- `server_status` 可由服务端当前时间计算：`not_started`、`open`、`ended`。
- 该接口只读，不写 `SystemLog`。
- TODO-C-18（`FR-C-30` 至 `FR-C-32`）：后续需明确同一学期多个启用阶段是否允许时间相邻但不重叠。

### 5.2 创建选课时间段

```plaintext
POST /api/v1/course-selection/admin/periods
Authorization: Bearer <access_token>
Content-Type: application/json
```

**权限说明**

仅 `academic_admin` 可访问。创建成功后应写入 `SystemLog`，记录操作人、资源类型、资源 ID 和关键字段。

**请求 Body**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `semester_id` | string | 是 | 学期 ID |
| `phase` | string | 是 | `first_round`、`second_round`、`adjustment` |
| `start_time` | string | 是 | ISO 8601 |
| `end_time` | string | 是 | ISO 8601，必须晚于开始时间 |
| `max_credits` | number | 否 | 当前阶段最大选课学分 |
| `is_active` | boolean | 是 | 是否启用 |

**请求示例**

```bash
curl -X POST "https://stss.example.com/api/v1/course-selection/admin/periods" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "semester_id": "2b5741c4-40c4-4c7f-990e-cc880a9f0001",
    "phase": "first_round",
    "start_time": "2026-05-13T08:00:00+08:00",
    "end_time": "2026-05-20T18:00:00+08:00",
    "max_credits": 28.0,
    "is_active": true
  }'
```

**响应示例**

```json
{
  "code": 201,
  "message": "创建成功",
  "data": {
    "id": "5fd9ab57-93db-4c1d-b9f2-86f208e70001",
    "semester_id": "2b5741c4-40c4-4c7f-990e-cc880a9f0001",
    "phase": "first_round",
    "start_time": "2026-05-13T08:00:00+08:00",
    "end_time": "2026-05-20T18:00:00+08:00",
    "max_credits": 28.0,
    "is_active": true
  }
}
```

**事务、校验与说明**

- 校验 `semester_id` 存在。
- 校验 `phase` 属于允许枚举。
- 校验 `start_time < end_time`，且时间判断以服务端时区解析。
- 同一学期、同一阶段不应存在多个启用且时间重叠的时间段。
- 创建与日志记录应在事务中完成。
- TODO-C-19（`FR-C-30`、`FR-C-31`、`FR-C-37`）：后续需统一 `SystemLog.action` 命名，例如 `selection_period:create`。

### 5.3 修改选课时间段

```plaintext
PATCH /api/v1/course-selection/admin/periods/:id
Authorization: Bearer <access_token>
Content-Type: application/json
```

**权限说明**

仅 `academic_admin` 可访问。修改成功后应写入 `SystemLog`，记录变更前后关键字段。

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `id` | string | 是 | `SelectionPeriod.id` |

**请求 Body**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `phase` | string | 否 | 选课阶段 |
| `start_time` | string | 否 | ISO 8601 |
| `end_time` | string | 否 | ISO 8601 |
| `max_credits` | number | 否 | 最大选课学分 |
| `is_active` | boolean | 否 | 是否启用 |

**请求示例**

```bash
curl -X PATCH "https://stss.example.com/api/v1/course-selection/admin/periods/5fd9ab57-93db-4c1d-b9f2-86f208e70001" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "end_time": "2026-05-21T18:00:00+08:00",
    "max_credits": 30.0,
    "is_active": true
  }'
```

**响应示例**

```json
{
  "code": 200,
  "message": "修改成功",
  "data": {
    "id": "5fd9ab57-93db-4c1d-b9f2-86f208e70001",
    "semester_id": "2b5741c4-40c4-4c7f-990e-cc880a9f0001",
    "phase": "first_round",
    "start_time": "2026-05-13T08:00:00+08:00",
    "end_time": "2026-05-21T18:00:00+08:00",
    "max_credits": 30.0,
    "is_active": true
  }
}
```

**事务、校验与说明**

- 不存在的时间段返回 `404`。
- 修改后仍需满足时间合法、阶段合法、启用时间段不重叠等规则。
- 修改正在开放的时间段会影响学生后续选课和退选请求，应写入审计日志。
- TODO-C-20（`FR-C-32`、`FR-C-37`）：后续需定义“正在开放阶段被停用”时前端提示和在途请求处理策略。

### 5.4 教务手动加课

```plaintext
POST /api/v1/course-selection/admin/enrollments
Authorization: Bearer <access_token>
Content-Type: application/json
```

**权限说明**

仅 `academic_admin` 可访问。该接口允许教务为指定学生处理特殊加课，但仍必须执行容量、重复选课、课表冲突等硬性校验，不得绕过后端校验。

**请求 Body**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `student_id` | string | 是 | `Student.user_id`，即 `Enrollment.student_id`，仅教务端允许传入 |
| `course_offering_id` | string | 是 | 目标课程开设 ID |
| `reason` | string | 是 | 手动加课原因，用于审计 |
| `notify_student` | boolean | 否 | 是否通知学生，默认 `false` |

**请求示例**

```bash
curl -X POST "https://stss.example.com/api/v1/course-selection/admin/enrollments" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "df6c0d35-0d7f-4b4f-b338-78065bb10001",
    "course_offering_id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
    "reason": "学生转专业后需补修培养方案必修课",
    "notify_student": true
  }'
```

**响应示例**

```json
{
  "code": 201,
  "message": "手动加课成功",
  "data": {
    "enrollment": {
      "id": "3c2f3ba7-ef61-4384-bf9e-31f7ae3c0001",
      "student_id": "df6c0d35-0d7f-4b4f-b338-78065bb10001",
      "course_offering_id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
      "status": "enrolled",
      "enrolled_at": "2026-05-13T11:30:00+08:00"
    },
    "course_offering": {
      "id": "8bb51f34-82a7-4e30-b89a-6326909d0001",
      "capacity": 80,
      "enrolled_count": 57,
      "remaining_capacity": 23
    },
    "audit": {
      "logged": true,
      "action": "enrollment:manual_create"
    }
  }
}
```

**失败响应示例**

```json
{
  "code": 42204,
  "message": "手动加课失败：课程容量已满",
  "errors": [
    {
      "field": "course_offering_id",
      "message": "当前课程开设已达到容量上限，请先调整容量或处理退选后再加课"
    }
  ]
}
```

**事务、校验与说明**

- 必须校验学生存在、课程开设存在、课程未取消、未重复有效选课、容量未满、课表不冲突。
- 手动加课可不要求当前处于学生选课开放时间段，但仍不得绕过容量、冲突和重复校验。
- 创建或恢复 `Enrollment`、更新 `CourseOffering.enrolled_count`、写入 `SystemLog` 必须在事务中完成。
- `reason` 必填，用于满足关键操作可追踪要求。
- TODO-C-21（`FR-C-33`、`FR-C-34`、`FR-C-37`）：后续需明确手动加课是否校验培养方案适配和先修课程；若允许例外，必须走数据库设计和 SRS 变更，不得仅以前端参数绕过。

---

## 六、错误码建议

| 错误码 | HTTP 状态 | 含义 |
| ------ | --------- | ---- |
| `40001` | 400 | 参数校验失败 |
| `40101` | 401 | 未认证或 Token 失效 |
| `40301` | 403 | 当前角色无权访问 |
| `40302` | 403 | 访问非本人资源或非本人授课课程 |
| `40401` | 404 | 资源不存在 |
| `40901` | 409 | 重复有效选课 |
| `42201` | 422 | 课程容量已满 |
| `42202` | 422 | 当前不在有效选课时间段 |
| `42203` | 422 | 课表冲突 |
| `42204` | 422 | 业务约束不满足 |
| `42205` | 422 | 超过当前阶段最大学分 |
| `42206` | 422 | 不满足培养方案或先修课程要求 |
| `42901` | 429 | 选课核心流程达到准入上限，请稍后重试 |
| `50301` | 503 | AI 辅助服务暂不可用 |

---

## 七、TODO 追踪

| TODO | 对应需求 | 后续任务 |
| ---- | -------- | -------- |
| TODO-C-01 | `FR-C-04` | 确认培养方案“确认入口”是否需要持久化；如需持久化，先更新数据库设计，不在 C 模块擅自新增表。 |
| TODO-C-02 | `FR-C-05` | 明确公共课最低学分要求来源，当前数据库只有 `required_credits` 和 `elective_credits`。 |
| TODO-C-03 | `FR-C-08` 至 `FR-C-12` | 设计课程名称、课程代码、教师姓名检索索引和分页策略。 |
| TODO-C-04 | `FR-C-12`、`NFR-C-13` | 统一课程搜索、开设列表和可选课程列表筛选字段。 |
| TODO-C-05 | `FR-C-19` | 与 F 子系统确认先修课程通过情况的数据读取接口，并确定阻止或风险提示策略。 |
| TODO-C-06 | `FR-C-35`、`FR-C-36` | 为选课核心流程接入 Redis 准入控制、心跳和无操作释放机制。 |
| TODO-C-07 | `FR-C-11` | 与 B 子系统确认 `Schedule` 缺失或调整中状态的返回约定。 |
| TODO-C-08 | `FR-C-29` | 对齐前端选课结果筛选项。 |
| TODO-C-09 | `FR-C-16`、`FR-C-18`、`FR-C-22`、`NFR-C-05` | 明确并发选课行锁、条件更新或唯一约束策略，并补充并发测试。 |
| TODO-C-10 | `FR-C-19` | 完成先修课硬性校验实现。 |
| TODO-C-11 | `FR-C-35`、`FR-C-36` | 选课提交接入准入控制和长时间无操作释放机制。 |
| TODO-C-12 | `FR-C-14`、`FR-C-32` | 明确各选课阶段是否允许退选。 |
| TODO-C-13 | `FR-C-25` | 前端实现课表打印，后端保持稳定数据结构。 |
| TODO-C-14 | `FR-C-38` 至 `FR-C-43` | 确认 AI 服务提供方、超时、脱敏、提示词版本和降级策略。 |
| TODO-C-15 | `FR-C-41`、`NFR-C-09` | 增加 AI 输出安全审查和规则结果一致性校验。 |
| TODO-C-16 | `FR-C-27`、`NFR-C-06` | 若支持联合授课或助教，需补充数据库关系和权限规则。 |
| TODO-C-17 | `FR-C-28` | 确认 Excel 导出库、文件名编码和大名单导出方案。 |
| TODO-C-18 | `FR-C-30` 至 `FR-C-32` | 明确同一学期启用阶段的重叠与相邻规则。 |
| TODO-C-19 | `FR-C-30`、`FR-C-31`、`FR-C-37` | 统一 `SystemLog.action` 命名和审计详情结构。 |
| TODO-C-20 | `FR-C-32`、`FR-C-37` | 定义正在开放阶段被停用时的前端提示和在途请求处理策略。 |
| TODO-C-21 | `FR-C-33`、`FR-C-34`、`FR-C-37` | 明确教务手动加课是否允许培养方案或先修例外；例外必须走需求和数据库变更流程。 |

---

## 八、需求覆盖矩阵

| 功能域 | 覆盖接口 | 覆盖需求 |
| ------ | -------- | -------- |
| 培养方案制定 | `GET /curriculum/me`、`GET /curriculum/me/progress` | `FR-C-01` 至 `FR-C-07` |
| 课程搜索与查看 | `GET /courses`、`GET /offerings`、`GET /offerings/:id` | `FR-C-08` 至 `FR-C-12` |
| 可选课程、选课与退选 | `GET /offerings/available`、`POST /enrollments`、`PATCH /enrollments/:id/drop` | `FR-C-13` 至 `FR-C-23` |
| 结果查询与课表 | `GET /enrollments/me`、`GET /timetable/me` | `FR-C-24` 至 `FR-C-26`、`FR-C-29` |
| 教师名单 | `GET /teacher/offerings/:id/roster`、`GET /teacher/offerings/:id/roster/export` | `FR-C-27`、`FR-C-28` |
| 选课管理 | `GET /admin/periods`、`POST /admin/periods`、`PATCH /admin/periods/:id`、`POST /admin/enrollments` | `FR-C-30` 至 `FR-C-37` |
| AI 辅助选课 | `POST /ai-advisor/recommend`、`POST /ai-advisor/explain` | `FR-C-38` 至 `FR-C-43` |
| 非功能约束 | 事务、权限、准入控制、分页、AI 安全边界等跨接口规则 | `NFR-C-01` 至 `NFR-C-14` |
