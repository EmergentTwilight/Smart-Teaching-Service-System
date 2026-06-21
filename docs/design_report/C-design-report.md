# C 组智能选课设计报告

> 本文只覆盖 C 组 Smart Course Selection / 智能选课子系统。内容依据当前仓库实现、C 组 API 文档、C 组模块设计文档和需求报告整理；不把 Redis 连接控制、培养方案确认持久化、先修课成绩通过判断和 200 在线用户压测写成已完成能力。

## 4.4 C 智能选课数据/类设计

### 4.4.1 主要设计类

| 类名 | 职责 | 主要属性 | 主要行为 |
|---|---|---|---|
| Student | 表示当前登录学生身份 | userId, studentNumber, majorId, grade, className | 匹配培养方案、限定本人选课数据 |
| Teacher | 表示教师身份 | userId, teacherNumber, departmentId, title | 校验名单查询和导出归属 |
| AcademicAdmin | 表示学术教务管理员 | userId, adminType | 阶段管理和手动加课权限校验 |
| Course | 课程基础信息 | id, code, name, credits, courseType, status | 搜索、详情、学分计算、状态和先修关系校验 |
| Curriculum | 培养方案 | id, majorId, name, year, totalCredits, requiredCredits, electiveCredits | 根据学生专业和年级匹配培养方案 |
| CurriculumCourse | 培养方案课程关系 | curriculumId, courseId, courseType, semesterSuggestion | 分组展示、判断课程是否在培养方案内 |
| CourseOffering | 课程开设 | id, courseId, semesterId, teacherId, capacity, enrolledCount, status | 展示容量和状态；选课事务更新已选人数 |
| Schedule | 排课时间 | courseOfferingId, classroomId, dayOfWeek, startWeek, endWeek, startPeriod, endPeriod | 详情展示、课表生成、时间冲突检测 |
| Enrollment | 选课记录 | id, studentId, courseOfferingId, status, enrolledAt, droppedAt | 选课、退课、恢复、结果查询和成绩引用 |
| SelectionPeriod | 选课阶段 | id, semesterId, phase, startTime, endTime, maxCredits, isActive | 控制开放窗口、阶段和学分上限 |
| SystemLog | 审计记录 | userId, action, resourceType, resourceId, details | 记录阶段管理和手动加课 |
| AiAdvisorEndpoint | AI 接口边界 | recommend, explain | 支持 `full`、`rule_only`、`template_only` 的降级模式返回建议与风险说明 |

### 4.4.2 关系说明

学生通过 `Student.majorId` 和 `Student.grade` 匹配 `Curriculum`。培养方案通过 `CurriculumCourse` 关联课程并保存课程类型和建议修读学期。`CourseOffering` 关联课程、学期、教师和排课时间，`Enrollment` 关联学生与课程开设。

选课事务以 `Enrollment` 与 `CourseOffering.enrolledCount` 一致为核心。创建或恢复有效选课记录时增加已选人数，退课时把记录置为 `DROPPED` 并减少已选人数。时间冲突来自目标开课和本人已选开课的 `Schedule` 重叠判断，最大学分由当前开放阶段的 `SelectionPeriod.maxCredits` 控制。

当前无 AI 推荐结果表、连接队列表、手动加课申请表或培养方案确认表。

## 5.4 C 智能选课数据表

| 表名 | 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| semesters | id, name, start_date, end_date, status | UUID/String, VarChar, Date, Enum | id 主键；状态为 `UPCOMING`、`CURRENT`、`ENDED` | 学期基础数据 |
| course_offerings | id, course_id, semester_id, teacher_id, capacity, enrolled_count, status | UUID/String, Int, Enum | 关联课程、学期、教师 | 课程开设教学班，保存容量和已选人数 |
| enrollments | id, student_id, course_offering_id, status, enrolled_at, dropped_at | UUID/String, Enum, DateTime | `student_id + course_offering_id` 唯一 | 学生选课记录，退课更新状态而非删除 |
| selection_periods | id, semester_id, phase, start_time, end_time, max_credits, is_active | UUID/String, Enum, DateTime, Decimal, Boolean | 关联学期 | 选课阶段配置，按服务器时间判断开放 |
| schedules | id, course_offering_id, classroom_id, day_of_week, start_week, end_week, start_period, end_period, notes | UUID/String, Int, Text | 关联课程开设和教室 | C 组读取用于冲突检测和课表 |
| curriculums | id, major_id, name, year, total_credits, required_credits, elective_credits | UUID/String, Int, Decimal | 关联专业 | 学生培养方案 |
| curriculum_courses | curriculum_id, course_id, course_type, semester_suggestion | UUID/String, Enum, Int | 组合主键 | 培养方案课程关系 |
| course_prerequisites | course_id, prerequisite_id | UUID/String | 组合主键 | 先修关系；当前未接入成绩通过判断 |
| system_logs | user_id, action, resource_type, resource_id, details, created_at | UUID/String, Json, DateTime | 关联操作用户 | 阶段管理和手动加课审计 |

## 6.4 C 智能选课接口

### 6.4.1 接口约定

| 项 | 约定 |
|---|---|
| Base URL | `/api/v1/course-selection` |
| 认证 | JWT Bearer Token |
| 字段命名 | 外部请求和响应使用 `snake_case`；服务层使用 camelCase |
| 分页 | `page` 从 1 开始，`page_size` 默认 20，最大 100；名单默认 50 |
| 时间 | ISO 8601，阶段判断以服务器时间为准 |
| 学生身份 | 从认证上下文解析，不接受选课请求中的 `student_id` |

### 6.4.2 接口列表

| 接口名称 | 方法 | 路径 | 输入 | 输出 | 权限 |
|---|---|---|---|---|---|
| 查看本人培养方案 | GET | `/curriculum/me` | include_courses, course_type | 培养方案、课程分组、确认提示 | student |
| 查看本人学分进展 | GET | `/curriculum/me/progress` | semester_id, include_dropped | 学分要求、已选学分、类型进展、警告 | student |
| 搜索课程目录 | GET | `/courses` | keyword, teacher, teacher_id, course_type, status, page, page_size | 课程分页列表和开课摘要 | student、teacher、admin、super_admin |
| 查询开课列表 | GET | `/offerings` | semester_id, keyword, teacher, course_type, offering_status, available_only, page, page_size | 开课分页列表 | student、teacher、admin、super_admin |
| 查询本人可选课程 | GET | `/offerings/available` | semester_id, keyword, teacher, course_type, offering_status, include_unavailable | 可选课程、可选性和原因 | student |
| 查询开课详情 | GET | `/offerings/:id` | include_eligibility | 课程、教师、容量、先修、排课和可选性 | student、teacher、admin、super_admin |
| 查看本人选课记录 | GET | `/enrollments/me` | semester_id, status, keyword, page, page_size | 本人选课记录和汇总 | student |
| 提交选课 | POST | `/enrollments` | course_offering_id, client_request_id | 选课记录、容量、学分摘要 | student |
| 退选课程 | PATCH | `/enrollments/:id/drop` | reason, client_request_id | 退课后的记录和容量 | student |
| 查看本人课表 | GET | `/timetable/me` | semester_id, format | 课表、缺失排课提示、可打印标记 | student |
| 查看课程名单 | GET | `/teacher/offerings/:id/roster` | status, keyword, page, page_size | 本人开课名单分页 | teacher |
| 导出课程名单 | GET | `/teacher/offerings/:id/roster/export` | status, format=xlsx | Excel 文件 | teacher |
| 查询选课阶段 | GET | `/admin/periods` | semester_id, phase, is_active, page, page_size | 阶段分页列表 | admin/super_admin + ACADEMIC |
| 创建选课阶段 | POST | `/admin/periods` | semester_id, phase, start_time, end_time, max_credits, is_active | 新建阶段 | admin/super_admin + ACADEMIC |
| 更新选课阶段 | PATCH | `/admin/periods/:id` | 可选阶段字段 | 更新后阶段 | admin/super_admin + ACADEMIC |
| 教务手动加课 | POST | `/admin/enrollments` | student_id, course_offering_id, reason, notify_student | 记录、容量、审计结果 | admin/super_admin + ACADEMIC |
| AI 推荐课程 | POST | `/ai-advisor/recommend` | limit, preferences | 推荐 payload（支持降级） | student |
| AI 解释课程 | POST | `/ai-advisor/explain` | course_offering_id, question | 解释 payload（支持规则/LLM 降级） | student |

## 7.4 C 智能选课界面

| 页面 | 路由 | 使用角色 | 用途 | 主要字段/控件 | 主要操作与异常提示 |
|---|---|---|---|---|---|
| 课程列表与选课页 | `/selection/courses` | 学生 | 搜索可选课程、查看详情、选课或退课 | keyword、teacher、courseType、offeringStatus、includeUnavailable、课程表格、详情抽屉、确认弹窗 | 查询、详情、确认选退课；显示后端业务错误 |
| 培养方案页 | `/selection/curriculum` | 学生 | 查看培养方案、课程分组和学分进展 | 培养方案信息、课程分组、建议学期、CreditProgressCard | 无档案/无方案时显示错误；确认状态只展示后端提示 |
| 我的课表页 | `/selection/timetable` | 学生 | 查看和打印本人课表 | semesterId、查询/重置/刷新/打印、TimetableGrid | 查询失败、无选课、缺少排课均有提示 |
| AI 推荐页 | `/selection/ai` | 学生 | 展示 AI 推荐入口 | 推荐数量、推荐按钮、AiAdvisorPanel、解释结果 | 支持成功/降级提示，不改变选课记录 |
| 阶段管理页 | `/selection/admin/periods` | admin、super_admin | 管理选课阶段 | 学期、阶段、开始/结束时间、最大学分、是否启用 | 创建/更新阶段；后端拒绝非法时间、重叠和非 ACADEMIC 管理员 |
| 手动加课页 | `/selection/admin/manual-enrollment` | admin、super_admin | 为学生手动加课 | studentId、courseOfferingId、reason、notifyStudent | 原因为必填；成功后显示记录、容量和审计结果 |
| 教师课程名单页 | `/selection/teacher/roster` | 教师 | 查询和导出本人课程名单 | offeringId、keyword、status、名单表格、导出按钮 | 非本人开课返回 403；导出后端 Excel |

## 8.3 C 智能选课组件设计

| 组件 | 职责 | 输入 | 输出 | 依赖 |
|---|---|---|---|---|
| course-selection.routes | 挂载接口并组合鉴权、角色控制和校验 | HTTP 请求、JWT、query/body/params | 控制器结果或错误 | auth middleware、schemas |
| course-selection.schemas | 请求校验和字段转换 | query/body/params | 服务层 DTO | zod |
| curriculumService | 查询培养方案和学分进展 | 当前学生 userId、筛选参数 | 方案、课程分组、进展和警告 | Student、Curriculum、Enrollment |
| courseSearchService | 搜索课程、开课、可选课程和详情 | 筛选条件、当前学生身份 | 列表、详情、可选性原因 | Course、CourseOffering、Schedule |
| enrollmentService | 学生选课和退课事务 | userId、courseOfferingId、enrollmentId、clientRequestId | 选退课结果、容量、学分摘要 | SelectionPeriod、Enrollment、CourseOffering |
| enrollmentResultsService | 查询本人选课结果 | userId、筛选条件 | 选课记录和汇总 | Enrollment、CourseOffering |
| timetableService | 生成本人课表 | userId、semesterId、format | 课表项、缺失排课提示 | Enrollment、Schedule |
| rosterService | 查询和导出教师名单 | teacher userId、offeringId、筛选条件 | 名单分页或 Excel | CourseOffering、Enrollment、Student |
| selectionPeriodService | 阶段管理和手动加课 | admin userId、阶段配置、加课请求 | 阶段、加课结果、审计 | Admin、SelectionPeriod、SystemLog |
| course-selection.support | 共享分页、阶段状态、权限、冲突、学分和日志逻辑 | 服务参数 | 校验结果或错误 | Prisma、SystemLog |
| aiAdvisorService | AI 推荐/解释接口边界 | userId、推荐/解释请求 | 返回推荐/解释 payload，包含 `degradedMode`（`full` / `rule_only` / `template_only`）与风险提示 | AiAdvisor DTO |
| CourseOfferingTable | 展示可选课程和操作按钮 | offerings、已选映射、回调 | 选课/退课/详情事件 | Ant Design Table |
| CourseDetailDrawer | 展示开课详情 | offeringId、加载函数 | 详情、可选性、刷新事件 | courses API |
| CreditProgressCard | 展示学分进展 | progress、loading、error | 学分进度和警告 | curriculum API |
| TimetableGrid | 展示课表和打印样式 | timetable items、semesterName | 网格课表和缺失提示 | timetable API |
| AiAdvisorPanel | 展示 AI 推荐结果或空状态 | advice、loading、onExplain | 推荐列表和解释入口 | aiAdvisor API |

## 9. 关键算法与流程设计【A-F 按实际分写】

### 9.2.1 学生选课事务流程

1. 校验当前用户存在学生档案。
2. 读取目标 `CourseOffering`、`Course` 和 `Schedule`。
3. 按服务器时间读取目标学期内启用且开放的 `SelectionPeriod`。
4. 校验阶段已配置 `maxCredits`。
5. 校验开课状态为 `OPEN`，课程状态为 `ACTIVE`。
6. 查询 `studentId + courseOfferingId` 唯一选课记录，处理幂等或重复选课。
7. 校验容量，写入时使用条件更新防止并发超选。
8. 查询本人当前学期已选课程，用 `Schedule` 判断时间冲突。
9. 汇总当前已选学分和目标课程学分，校验不超过阶段上限。
10. 校验课程在当前学生匹配的培养方案内。
11. 校验先修课；当前未接入 F 组成绩通过数据，存在先修课时阻断。
12. 在 Serializable 事务内创建或恢复 `Enrollment`，同步更新 `CourseOffering.enrolledCount`。
13. 事务冲突最多重试 3 次，仍失败时返回准入限制错误。

### 9.2.2 学生退课流程

退课校验当前用户为学生、目标记录属于本人、当前阶段允许退课。成功后把 `Enrollment.status` 更新为 `DROPPED`，写入 `droppedAt`，并减少开课已选人数。当前实现只允许第二轮和调整阶段退课，初选阶段退课策略仍为 TODO。

### 9.2.3 选课阶段与手动加课流程

阶段创建和更新要求学术教务管理员身份，校验结束时间晚于开始时间、学期存在、同学期同阶段启用时间不重叠，并写入 `SystemLog`。手动加课要求填写原因，校验学生、课程开设、课程状态、容量、重复选课、时间冲突和最大学分，成功后创建或恢复选课记录、更新容量并写日志。

### 9.3 C AI 辅助选课流程

当前 AI 页面调用推荐或解释接口后，后端优先返回规则过滤后的候选 + LLM 推荐，LLM 不可用或校验失败时返回规则模板降级。该流程不写任何 AI 推荐数据，也不创建、修改或删除 `Enrollment`。输入来自学生本人可见的培养方案、已选课程、可选课程、容量和课表；输出建议仅包含推荐理由、风险提示和学分影响。正式选课仍必须走普通选课事务。

## 10. 安全、权限与异常处理设计【全组统一 + A-F 补充】

### 10.1 统一权限模型

| 场景 | 允许角色 | 控制方式 |
|---|---|---|
| 学生培养方案、可选课程、选课结果、课表 | student | Bearer Token + 当前学生档案 |
| 学生选课/退课 | student | 当前学生档案 + 本人记录归属 + 事务校验 |
| 教师名单查询/导出 | teacher | `CourseOffering.teacherId` 必须等于当前教师 userId |
| 选课阶段管理/手动加课 | admin、super_admin 入口，服务层要求 ACADEMIC | `Admin.adminType = ACADEMIC` + SystemLog |
| AI 推荐/解释 | student | 当前学生身份；支持降级提示；无选课副作用 |

### 10.3 异常处理设计

| 异常类型 | 触发场景 | 处理方式 |
|---|---|---|
| 参数错误 | 非 UUID、非法阶段、缺少手动加课原因 | schema 层拒绝 |
| 权限不足 | 学生访问他人数据、教师访问非本人开课、非 ACADEMIC 管理员操作 | 返回 403 |
| 阶段关闭 | 当前服务器时间不在启用阶段窗口内 | 返回 `CS_PERIOD_CLOSED` |
| 容量已满 | 已选人数达到容量或条件更新失败 | 返回 `CS_OFFERING_FULL` |
| 重复选课 | 已存在有效选课记录 | 返回 `CS_DUPLICATE_ENROLLMENT` 或幂等结果 |
| 时间冲突 | 目标开课与已选课程时间重叠 | 返回 `CS_SCHEDULE_CONFLICT` |
| 超过学分 | 选后总学分超过阶段上限 | 返回 `CS_MAX_CREDITS_EXCEEDED` |
| 先修课未满足 | 存在先修课且无法验证通过情况 | 返回 `CS_PREREQUISITE_NOT_MET` |
| 并发冲突 | Serializable 事务重试后仍失败 | 返回 `CS_ADMISSION_LIMITED` |
| AI 不可用 | 推荐或解释服务降级 | 返回规则模板/说明，不影响普通选课 |

## 12. 需求到设计追踪矩阵

| 需求编号 | 需求名称 | 设计类/组件 | 接口 | 数据表 | 页面 |
|---|---|---|---|---|---|
| FR-C-01 | 本人培养方案查询 | curriculumService、CreditProgressCard | `/curriculum/me` | students, curriculums, curriculum_courses, courses | 培养方案页 |
| FR-C-02 | 学分进展查询 | curriculumService、CreditProgressCard | `/curriculum/me/progress` | enrollments, course_offerings, courses, curriculums | 培养方案页 |
| FR-C-03 | 课程目录搜索 | courseSearchService | `/courses` | courses, teachers, course_offerings | 课程列表与选课页 |
| FR-C-04 | 开课列表与详情 | courseSearchService、CourseDetailDrawer | `/offerings`, `/offerings/:id` | course_offerings, courses, schedules, teachers, semesters | 课程列表与选课页 |
| FR-C-05 | 可选课程判断 | courseSearchService、CourseOfferingTable | `/offerings/available` | course_offerings, enrollments, schedules, curriculum_courses | 课程列表与选课页 |
| FR-C-06 | 学生选课事务 | enrollmentService | `/enrollments` | enrollments, course_offerings, selection_periods, schedules | 课程列表与选课页 |
| FR-C-07 | 学生退课事务 | enrollmentService | `/enrollments/:id/drop` | enrollments, course_offerings, selection_periods | 课程列表与选课页 |
| FR-C-08 | 本人选课结果查询 | enrollmentResultsService | `/enrollments/me` | enrollments, course_offerings, courses, semesters | 课程列表与选课页、我的课表页 |
| FR-C-09 | 本人课表查询与打印 | timetableService、TimetableGrid | `/timetable/me` | enrollments, course_offerings, schedules | 我的课表页 |
| FR-C-10 | 教师课程名单查询 | rosterService | `/teacher/offerings/:id/roster` | course_offerings, enrollments, students | 课程名单页 |
| FR-C-11 | 教师名单导出 | rosterService、roster-export.util | `/teacher/offerings/:id/roster/export` | course_offerings, enrollments, students | 课程名单页 |
| FR-C-12 | 选课阶段管理 | selectionPeriodService、SelectionPeriodStatusTag | `/admin/periods`, `/admin/periods/:id` | selection_periods, semesters, system_logs | 阶段管理页 |
| FR-C-13 | 教务手动加课 | selectionPeriodService | `/admin/enrollments` | enrollments, course_offerings, students, system_logs | 手动加课页 |
| FR-C-14 | AI 辅助推荐与解释 | aiAdvisorService、AiAdvisorPanel | `/ai-advisor/recommend`, `/ai-advisor/explain` | 无新增持久化表 | AI 推荐页 |
| FR-C-15 | 连接控制与空闲释放预留 | selectionPeriodService TODO | 暂无已实现接口 | 暂无新增表 | 阶段管理页 |
| FR-C-16 | C 组统一接口契约 | routes、schemas、types | `/api/v1/course-selection/*` | C 组相关表 | C 组所有页面 |

## 13. 设计风险与改进点

| 风险编号 | 风险描述 | 影响范围 | 应对策略 |
|---|---|---|---|
| R-C-01 | AI 推荐与解释降级边界 | AI 推荐页、AI 接口 | 已实现规则+LLM；LLM 失败时回退规则输出；仍保持不直接写 `Enrollment` |
| R-C-02 | Redis 连接控制、心跳和无操作释放尚未实现 | 高峰期选课准入 | 作为 C5 TODO 和风险，不作为当前验收通过项 |
| R-C-03 | 先修课通过判断尚未接入 F 组成绩数据 | 选课事务、成绩数据 | 当前存在先修课时阻断；后续与 F 组确定通过课程数据来源 |
| R-C-04 | 培养方案确认和公共课最低要求未完整建模 | 培养方案、学分进展 | 当前确认状态非持久化，公共课要求以提示表达；后续确认是否扩展已有模型 |
| R-C-05 | 200 在线用户目标未附压测证据 | 性能验收 | 后续在 Docker 环境补充压测或降级说明 |
| R-C-06 | 课程开设容量与选课记录可能受历史脏数据影响 | 选课事务、名单、课表 | 继续依赖事务和唯一约束，并补充数据一致性巡检或修复脚本 |
