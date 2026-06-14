---
filename: F-score-management.md
title: STSS F 模块 · 成绩管理接口文档
status: draft
version: 1.0.0
last_updated_at: 2026-06-14
last_updated_by: F6
description: 成绩管理子系统接口、页面、权限与验收链路说明。
---

# STSS F 模块 · 成绩管理接口文档

## 1. 模块范围

F 模块围绕 `Score`、`Enrollment`、`CourseOffering` 完成课程最终成绩管理，覆盖：

- 教师成绩录入、草稿保存、正式提交。
- 教师对已提交成绩发起改分申请。
- 管理员审批或驳回改分申请，并生成审计日志。
- 学生查询本人成绩、GPA、学分进展和个人成绩分析。
- 教师或管理员查看课程成绩统计。

在线测试成绩来源可作为后续扩展，本模块不负责在线考试流程。

## 2. 通用约定

### 2.1 响应格式

成功响应：

```json
{
  "code": 200,
  "message": "Success",
  "data": {}
}
```

分页响应：

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 0,
      "total_pages": 0
    }
  }
}
```

错误响应：

```json
{
  "code": 400,
  "message": "错误信息",
  "errors": {}
}
```

后端统一输出 `snake_case`，前端请求封装会转换为 `camelCase`。

### 2.2 成绩状态

| 状态        | 说明                                              |
| ----------- | ------------------------------------------------- |
| `EMPTY`     | 仅列表 DTO 使用，表示选课记录存在但尚无 `Score`。 |
| `DRAFT`     | 草稿成绩，可通过录入接口反复保存。                |
| `SUBMITTED` | 教师已提交，普通录入接口不可再修改。              |
| `CONFIRMED` | 管理员审批改分后确认。                            |

### 2.3 分数规则

- 分项成绩：`usual_score`、`midterm_score`、`final_score`，范围 `0-100`。
- 总评成绩：后端统一按 `平时 30% + 期中 20% + 期末 50%` 计算。
- GPA、等级、平均分、学分进展以后端计算结果为准。
- 重修或同一课程多次成绩按后端有效成绩规则选取。

## 3. 权限矩阵

| 操作                 | student  | teacher       | admin | super_admin |
| -------------------- | -------- | ------------- | ----- | ----------- |
| 查询本人成绩         | 是       | 否            | 否    | 否          |
| 查询自己任课课程成绩 | 否       | 是            | 是    | 是          |
| 保存草稿             | 否       | 自己任课      | 是    | 是          |
| 提交成绩             | 否       | 自己任课      | 是    | 是          |
| 发起改分申请         | 否       | 自己任课/录入 | 是    | 是          |
| 审批改分申请         | 否       | 否            | 是    | 是          |
| 查看修改日志         | 本人相关 | 任课相关      | 是    | 是          |
| 查看课程成绩分析     | 否       | 自己任课      | 是    | 是          |
| 查看学生成绩统计     | 本人     | 否            | 是    | 是          |

## 4. 教师成绩录入接口

### 4.1 查询成绩录入列表

`GET /api/v1/course-offerings/:courseOfferingId/scores`

Query：

| 参数       | 类型                              | 说明                |
| ---------- | --------------------------------- | ------------------- |
| `page`     | number                            | 默认 1。            |
| `pageSize` | number                            | 默认 20，最大 100。 |
| `keyword`  | string                            | 学号或姓名关键词。  |
| `status`   | `EMPTY/DRAFT/SUBMITTED/CONFIRMED` | 状态筛选。          |

说明：

- 后端以 `Enrollment` 生成名单。
- 没有 `Score` 的学生也返回 `EMPTY` 占位项。
- 教师只能查看自己任课课程。

### 4.2 批量保存草稿

`POST /api/v1/course-offerings/:courseOfferingId/scores/draft`

Body：

```json
{
  "scores": [
    {
      "enrollmentId": "uuid",
      "usualScore": 86,
      "midtermScore": 82,
      "finalScore": 88
    }
  ]
}
```

说明：

- 使用 upsert 语义。
- 仅 `EMPTY` 或 `DRAFT` 可保存。
- `SUBMITTED`、`CONFIRMED` 会跳过。
- 前端显式传 `null` 表示清空该项成绩。

### 4.3 批量提交成绩

`POST /api/v1/course-offerings/:courseOfferingId/scores/submit`

Body：

```json
{
  "scoreIds": ["uuid"]
}
```

说明：

- 仅 `DRAFT` 可提交。
- 提交后状态变为 `SUBMITTED`。
- 后续修改必须走审批流程。

## 5. 改分申请与审批接口

### 5.1 发起改分申请

`POST /api/v1/scores/:scoreId/modification-request`

Body：

```json
{
  "proposedChanges": {
    "usualScore": 90,
    "midtermScore": 86,
    "finalScore": 92
  },
  "reason": "试卷复核后需调整期末成绩"
}
```

说明：

- 仅 `SUBMITTED` 或 `CONFIRMED` 可申请。
- 不直接覆盖成绩，只写入 `Score.modificationRequest`。
- 已存在待审批申请时返回冲突错误。
- 系统会写入 `SystemLog`，记录申请行为。

### 5.2 获取待审批申请列表

`GET /api/v1/scores/modification-requests`

Query：

| 参数               | 类型   | 说明         |
| ------------------ | ------ | ------------ |
| `page`             | number | 默认 1。     |
| `pageSize`         | number | 默认 20。    |
| `courseOfferingId` | uuid   | 按开课筛选。 |
| `teacherId`        | uuid   | 按教师筛选。 |

权限：`admin`、`super_admin`。

### 5.3 审批通过

`POST /api/v1/scores/:scoreId/modification-request/approve`

Body：

```json
{
  "comment": "同意复核结果"
}
```

通过后：

- 更新 `Score` 分项成绩。
- 后端重算总评、绩点、等级。
- 状态更新为 `CONFIRMED`。
- 清空 `modificationRequest`。
- 写入 `ScoreModificationLog`。
- 写入 `SystemLog`。

### 5.4 审批驳回

`POST /api/v1/scores/:scoreId/modification-request/reject`

Body：

```json
{
  "reason": "依据不足，驳回申请"
}
```

驳回后：

- 原成绩不变。
- 清空 `modificationRequest`。
- 写入 `SystemLog`。

### 5.5 查看修改日志

`GET /api/v1/scores/:scoreId/modification-logs`

Query：

| 参数       | 类型   | 说明      |
| ---------- | ------ | --------- |
| `page`     | number | 默认 1。  |
| `pageSize` | number | 默认 20。 |

权限：

- 学生只能看本人相关成绩。
- 教师只能看本人任课或本人录入成绩。
- 管理员可查看全部。

## 6. 学生成绩查询接口

### 6.1 查询本人成绩

`GET /api/v1/students/me/scores`

Query：

| 参数         | 类型   | 说明               |
| ------------ | ------ | ------------------ |
| `page`       | number | 默认 1。           |
| `pageSize`   | number | 默认 20。          |
| `semesterId` | uuid   | 学期筛选。         |
| `keyword`    | string | 课程名或课程代码。 |

说明：

- 仅返回当前登录学生本人数据。
- 仅返回已提交或已确认成绩。
- 返回字段包含课程、学期、学分、分项成绩、总评、绩点、等级、是否有效成绩。

### 6.2 查询本人 GPA 与学分摘要

`GET /api/v1/students/me/score-summary`

返回内容包括：

- GPA
- 平均分
- 已修学分
- 通过学分
- 应修学分
- 必修/选修完成情况
- 已完成课程数
- 未通过课程数

### 6.3 查询某学生成绩摘要

`GET /api/v1/students/:studentId/score-summary`

权限：学生仅本人，管理员可指定学生。

## 7. 成绩分析接口

### 7.1 查询课程成绩分析

`GET /api/v1/course-offerings/:courseOfferingId/score-analytics`

返回内容包括：

- 课程平均分、最高分、最低分。
- 已提交人数、通过人数、未通过人数。
- 分数段分布。
- 课程成绩排名 Top10。

权限：

- 教师只能看自己任课课程。
- 管理员可看全部课程。

### 7.2 查询学生个人分析

`GET /api/v1/students/:studentId/score-analytics`

返回内容包括：

- 学期 GPA / 均分趋势。
- 分数段分布。
- 课程类型学分完成情况。

权限：学生仅本人，管理员可指定学生。

## 8. 前端页面

| 页面           | 路径                | 说明                                 |
| -------------- | ------------------- | ------------------------------------ |
| 教师成绩录入   | `/grade/entry`      | 录入、保存草稿、提交、发起改分申请。 |
| 学生成绩查询   | `/grade/gpa`        | 本人成绩列表、GPA、学分进展。        |
| 成绩统计分析   | `/grade/statistics` | 学生个人分析图表。                   |
| 管理员改分审批 | `/grade/approval`   | 待审批列表、通过、驳回、查看日志。   |

## 9. Seed 演示数据

`backend/prisma/seed.ts` 已包含 F 模块演示数据：

- `admin / Admin123`
- `teacher / teacher123`
- `student / student123`
- 演示课程：`F-DEMO-001`
- 演示开课：`33333333-3333-4333-8333-333333333333`
- 一条已提交成绩。
- 一条待审批改分申请。

可按以下链路演示：

1. 使用 `teacher` 登录。
2. 进入 `/grade/entry`，输入演示开课 ID。
3. 查看已提交成绩，可发起新的改分申请。
4. 使用 `admin` 登录。
5. 进入 `/grade/approval`，通过或驳回改分申请。
6. 使用 `student` 登录。
7. 进入 `/grade/gpa` 和 `/grade/statistics` 查看成绩与统计。

## 10. 验收清单

- 教师能查看自己任课课程学生名单。
- 无成绩学生返回可录入占位项。
- 草稿可反复保存。
- 成绩提交后不能通过普通录入接口修改。
- 教师可对已提交成绩发起改分申请。
- 管理员可审批或驳回改分申请。
- 审批通过写入 `ScoreModificationLog` 与 `SystemLog`。
- 驳回不改变原成绩。
- 学生只能查询本人已公开成绩。
- GPA、平均分和学分进展以后端计算为准。
- 前端路由、菜单、接口文档与真实实现一致。
