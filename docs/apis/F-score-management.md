---
filename: F-score-management.md
title: STSS F 模块 · 接口与 DTO（F1 成绩录入）
status: draft
version: 0.2.0
last_updated_at: 2026-06-12
last_updated_by: 高诗奇
description: F 模块（成绩管理）中 F1（教师成绩录入）接口与 DTO 说明，供前端 F4 联调使用。
---

# F-模块接口与 DTO（F1：教师成绩录入）

此文档为前后端联调用的 F1（教师成绩录入）接口与 DTO 说明，供 F4 前端对接使用。

**注意**：最终字段以后端仓库中 `score-entry` 的实现为准；如果前端和后端对于字段命名（snake_case vs camelCase）有约定，请以项目统一规范为准（本项目响应采用 snake_case）。

---

## 1. 通用枚举 / 规则

- Score.status：`DRAFT` | `SUBMITTED` | `CONFIRMED` | `EMPTY`
  - `EMPTY`：后端在没有 Score 记录时返回的占位状态（前端展示为可录入项）。
  - `DRAFT`：草稿，可反复保存与覆盖。
  - `SUBMITTED`：教师提交后状态，普通录入接口不可再修改。
  - `CONFIRMED`：审批通过的最终状态（由 F2 产生），F1 识别但不产生。

- 分数校验：单项分数 `usualScore` / `midtermScore` / `finalScore` 必须在 0 ~ 100（包含），后端使用 Zod 校验；总评 `totalScore` 由后端重算，前端可不传或作为建议值。

- 清空分数的规则：如果前端显式把某一项字段设置为 `null` 并发送，后端 `saveDraft` 应支持把该字段写成 `null`（表示清空）。如果前端不传该字段，后端应保留原值（或使用 Enrollment 中的默认占位）。

---

## 2. DTO：数据结构（TypeScript 风格）

interface ScoreItem {
id: string | null // score 主键，若无则为 null
enrollment_id: string // Enrollment id
student_id: string
student_number: string
student_name: string
course_offering_id: string
course_id: string
course_code: string
course_name: string
semester_id: string
semester_name: string
usual_score: number | null
midterm_score: number | null
final_score: number | null
total_score: number | null // 后端重算总评
grade_point: number | null
grade_letter: string | null
status: 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'EMPTY'
entered_by: string | null
entered_at: string | null // ISO timestamp
modified_at: string | null
modified_by: string | null
has_pending_modification_request: boolean
}

interface StudentScoreSummary {
student_id: string
student_name: string
major_name: string | null
grade: number | null
total_required_credits: number | null
earned_credits: number
passed_credits: number
in_progress_credits: number
gpa: number | null
average_score: number | null
passed_course_count: number
failed_course_count: number
}

interface CourseScoreAnalytics {
course_offering_id: string
course_name: string
teacher_name: string
total_students: number
submitted_count: number
average_score: number | null
max_score: number | null
min_score: number | null
pass_count: number
fail_count: number
distribution: Array<{ range: string; count: number }>
ranking_top_10: Array<{ student_id: string; student_number: string; student_name: string; total_score: number; rank: number }>
}

---

## 3. F1 接口清单（教师端）

### 3.1 获取某开课下的成绩录入列表

- 方法：GET
- 路径：`/api/v1/course-offerings/:courseOfferingId/scores`（路由已挂载）
- 权限：需登录；`teacher`（仅限自己任课）或 `admin` / `super_admin`（可查看所有）
- Query 参数（zod 校验）：
  - `page?: number`（默认 1）
  - `pageSize?: number`（默认 20，最大 100）
  - `keyword?: string`（同时匹配学号或姓名）
  - `status?: 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'EMPTY'`

- 返回示例（成功）:

```json
{
  "code": 200,
  "message": "OK",
  "data": {
    "page": 1,
    "page_size": 20,
    "total": 123,
    "total_pages": 7,
    "items": [
      /* ScoreItem[] */
    ]
  }
}
```

- 行为说明：
  - 后端以 `Enrollment` 为准生成学生名单；若某学生无 Score 记录，后端会返回一条占位 `ScoreItem`（`status: 'EMPTY'`），方便前端渲染可录入项。
  - 前端按需展示 `DRAFT` 项可编辑，`SUBMITTED` / `CONFIRMED` 项只读。

### 3.2 保存草稿（批量 upsert）

- 方法：POST
- 路径：`/api/v1/course-offerings/:courseOfferingId/scores/draft`
- 权限：教师（仅限自己任课）或管理员
- Body（zod 校验）示例：

```json
{
  "scores": [
    {
      "enrollmentId": "e1",
      "usualScore": 80,
      "midtermScore": 70,
      "finalScore": 88
    },
    {
      "enrollmentId": "e2",
      "usualScore": null // 显式传 null 表示清空该项
    }
  ]
}
```

- 返回示例：

```json
{
  "code": 200,
  "message": "草稿保存成功",
  "data": { "savedCount": 2, "skippedCount": 0, "errors": [] }
}
```

- 行为与校验：
  - 后端会对 `0 <= score <= 100` 进行校验；校验失败会在 `errors` 中返回条目级错误。
  - 对于每条成绩：若 Score 不存在，后端会 `create`；若存在则 `update`（upsert）。
  - 如果 enrollment 不属于当前 courseOffering 或不存在，后端会把该条记录计入 `errors` 并跳过。
  - 若当前记录状态为 `SUBMITTED` 或 `CONFIRMED`，后端会跳过并计入 `skippedCount`。

### 3.3 提交成绩（批量提交）

- 方法：POST
- 路径：`/api/v1/course-offerings/:courseOfferingId/scores/submit`
- 权限：教师（仅限自己任课）或管理员
- Body（zod 校验）示例：

```json
{ "scoreIds": ["sc1", "sc2"] }
```

- 返回示例：

```json
{
  "code": 200,
  "message": "成绩提交成功",
  "data": { "submittedCount": 2, "skippedCount": 0, "errors": [] }
}
```

- 行为说明：
  - 后端只允许把 `DRAFT` 状态改为 `SUBMITTED`。
  - 提交时后端会统一重算 `total_score`、`grade_point`、`grade_letter`，并写入 `entered_by` / `entered_at`。
  - 提交后该条成绩通过常规录入接口不可再修改；若需改分需要走 F2 的改分申请流程。

---

## 4. 额外说明（给 F4 的协作要点）

- 字段命名：后端响应使用 `snake_case`（如 `student_number`、`total_score`）；前端接收后可按项目风格转换为 camelCase，但建议在请求/响应层尽量保持原样以避免混淆。

- “清空分数”交互：
  - 如果前端允许教师把已有分数置空（例如把平时分置空），请前端在请求体中显式传 `null`（而不是不包含该字段）。后端会将 `null` 写入数据库。
  - 若前端不传该字段，后端将保留旧值（实现上用 `"key" in item` 判断）。

- 状态展示：
  - `EMPTY`——列表占位，前端应显示可录入空白行。
  - `DRAFT`——可编辑，且可保存/提交。
  - `SUBMITTED` / `CONFIRMED`——只读，提交按钮/编辑按钮应禁用。

- 错误显示：后端在批量操作中会返回 `errors` 数组（每条包含 `enrollmentId/scoreId`、`field`、`message`），前端应把条目级错误展示到对应行。

- 权限：后端会根据 `req.user` 判断所属角色与教师身份（teacher.userId 与 courseOffering.teacherId 匹配），请前端传 Authorization header（Bearer token），后端中间件会填充 `req.user`。

---

## 5. 开始联调的建议与交付方式

- 推荐做法：把这份文件（以及后端分支）推到远端仓库并发 PR 给 `dev/F-migration`，并在工作群/微信上把 PR 链接发给 F4 同学，这样便于版本控制与后续修改追踪。

- 临时快速交付：如果 F4 需要立刻开始实现，可以把本文件临时导出为 PDF/Markdown 发微信给对方，但仍然建议把最终版本放到仓库（`docs/apis/F-score-management.md`），以便统一维护。

- 我可以代为提交并开 PR（若你同意把 `backend/package.json` 和 `pnpm-lock.yaml` 的 devDeps 也提交），或者我可以只把文档文件 commit 到当前分支并 push。请确认你想要我做哪种：
  - 1.  我代你 commit + push 并发起 PR（推荐）；
  - 2.  我只在本地生成文件，你手动 review 后提交；
  - 3.  只导出 Markdown 内容，你用微信发送给同学（不做 git 操作）。

---

如果你需要我一并生成 `mock/score-entry.mock.json` 示例数据包或把 DTO 转为 front-end friendly 的 TypeScript 接口（camelCase），我也可以一并生成。
