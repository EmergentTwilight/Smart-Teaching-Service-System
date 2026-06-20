# Smart Teaching Service System 设计报告模板

> 写作定位：设计报告回答“如何实现需求”。重点写系统结构、数据/类设计、接口设计、组件设计、部署和关键设计决策。不要只堆技术栈，也不要把代码逐行搬进来。

---

## 0. 文档信息

### 0.1 文档版本

| 版本 | 日期 | 作者 | 修改说明 |
|---|---|---|---|
| v1.0 | YYYY-MM-DD |  | 初稿 |
| v1.1 | YYYY-MM-DD |  | 修改说明 |

### 0.2 小组分工

| 子系统编号 | 子系统名称 | 负责小组 | 设计负责人 | 主要设计内容 |
|---|---|---|---|---|
| A | 基础信息管理 | A 组 |  | 用户、权限、课程、安全 |
| B | 自动排课 | B 组 |  | 教室资源、排课算法、调课 |
| C | 智能选课 | C 组 |  | 培养方案与学分进展、课程与开课查询、学生选退课事务、选课结果与课表、教师名单与导出、选课阶段管理、教务手动加课、AI 辅助接口预留 |
| D | 论坛交流 | D 组 |  | 帖子、回复、检索、统计 |
| E | 在线测试 | E 组 |  | 题库、组卷、答题、评分 |
| F | 成绩管理 | F 组 |  | 成绩录入、修改、分析 |

---

## 1. 引言【全组统一写】

### 1.1 设计目的

写作指引：  
说明本文档用于指导 STSS 的编码、测试、集成和维护。强调设计与需求报告的对应关系。

### 1.2 设计范围

写作指引：  
说明本文档覆盖 A-F 六个子系统的总体架构、数据设计、接口设计、组件设计、部署设计等。

### 1.3 参考文档

建议包括：
- 项目要求文档。
- 需求报告。
- UML 图。
- API 文档。
- 数据库设计文档。
- 测试计划或测试报告。

---

## 2. 总体设计目标与约束【全组统一写】

### 2.1 设计目标

写作指引：  
用条目说明系统设计追求什么。

建议覆盖：
- 模块清晰，A-F 子系统职责明确。
- 支持统一用户、权限、课程基础数据。
- 支持系统扩展和后续维护。
- 支持基本安全控制和日志记录。
- 支持选课并发、排课冲突检测、成绩修改控制等关键场景。
- 对 AI 辅助功能保持可替换、可扩展设计。

### 2.2 设计约束

写作指引：  
列出你们实际项目采用的技术和限制。没有确定的内容可以写“待定”。

| 类别 | 约束说明 |
|---|---|
| 前端技术 | 例如 Vue / React / HTML + CSS + JS |
| 后端技术 | 例如 Spring Boot / Django / Node.js |
| 数据库 | 例如 MySQL / PostgreSQL / SQLite |
| 部署环境 | 例如本地部署 / 云服务器 / Docker |
| AI 能力 | 例如调用大语言模型 API / 模拟 AI 推荐 |
| 浏览器兼容 | 例如 Chrome、Edge |
| 团队约束 | 例如 A-F 六组并行开发，需统一接口和数据模型 |

### 2.3 设计原则

写作指引：  
不要空泛喊口号。每条原则最好说明在本项目中的体现。

建议包括：
- 需求可追踪：设计元素应能对应到需求编号。
- 高内聚低耦合：每个子系统负责自己的核心业务。
- 统一身份与权限：A 子系统提供统一用户和权限基础。
- 接口清晰：跨子系统调用通过明确接口或共享数据结构完成。
- 可扩展：AI 辅助选课、成绩分析等能力应便于后续替换或增强。
- 可测试：关键模块应有明确输入、输出和异常路径。

---

## 3. 系统总体架构设计【全组统一主写，A-F 补充】

### 3.1 系统架构概述

写作指引：  
用一张总体架构图展示前端、后端、数据库、AI 服务、文件存储等组成。文字说明各层职责。

建议层次：
- 表现层：学生、教师、教务、管理员使用的页面。
- 业务层：A-F 子系统业务服务。
- 数据层：用户库、课程库、排课库、选课库、论坛库、题库、成绩库。
- 外部服务层：AI 服务、文件存储、导出服务等。

### 3.2 A-F 子系统关系图

写作指引：  
说明 A 是基础数据和权限中心，其他子系统依赖 A 的用户、角色、课程信息。

建议写法：
- A → B：提供教师、课程基础信息。
- A → C：提供学生、课程、权限基础信息。
- B → C：提供课程时间、教室、教师安排。
- C → F：提供学生选课结果，作为成绩登记对象。
- D → A：依赖用户身份和课程信息。
- E → F：在线测试成绩可作为成绩管理数据来源之一，若项目实现。
- F → C：查询培养方案和选课结果，计算学分进展。

### 3.3 架构风格

写作指引：  
说明你们采用什么架构。没有复杂微服务就不要硬写微服务。

可选写法：
- 本系统采用分层架构。
- 前端负责交互展示。
- 后端按子系统划分业务模块。
- 数据库保存系统核心数据。
- AI 辅助选课作为独立服务或独立模块接入 C 子系统。

### 3.4 关键架构决策

| 决策编号 | 决策内容 | 原因 | 影响范围 |
|---|---|---|---|
| AD-01 | 统一用户与权限由 A 子系统管理 | 避免各子系统重复管理用户 | A-F |
| AD-02 | 选课依赖排课结果 | 选课需要判断时间冲突和课程容量 | B、C |
| AD-03 | 成绩修改采用申请机制 | 保证成绩数据可信和可审计 | F |
| AD-C-01 | C 组统一挂载在 `/api/v1/course-selection` | 保持智能选课接口路径、鉴权、字段转换和错误处理集中管理 | C |
| AD-C-02 | 学生身份以后端认证上下文为准 | 防止学生通过前端传入 `student_id` 查询或操作他人选课数据 | C、A |
| AD-C-03 | 选课和手动加课以数据库事务维护容量一致性 | 避免高峰期并发选课造成 `Enrollment` 与 `CourseOffering.enrolledCount` 不一致 | C |
| AD-C-04 | AI 辅助不直接写入选课记录 | 当前 AI 后端未实现；后续即使接入推荐，也只能提供建议和解释，最终选课仍走普通选课事务 | C |

写作指引：  
只写对系统结构有实质影响的决策，不要把所有小实现都放进来。

---

## 4. 数据 / 类设计【全局统一类 + A-F 分组细化】

### 4.1 核心领域对象总览【全组统一整合】

| 类名 | 所属子系统 | 说明 |
|---|---|---|
| User | A | 系统用户基类 |
| Student | A/C/F | 学生用户 |
| Teacher | A/B/D/E/F | 教师用户 |
| Course | A/B/C/D/E/F | 课程基础信息 |
| Classroom | B | 教室资源 |
| Schedule | B/C | 排课结果 |
| CourseOffering | B/C/D/E/F | 某学期某课程的具体开课教学班 |
| Curriculum | A/C/F | 培养方案 |
| SelectionPeriod | C | 选课时间段与阶段配置 |
| Enrollment | C/F | 学生选课记录 |
| Post | D | 论坛帖子 |
| Question | E | 题目 |
| Paper | E | 试卷 |
| Score | F | 成绩记录 |

写作指引：  
这里是统一命名表。各组后续设计必须使用统一类名或说明别名。

### 4.2 A 基础信息管理数据/类设计【A 组填写】

#### 4.2.1 主要设计类

建议类：
- User
- Student
- Teacher
- Administrator
- Role
- Permission
- Course
- SystemLog

写作指引：  
说明每个类的职责、主要属性、主要方法。不需要贴完整代码。

#### 4.2.2 主要数据表

| 表名 | 说明 | 关键字段 | 关联 |
|---|---|---|---|
| users | 用户表 | id, username, password, role_id | roles |
| roles | 角色表 | id, role_name | permissions |
| courses | 课程表 | id, name, credit, capacity, assessment_type |  |

### 4.3 B 自动排课数据/类设计【B 组填写】

建议类：
- Classroom
- CourseOffering
- TeacherAvailability
- Schedule
- ScheduleConflict
- AdjustmentRequest

写作指引：
- 明确 Schedule 如何关联 Course、Teacher、Classroom、TimeSlot。
- 冲突检测是核心，要写清冲突类型。
- 自动排课算法可写流程，不必写完整代码。

### 4.4 C 智能选课数据/类设计【C 组】

C 组选课模块不新增独立业务表，主要复用 A/B/F 组共享的学生、教师、课程、培养方案、排课和成绩相关基础数据，并在 C 组内维护开课、选课记录和选课阶段。当前实现中 AI 辅助只有接口和前端入口，没有持久化 `AIRecommendation` 类或数据表。

#### 4.4.1 主要设计类

| 类名 | 职责 | 主要属性 | 主要方法/行为 |
|---|---|---|---|
| Student | 表示当前登录学生身份，用于限定本人培养方案、可选课程、选课结果和课表 | userId, studentNumber, majorId, grade, className | 匹配培养方案、限定本人选课记录、参与学分进展统计 |
| Teacher | 表示教师身份，用于课程开设和名单导出权限判断 | userId, teacherNumber, departmentId, title | 校验是否为目标 `CourseOffering.teacherId` |
| AcademicAdmin | 表示学术教务管理员身份 | userId, adminType | 阶段管理、手动加课前校验 `Admin.adminType = ACADEMIC` |
| Course | 课程基础信息 | id, code, name, credits, courseType, status | 课程搜索、详情展示、学分计算、状态校验、先修关系读取 |
| Curriculum | 培养方案 | id, majorId, name, year, totalCredits, requiredCredits, electiveCredits | 根据学生专业和年级匹配本人培养方案 |
| CurriculumCourse | 培养方案课程关系 | curriculumId, courseId, courseType, semesterSuggestion | 按课程类型分组，判断目标课程是否在培养方案内 |
| CourseOffering | 课程开设 | id, courseId, semesterId, teacherId, capacity, enrolledCount, status | 展示容量和开课状态；在选课事务中更新已选人数 |
| Schedule | 排课时间 | courseOfferingId, classroomId, dayOfWeek, startWeek, endWeek, startPeriod, endPeriod | 课程详情、课表展示和时间冲突检测 |
| Enrollment | 选课记录 | id, studentId, courseOfferingId, status, enrolledAt, droppedAt | 选课、退课、重新选课、结果查询和成绩管理引用 |
| SelectionPeriod | 选课阶段 | id, semesterId, phase, startTime, endTime, maxCredits, isActive | 控制选课开放窗口、阶段和最大学分 |
| SystemLog | 系统日志 | userId, action, resourceType, resourceId, details | 记录阶段创建/更新和教务手动加课 |
| AiAdvisorEndpoint | AI 推荐/解释接口边界 | recommend, explain | 当前返回未实现；后续只提供建议，不直接写 `Enrollment` |

#### 4.4.2 关系说明

学生通过 `Student.majorId` 和 `Student.grade` 匹配 `Curriculum`，培养方案通过 `CurriculumCourse` 关联课程并记录课程类型和建议修读学期。课程开设 `CourseOffering` 关联课程、学期、教师和排课时间，学生选课记录 `Enrollment` 关联学生和课程开设。

选课事务以 `Enrollment` 与 `CourseOffering.enrolledCount` 的一致性为核心：创建或恢复有效选课记录时增加已选人数，退课时将记录置为 `DROPPED` 并减少已选人数。时间冲突由目标开课和本人已选开课的 `Schedule` 比较得到，最大学分由当前开放 `SelectionPeriod.maxCredits` 控制。

AI 辅助接口不拥有独立持久化实体，也不参与选课写事务。当前 `ai-advisor.service` 返回空结果，控制器返回未实现响应；后续接入时仍必须把 AI 建议与正式选课结果分离。

### 4.5 D 论坛交流数据/类设计【D 组填写】

建议类：
- Forum
- Announcement
- Post
- Reply
- Attachment
- SearchIndex
- ForumStatistic

写作指引：
- 帖子、回复、附件之间的关系要清晰。
- 如果实现全文检索，说明检索数据来源和返回结果结构。
- 如果未实现复杂检索，可说明采用标题/正文关键词匹配。

### 4.6 E 在线测试数据/类设计

E 在线测试子系统围绕“题库 - 试卷 - 答题结果 - 单题答案”组织领域对象。后端实现采用 Rust + Poem OpenAPI，数据持久化使用 PostgreSQL。

#### 4.6.1 主要设计类

| 类名 | 职责 | 主要属性 | 主要方法/行为 |
|---|---|---|---|
| QuestionBank | 管理课程下的题库集合 | id, courseId, creatorId, name, description, status | 创建题库、查询题库、删除空题库、统计题目数量 |
| Question | 表示一道测试题 | id, bankId, questionType, content, answer, explanation, defaultPoints, difficulty, knowledgePoint | 创建题目、修改题目、查询详情、删除题目 |
| QuestionOption | 保存选择题/判断题选项 | id, questionId, optionText, optionOrder, isCorrect | 按题目顺序返回选项、标记正确选项 |
| TestPaper | 表示一份试卷 | id, courseOfferingId, creatorId, title, totalPoints, durationMinutes, startTime, endTime, status | 创建试卷、更新配置、发布试卷、关闭试卷 |
| TestQuestion | 维护试卷与题目的组合关系 | id, testPaperId, questionId, orderNum, points | 手动加入题目、自动抽题加入、移除题目、重排题号 |
| TestResult | 表示学生一次答题会话/结果 | id, testPaperId, studentId, startTime, submitTime, totalScore, status, timeSpentSeconds | 开始答题、恢复未完成答题、提交后更新总分和状态 |
| Answer | 保存一次答题中的单题答案 | id, testResultId, testQuestionId, studentAnswer, isCorrect, score | 保存学生答案、记录判题结果和单题得分 |

#### 4.6.2 关系说明

题库与题目是一对多关系，一个 `QuestionBank` 下包含多道 `Question`。题目与试卷不是直接嵌套关系，而是通过 `TestQuestion` 建立组合关系：一道题可以被多份试卷复用，一份试卷也可以包含多道题，因此逻辑上是多对多，关联表额外保存题号和本卷分值。

学生开始答题时创建或复用一条 `TestResult`，系统返回不含正确答案标记的题目与选项。学生提交后，系统将每一道题的作答写入 `Answer` 表，同时更新 `TestResult.totalScore`、`submitTime`、`status` 和 `timeSpentSeconds`，形成可追溯的答题记录。

自动评分目前覆盖单选题、多选题和判断题。单选题、判断题按选项序号直接比较；多选题先对学生答案和标准答案的序号集合排序，再进行集合一致性比较。完全正确得该题满分，错误或未作答得 0 分。

### 4.7 F 成绩管理数据/类设计【F 组填写】

建议类：
- Score
- ScoreRecord
- ScoreModificationRequest
- CreditProgress
- GPAStatistic
- CourseScoreAnalysis

写作指引：
- 成绩记录必须关联学生、课程、教师或教学班。
- 成绩修改申请要有状态。
- 成绩分析类不一定持久化，可作为计算服务说明。

---

## 5. 数据库设计【A-F 分组填写，统一整合】

### 5.1 数据库总体说明【全组统一写】

写作指引：  
说明数据库选型、命名规范、主键策略、外键策略、时间字段、删除策略。

### 5.2 A 基础信息管理数据表【A 组填写】

| 表名 | 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
|  |  |  |  |  |

### 5.3 B 自动排课数据表【B 组填写】

| 表名 | 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|---|

### 5.4 C 智能选课数据表【C 组】

| 表名 | 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| semesters | id, name, start_date, end_date, status | UUID/String, VarChar, Date, Enum | id 为主键；状态为 `UPCOMING`、`CURRENT`、`ENDED` | 学期基础数据，供开课和选课阶段引用 |
| course_offerings | id, course_id, semester_id, teacher_id, capacity, enrolled_count, status | UUID/String, Int, Enum | id 为主键；关联课程、学期、教师；状态为 `PLANNED`、`OPEN`、`CLOSED`、`CANCELLED` | 课程开设教学班，保存容量和已选人数 |
| enrollments | id, student_id, course_offering_id, status, enrolled_at, dropped_at | UUID/String, Enum, DateTime | id 为主键；`student_id + course_offering_id` 唯一；状态为 `ENROLLED`、`DROPPED`、`WITHDRAWN` | 学生选课记录；退课不删除记录，而是更新状态和退课时间 |
| selection_periods | id, semester_id, phase, start_time, end_time, max_credits, is_active | UUID/String, Enum, DateTime, Decimal, Boolean | id 为主键；关联学期；阶段为 `FIRST_ROUND`、`SECOND_ROUND`、`ADJUSTMENT` | 选课阶段配置，后端按服务器时间判断是否开放 |
| schedules | id, course_offering_id, classroom_id, day_of_week, start_week, end_week, start_period, end_period, notes | UUID/String, Int, Text | id 为主键；关联课程开设和教室 | C 组只读取排课时间，用于课程详情、课表展示和冲突检测 |
| curriculums | id, major_id, name, year, total_credits, required_credits, elective_credits | UUID/String, Int, Decimal | id 为主键；关联专业 | C 组按学生专业和年级读取培养方案 |
| curriculum_courses | curriculum_id, course_id, course_type, semester_suggestion | UUID/String, Enum, Int | 组合主键 `curriculum_id + course_id` | 维护培养方案课程、课程类型和建议修读学期 |
| course_prerequisites | course_id, prerequisite_id | UUID/String | 组合主键 `course_id + prerequisite_id` | C 组读取先修关系；当前尚未接入成绩通过判断 |
| system_logs | user_id, action, resource_type, resource_id, details, created_at | UUID/String, Json, DateTime | 关联操作用户 | 阶段创建/更新、手动加课等敏感操作写入日志 |

说明：`students`、`teachers`、`admins`、`courses` 等主数据由 A 组维护，C 组只读取。当前数据库中没有 AI 推荐结果表、连接队列表或培养方案确认表，设计报告不得把这些能力写成已持久化实现。

### 5.5 D 论坛交流数据表【D 组填写】

| 表名 | 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|---|

### 5.6 E 在线测试数据表

| 表名 | 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| question_banks | id, course_id, creator_id, name, description, status | UUID/String, VarChar, Text, Enum | id 为主键；关联课程和创建教师；状态默认可用 | 保存课程题库基础信息，供题目管理和组卷功能引用 |
| questions | id, bank_id, question_type, content, answer, explanation, default_points, difficulty, knowledge_point | UUID/String, Enum, Text, Decimal, VarChar | id 为主键；关联题库；题型限定为单选、多选、判断；题干、答案和默认分值必填 | 保存题干、标准答案、分值、难度和知识点，是组卷与自动评分的基础数据 |
| question_options | id, question_id, option_text, option_order, is_correct | UUID/String, VarChar, Int, Boolean | id 为主键；关联题目并随题目级联删除；按题目和选项顺序建立索引 | 保存题目选项及正确标记，学生答题时只返回选项文本和顺序 |
| test_papers | id, course_offering_id, creator_id, title, description, total_points, duration_minutes, start_time, end_time, is_random, status | UUID/String, VarChar, Text, Decimal, Int, DateTime, Boolean, Enum | id 为主键；关联开课和创建教师；状态默认为草稿 | 保存试卷基础信息和生命周期状态，支持草稿、发布、关闭等控制 |
| test_questions | id, test_paper_id, question_id, order_num, points | UUID/String, Int, Decimal | id 为主键；关联试卷和题目；试卷删除时级联删除关联记录 | 维护试卷与题目的组合关系，记录题号和该题在本试卷中的分值 |
| test_results | id, test_paper_id, student_id, start_time, submit_time, total_score, status, time_spent_seconds | UUID/String, DateTime, Decimal, Enum, Int | id 为主键；关联试卷和学生；状态默认为答题中 | 保存学生一次测试的开始、提交、总分、状态和用时，用于恢复答题和成绩查询 |
| answers | id, test_result_id, test_question_id, student_answer, is_correct, score | UUID/String, Text, Boolean, Decimal | id 为主键；关联答题记录和试卷题目；答题记录删除时级联删除答案 | 保存逐题作答内容和自动评分结果，支撑答题详情展示 |

### 5.7 F 成绩管理数据表【F 组填写】

| 表名 | 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|---|

### 5.8 跨子系统数据一致性说明【全组统一整合】

写作指引：
说明跨系统共享数据如何保持一致。例如：
- 删除课程时如何影响排课、选课、论坛、测试、成绩。
- 修改用户角色时如何影响权限。
- 修改排课结果时如何影响选课。
- 修改成绩时如何记录审计。

---

## 6. 接口设计【全局规范 + A-F 分组填写】

### 6.1 接口设计规范【全组统一写】

写作指引：  
规定接口命名、请求方式、返回格式、错误码、鉴权方式。

建议格式：

| 项 | 约定 |
|---|---|
| URL 命名 | /api/{subsystem}/{resource} |
| 请求格式 | JSON |
| 返回格式 | code, message, data |
| 鉴权 | 登录态 / Token / Session |
| 错误码 | 统一定义 |

### 6.2 A 基础信息管理接口【A 组填写】

| 接口名称 | 方法 | 路径 | 输入 | 输出 | 权限 |
|---|---|---|---|---|---|
| 添加用户 | POST | /api/users | 用户信息 | 创建结果 | 教务管理人员 |
| 查询课程 | GET | /api/courses | 查询条件 | 课程列表 | 登录用户 |

### 6.3 B 自动排课接口【B 组填写】

写作指引：
列出教室资源、自动排课、手动调课、课表查询接口。

### 6.4 C 智能选课接口【C 组】

C 组接口统一挂载在 `/api/v1/course-selection`，通过 JWT Bearer Token 鉴权。外部请求字段使用 `snake_case`，schema/controller 层转换为服务层 camelCase。学生端接口从当前登录用户解析学生身份，不接受前端传入 `student_id` 作为本人身份。

| 接口名称 | 方法 | 路径 | 输入 | 输出 | 权限 |
|---|---|---|---|---|---|
| 查看本人培养方案 | GET | `/api/v1/course-selection/curriculum/me` | include_courses, course_type | 培养方案、课程分组、确认提示 | student |
| 查看本人学分进展 | GET | `/api/v1/course-selection/curriculum/me/progress` | semester_id, include_dropped | 学分要求、已选学分、类型进展、警告 | student |
| 搜索课程目录 | GET | `/api/v1/course-selection/courses` | keyword, teacher, teacher_id, course_type, status, page, page_size | 课程分页列表和开课摘要 | student、teacher、admin、super_admin |
| 查询课程开设列表 | GET | `/api/v1/course-selection/offerings` | semester_id, keyword, teacher, course_type, offering_status, available_only, page, page_size | 开课分页列表 | student、teacher、admin、super_admin |
| 查询本人可选课程 | GET | `/api/v1/course-selection/offerings/available` | semester_id, keyword, teacher, course_type, offering_status, include_unavailable, page, page_size | 可选课程列表、可选性和原因 | student |
| 查询开课详情 | GET | `/api/v1/course-selection/offerings/:id` | include_eligibility | 课程、教师、学期、容量、先修课、排课和可选性 | student、teacher、admin、super_admin |
| 查看本人选课记录 | GET | `/api/v1/course-selection/enrollments/me` | semester_id, status, keyword, page, page_size | 本人选课记录分页和汇总 | student |
| 提交选课 | POST | `/api/v1/course-selection/enrollments` | course_offering_id, client_request_id | 选课记录、容量、学分摘要 | student |
| 退选课程 | PATCH | `/api/v1/course-selection/enrollments/:id/drop` | reason, client_request_id | 退课后的选课记录和容量 | student |
| 查看本人课表 | GET | `/api/v1/course-selection/timetable/me` | semester_id, format | 课表网格/列表、缺失排课提示、可打印标记 | student |
| 查看课程名单 | GET | `/api/v1/course-selection/teacher/offerings/:id/roster` | status, keyword, page, page_size | 本人开课学生名单分页 | teacher |
| 导出课程名单 | GET | `/api/v1/course-selection/teacher/offerings/:id/roster/export` | status, format=xlsx | Excel 文件 | teacher |
| 查询选课阶段 | GET | `/api/v1/course-selection/admin/periods` | semester_id, phase, is_active, page, page_size | 选课阶段分页列表 | admin、super_admin，服务层校验 ACADEMIC |
| 创建选课阶段 | POST | `/api/v1/course-selection/admin/periods` | semester_id, phase, start_time, end_time, max_credits, is_active | 新建阶段 | admin、super_admin，服务层校验 ACADEMIC |
| 更新选课阶段 | PATCH | `/api/v1/course-selection/admin/periods/:id` | semester_id, phase, start_time, end_time, max_credits, is_active | 更新后阶段 | admin、super_admin，服务层校验 ACADEMIC |
| 教务手动加课 | POST | `/api/v1/course-selection/admin/enrollments` | student_id, course_offering_id, reason, notify_student | 选课记录、容量、审计结果 | admin、super_admin，服务层校验 ACADEMIC |
| AI 推荐课程 | POST | `/api/v1/course-selection/ai-advisor/recommend` | limit, preferences 等 | 当前返回未实现 | student |
| AI 解释课程 | POST | `/api/v1/course-selection/ai-advisor/explain` | course_offering_id, question | 当前返回未实现 | student |

关键接口限制：
- `POST /enrollments` 的请求体 schema 为 strict，只接受 `course_offering_id` 和可选 `client_request_id`。
- `/offerings/available` 必须注册在 `/offerings/:id` 之前，避免静态路由被动态参数吞掉。
- AI 接口当前不能作为推荐能力验收项，只能验收“未实现响应”和“无选课副作用”。

### 6.5 D 论坛交流接口【D 组填写】

写作指引：
列出公告、帖子、回复、附件、检索、统计接口。

### 6.6 E 在线测试接口

E 组接口由 Rust 后端 `backend-e-rust` 提供，统一前缀为 `/online-testing`，接口通过 Bearer Token 解析用户身份，并按需求报告中的角色边界控制能力：题库、题目、试卷和组卷写操作面向教务管理人员与系统管理员；开始答题和提交试卷面向学生；按试卷查看成绩面向教师、教务管理人员和系统管理员。

| 接口名称 | 方法 | 路径 | 输入 | 输出 | 权限 |
|---|---|---|---|---|---|
| 联调验证 | GET | /online-testing/ping | 无 | module, from, status | 登录用户 |
| 题库管理 | GET/POST/DELETE | /online-testing/question-banks, /online-testing/question-banks/:id | 题库名称、描述或题库 id | 题库列表、题目数量、创建/删除结果 | 查询为登录用户；写操作为教务管理人员/系统管理员 |
| 题目管理 | GET/POST/PUT/DELETE | /online-testing/questions, /online-testing/questions/:id | 题库、题型、题干、选项、正确选项、分值、难度、知识点等 | 题目分页列表、题目详情、创建/更新/删除结果 | 查询为登录用户；写操作为教务管理人员/系统管理员 |
| 试卷基础管理 | GET/POST/PUT | /online-testing/test-papers, /online-testing/test-papers/:id | 试卷标题、说明、总分、考试时长、考试时间窗口等 | 试卷列表、试卷详情、创建/更新结果 | 查询为登录用户；写操作为教务管理人员/系统管理员 |
| 试卷组卷管理 | POST/DELETE | /online-testing/test-papers/:id/questions, /online-testing/test-papers/:id/auto-generate, /online-testing/test-papers/:id/questions/:test_question_id | 手动选题信息、自动抽题条件、试卷题目 id | 已加入题目数量、移除结果、更新后的试卷题目关系 | 教务管理人员/系统管理员 |
| 试卷发布控制 | POST | /online-testing/test-papers/:id/publish, /online-testing/test-papers/:id/close | 试卷 id | 发布/关闭结果 | 教务管理人员/系统管理员 |
| 在线答题 | POST | /online-testing/test-papers/:id/start | 试卷 id | 学生视角试题、选项、开始时间、剩余时间、答题记录标识 | 学生 |
| 提交与自动评分 | POST | /online-testing/test-results/:id/submit | 答题记录 id、学生答案列表 | 总分、正确题数、用时、逐题判分明细 | 学生 |
| 成绩查询 | GET | /online-testing/test-results/my, /online-testing/test-results/:id, /online-testing/test-papers/:id/results | 学生本人身份、答题记录 id 或试卷 id | 个人测试记录、单次答题详情、试卷学生成绩列表 | 学生本人/教师/教务管理人员/系统管理员 |

### 6.7 F 成绩管理接口【F 组填写】

写作指引：
列出成绩录入、查询、修改申请、成绩分析接口。

### 6.8 跨子系统接口说明【全组统一整合】

| 调用方 | 被调用方 | 用途 | 说明 |
|---|---|---|---|
| C | B | 获取排课结果 | 判断选课时间冲突 |
| F | C | 获取学生选课结果 | 限制只能录入已选课程成绩 |
| D | A | 获取用户和课程信息 | 论坛身份与课程关联 |
| E | A | 获取教师和课程信息 | 题库和试卷归属 |

---

## 7. 用户界面设计【A-F 分组填写，统一风格】

### 7.1 UI 设计原则【全组统一写】

写作指引：
说明整体界面风格、导航规则、错误提示规则、权限菜单展示规则。

建议覆盖：
- 用户登录后只显示有权限的菜单。
- 重要操作需要确认。
- 表单输入需要校验。
- 错误提示应明确说明原因。
- 页面命名和按钮文案统一。

### 7.2 A 基础信息管理界面【A 组填写】

页面建议：
- 用户管理页。
- 个人信息页。
- 课程管理页。
- 权限管理页。
- 系统日志页。

写作指引：
每个页面写：用途、入口、主要字段、主要操作、异常提示。

### 7.3 B 自动排课界面【B 组填写】

页面建议：
- 教室资源管理页。
- 自动排课页。
- 排课结果页。
- 手动调课页。
- 课表打印页。

### 7.4 C 智能选课界面【C 组】

| 页面 | 路由 | 使用角色 | 用途 | 主要字段/控件 | 主要操作与异常提示 |
|---|---|---|---|---|---|
| 课程列表与选课页 | `/selection/courses` | 学生 | 搜索可选课程、查看详情、执行选课或退课 | keyword、teacher、courseType、offeringStatus、includeUnavailable、课程表格、详情抽屉、确认弹窗 | 查询可选课程；查看容量、时间和不可选原因；确认选课/退课；后端失败时显示业务错误 |
| 培养方案页 | `/selection/curriculum` | 学生 | 查看本人培养方案、课程分组和学分进展 | 培养方案信息、课程类型分组、建议学期、CreditProgressCard | 学生档案、专业、年级或培养方案异常时显示明确错误；确认状态当前只展示后端返回提示 |
| 我的课表页 | `/selection/timetable` | 学生 | 查看本人已选课程课表并打印 | semesterId 输入框、查询/重置/刷新/打印按钮、TimetableGrid、选课概况 | 课表查询失败时提示错误；缺少排课时间的课程单独提示；打印时隐藏筛选控件 |
| AI 推荐页 | `/selection/ai` | 学生 | 展示 AI 推荐入口和解释入口 | 推荐数量、推荐按钮、AiAdvisorPanel、解释结果区域 | 当前后端未实现时展示失败或降级提示，不改变选课记录 |
| 阶段管理页 | `/selection/admin/periods` | admin、super_admin | 管理选课阶段 | 学期、阶段、开始/结束时间、最大学分、是否启用、阶段状态标签 | 创建/更新阶段；非法时间、重叠阶段或非学术教务身份由后端拒绝 |
| 手动加课页 | `/selection/admin/manual-enrollment` | admin、super_admin | 教务为学生手动加课 | studentId、courseOfferingId、reason、notifyStudent | 提交手动加课；显示返回的选课记录、容量和审计结果；原因为必填 |
| 教师课程名单页 | `/selection/teacher/roster` | 教师 | 查询和导出本人开课名单 | offeringId、keyword、status、名单表格、导出按钮 | 教师只能访问本人开课；非本人开课后端返回 403；导出 Excel 使用后端文件 |

### 7.5 D 论坛交流界面【D 组填写】

页面建议：
- 论坛首页。
- 公告页。
- 帖子列表页。
- 帖子详情页。
- 发帖页。
- 检索页。
- 统计页。

### 7.6 E 在线测试界面


| 页面 | 路由 | 使用角色 | 用途 | 主要字段/控件 | 主要操作与异常提示 |
|---|---|---|---|---|---|
| 在线测试联调验证页 | /exam/ping | 登录用户 | 验证前端与 E 组 Rust 后端连通性 | Ping 按钮、成功/失败提示 | 调用 `/online-testing/ping`；失败时显示请求错误信息 |
| 题目管理页 | /exam/questions | 教务管理人员/系统管理员 | 维护题库和题目 | 题库下拉框、题目表格、题型、选项、正确选项、分值、难度、知识点、解析 | 新建/删除题库，新增/编辑/删除题目；学生访问时显示无权访问 |
| 组卷管理/试卷列表页 | /exam/papers | 教务管理人员/系统管理员/学生 | 管理人员创建、组卷、发布和关闭试卷，学生查看可答试卷 | 试卷标题、总分、时长、考试时间、状态、题目数 | 管理人员创建试卷、编辑配置、手动加题、按条件抽题、发布/关闭；学生对已发布试卷点击开始答题，已交卷试卷显示状态 |
| 在线答题页 | /exam/exam/:paperId | 学生 | 完成在线考试 | 固定顶部考试信息、倒计时、答题进度、单选/多选/判断题控件 | 自动开始或恢复答题，答案暂存 sessionStorage，交卷前确认未答题数量，时间到自动交卷；非学生或不可答状态显示阻断页 |
| 成绩查看页 | /exam/results | 学生/教师/教务管理人员/系统管理员 | 查看在线测试成绩和单题详情 | 成绩表格、状态标签、详情抽屉、正确率、用时、每题判分 | 学生查看本人历史成绩；教师或管理人员从试卷列表进入查看某试卷所有学生成绩；详情加载失败时提示错误 |

### 7.7 F 成绩管理界面【F 组填写】

页面建议：
- 成绩录入页。
- 成绩查询页。
- 成绩修改申请页。
- 学生学分进展页。
- 成绩分析页。

---

## 8. 组件级设计【A-F 分组分别写】

> 每个子系统写核心组件即可，不必把每个小函数都写进去。

### 8.1 A 基础信息管理组件设计【A 组填写】

| 组件 | 职责 | 输入 | 输出 | 依赖 |
|---|---|---|---|---|
| UserService | 用户增删改查 | 用户信息 | 用户记录 | UserRepository |
| AuthService | 登录与权限校验 | 账号、密码、权限请求 | 登录结果、权限判断 | UserService |
| CourseService | 课程基础信息管理 | 课程信息 | 课程记录 | CourseRepository |

写作指引：
重点写权限、课程、用户如何支撑其他子系统。

### 8.2 B 自动排课组件设计【B 组填写】

建议组件：
- ClassroomService
- ScheduleService
- ConflictDetectionService
- ManualAdjustmentService
- TimetableExportService

写作指引：
重点说明自动排课流程和冲突检测流程。

### 8.3 C 智能选课组件设计【C 组】

| 组件 | 职责 | 输入 | 输出 | 依赖 |
|---|---|---|---|---|
| course-selection.routes | 统一挂载 C 组接口，组合鉴权、角色控制和 schema 校验 | HTTP 请求、JWT、路由参数、query/body | 控制器调用结果或统一错误 | A 组 auth middleware、course-selection.schemas |
| course-selection.schemas | 校验 C 组请求参数并转换 snake_case/camelCase | query/body/params | 服务层 DTO | zod |
| curriculumService | 查询本人培养方案和学分进展 | 当前用户 userId、筛选参数 | 培养方案、课程分组、进展和警告 | Student、Curriculum、CurriculumCourse、Enrollment、Course |
| courseSearchService | 搜索课程、开课、可选课程和详情 | 筛选条件、当前学生身份 | 分页列表、详情、可选性原因 | Course、CourseOffering、Schedule、Enrollment、CurriculumCourse |
| enrollmentService | 处理学生选课和退课事务 | 当前学生 userId、courseOfferingId、enrollmentId、clientRequestId | 选课/退课结果、容量、学分摘要 | SelectionPeriod、CourseOffering、Schedule、Enrollment、CurriculumCourse |
| enrollmentResultsService | 查询本人选课结果 | 当前学生 userId、学期/状态/关键词/分页 | 本人选课记录和汇总 | Enrollment、CourseOffering、Course、Semester |
| timetableService | 生成本人课表 | 当前学生 userId、semesterId、format | 课表项、缺失排课提示、可打印标记 | Enrollment、CourseOffering、Schedule |
| rosterService | 查询和导出教师本人课程名单 | 教师 userId、offeringId、筛选条件 | 名单分页或 Excel 文件 | CourseOffering、Enrollment、Student、roster-export.util |
| selectionPeriodService | 管理选课阶段和教务手动加课 | 管理员 userId、阶段配置、手动加课请求 | 阶段配置、手动加课结果、审计结果 | Admin、SelectionPeriod、Enrollment、SystemLog |
| course-selection.support | 复用分页、阶段状态、权限、冲突、最大学分和日志逻辑 | 业务服务参数 | 校验结果、映射结果或错误 | Prisma、SystemLog |
| aiAdvisorService | AI 推荐和解释接口边界 | 当前学生 userId、推荐/解释请求 | 当前返回 null，由控制器转为未实现响应 | AiAdvisor DTO |
| CourseOfferingTable | 展示可选课程和操作按钮 | 可选课程列表、已选映射、loading、回调 | 选课/退课/详情事件 | Ant Design Table |
| CourseDetailDrawer | 展示课程开设详情和可选性 | offeringId、详情加载函数 | 课程、容量、先修课、排课、可选原因 | courses API |
| CreditProgressCard | 展示学分进展 | progress、loading、error | 学分进度、警告、空状态 | curriculum API |
| TimetableGrid | 展示课表网格和打印样式 | timetable items、semesterName、missingScheduleItems | 网格课表和缺失排课提示 | timetable API |
| SelectionPeriodStatusTag | 展示阶段服务器状态 | serverStatus、isActive | 状态标签 | SelectionPeriod DTO |
| AiAdvisorPanel | 展示 AI 推荐结果或空状态 | advice、loading、onExplain | 推荐列表、风险提示、解释入口 | aiAdvisor API |

选课最终结果以后端 `enrollmentService` 为准。前端组件只展示后端返回的可选性、错误和状态，不通过本地判断伪造选课成功。

### 8.4 D 论坛交流组件设计【D 组填写】

建议组件：
- AnnouncementService
- PostService
- ReplyService
- AttachmentService
- SearchService
- ForumStatisticService

### 8.5 E 在线测试组件设计

| 组件 | 职责 | 输入 | 输出 | 依赖 |
|---|---|---|---|---|
| QuestionBankService | 题库与题目管理，包括题库创建、题目 CRUD、选项校验 | 题库信息、题目表单、选项文本、正确选项序号 | 题库列表、题目列表、题目详情、删除结果 | PostgreSQL question_banks、questions、question_options |
| PaperGenerationService | 试卷创建与组卷，支持手动加题和按条件自动抽题 | 试卷基础信息、题库 id、题型、难度、关键词、抽题数量、分值 | 试卷详情、已加入题目数、题号顺序 | TestPaper、TestQuestion、QuestionBankService |
| PaperLifecycleService | 控制试卷从草稿到发布、关闭的生命周期 | 试卷 id、当前状态 | 发布/关闭结果 | test_papers.status、权限校验 |
| TestSessionService | 管理学生答题会话、计时和试题下发 | 试卷 id、学生身份、考试时间窗口 | 学生视角题目、testResultId、剩余时间 | TestPaper、TestQuestion、TestResult |
| AutoGradingService | 提交后自动评分并保存单题结果 | testResultId、学生答案列表 | 总分、正确数、单题判分明细 | questions.answer、test_questions.points、answers、test_results |
| TestStatisticService | 查询学生成绩与教师端试卷成绩 | 学生 id、试卷 id、答题结果 id | 成绩列表、答题详情、正确率、用时 | test_results、answers、users |
| AuthAndErrorMiddleware | 统一鉴权、角色校验、请求日志和错误返回 | Bearer Token、请求信息 | JwtPayload、统一错误响应、requestId | A 组 JWT、Poem 中间件 |

前端组件与后端服务按页面职责对应：题目管理页调用 QuestionBankService，组卷页调用 PaperGenerationService 和 PaperLifecycleService，在线答题页调用 TestSessionService 与 AutoGradingService，成绩查看页调用 TestStatisticService。

### 8.6 F 成绩管理组件设计【F 组填写】

建议组件：
- ScoreEntryService
- ScoreQueryService
- ScoreModificationService
- CreditProgressService
- ScoreAnalysisService

写作指引：
重点说明成绩修改受控流程和成绩分析计算逻辑。

---

## 9. 关键算法与流程设计【按实际情况 A-F 分写】

### 9.1 B 自动排课算法流程【B 组重点写】

写作指引：
可以用流程图或伪代码说明：
1. 读取课程、教师、教室、时间段。
2. 过滤不满足容量或用途的教室。
3. 检查教师时间冲突。
4. 检查教室时间冲突。
5. 尽量均匀分布课程。
6. 生成排课结果。
7. 输出冲突或待人工调整项。

### 9.2 C 选课约束检查流程【C 组重点写】

当前学生选课由 `enrollmentService.createEnrollment` 在后端事务中完成，前端只负责提交 `course_offering_id` 和展示返回结果。

1. 校验当前用户存在学生档案；若无法找到学生档案，拒绝选课。
2. 读取目标 `CourseOffering`、关联 `Course` 和 `Schedule`；目标开课不存在时返回不存在错误。
3. 按服务器当前时间读取目标学期内启用且开放的 `SelectionPeriod`；不存在开放阶段时返回 `CS_PERIOD_CLOSED`。
4. 校验当前阶段配置了 `maxCredits`；未配置时当前实现拒绝选课。
5. 校验开课状态必须为 `OPEN`，课程状态必须为 `ACTIVE`。
6. 查询 `studentId + courseOfferingId` 唯一选课记录；已存在 `ENROLLED` 时返回幂等结果或重复选课错误。
7. 校验容量：先检查 `enrolledCount < capacity`，写入时再用条件更新防止并发超选。
8. 查询学生当前学期已选课程，使用 `Schedule` 的周次、星期和节次判断时间冲突。
9. 汇总当前已选学分和目标课程学分，校验不超过当前阶段最大学分。
10. 校验目标课程属于当前学生专业和年级匹配的培养方案。
11. 校验先修课：当前实现能读取先修关系，但尚未接入 F 组成绩通过数据；存在先修课时返回未满足错误，不默认放行。
12. 在 Serializable 事务内创建新 `Enrollment` 或恢复 `DROPPED` 记录，并同步更新 `CourseOffering.enrolledCount`。
13. 事务冲突时最多重试 3 次；仍失败时返回并发准入限制错误。

退课由 `enrollmentService.dropEnrollment` 完成：校验当前用户为学生、目标记录属于本人、当前阶段允许退课；成功后将状态置为 `DROPPED`、写入 `droppedAt`，并减少开课已选人数。当前实现只允许第二轮和调整阶段退课，初选阶段退课策略仍为 TODO。

### 9.3 C AI 辅助选课流程【C 组重点写】

当前 AI 辅助选课只完成接口和前端入口预留，后端推荐与解释逻辑未实现。

1. 学生进入 `/selection/ai` 页面，填写推荐数量等参数。
2. 前端调用 `/api/v1/course-selection/ai-advisor/recommend` 或 `/api/v1/course-selection/ai-advisor/explain`。
3. 后端校验学生角色和请求体，但 `aiAdvisorService.recommend`、`aiAdvisorService.explain` 当前返回 `null`。
4. 控制器将空结果转换为功能未实现响应，前端展示失败或降级提示。
5. 整个流程不读取或写入 AI 推荐持久化表，也不创建、修改或删除 `Enrollment`。

后续若实现 AI 推荐，输入应来自学生本人可见的培养方案、已选课程、可选课程、容量和课表信息；输出只能是推荐课程、推荐理由、风险提示和学分影响说明。学生最终选课必须继续调用普通选课接口，由 `enrollmentService` 重新执行全部硬性规则。

### 9.4 E 自动组卷与评分流程

#### 9.4.1 自动组卷流程

1. 教务管理人员或系统管理员先创建试卷，填写试卷标题、说明、总分、考试时长，以及可选的开始时间和结束时间。新建试卷默认为草稿状态，学生端暂时不可见。
2. 进入试卷配置后，管理人员可以选择手动组卷或自动组卷。手动组卷由管理人员从指定题库中选择一道或多道题目，系统按照加入顺序形成试卷题目顺序。
3. 自动组卷由管理人员设置筛选条件，包括题库范围、题型、难度、题干关键词、抽题数量和每题分值等；单次自动抽题数量应控制在需求规定范围内。
4. 系统根据筛选条件从题库中随机选取符合要求、且尚未加入当前试卷的题目，避免同一试卷中重复出现相同题目。
5. 若管理人员设置了统一分值，系统按统一分值计算每题得分；若未设置，则沿用题目在题库中的默认分值。组卷完成后，系统展示实际加入数量、试卷当前包含的题目、顺序和分值，供管理人员继续调整。
6. 试卷发布前，系统检查试卷中是否至少包含一道题。发布后学生才可以开始答题；关闭试卷后，学生不能再进入新的答题过程。

#### 9.4.2 答题与计时流程

1. 学生在试卷列表中选择已发布试卷，调用开始答题接口。
2. 后端检查学生角色、试卷状态、考试时间窗口，以及该学生是否已有已评分记录。
3. 如果学生已经开始过该试卷但尚未交卷，系统恢复原有答题会话；如果是首次进入，则创建新的答题记录。
4. 系统只向学生返回题干和选项，不返回正确答案或正确选项标记，避免前端暴露答案。
5. 前端根据考试时长和试卷结束时间计算剩余时间，并在浏览器本地临时保存未提交答案，刷新页面后可恢复答题进度。
6. 倒计时归零时前端自动触发交卷；学生主动点击交卷时，若存在未作答题目，先弹出确认提示。

#### 9.4.3 自动评分流程

1. 学生交卷时，前端按试卷题目顺序提交每道题的作答内容。
2. 后端读取该试卷的标准答案和每题分值，逐题进行判分。
3. 单选题和判断题采用直接比对规则：学生选择的选项与标准答案一致即判为正确。
4. 多选题采用集合比对规则：系统忽略选项提交顺序，只判断学生选择的选项集合是否与标准答案集合完全一致。
5. 每题完全正确得该题满分，错误、漏选、多选或未作答均不得分。系统累计总分、答对题数、已判题数和答题用时。
6. 系统保存每题的学生答案、正确与否和得分，同时将本次答题状态更新为已评分，记录提交时间和总分。
7. 评分完成后，前端立即展示总分、正确率、用时和每题判分明细；学生和教师后续也可以在成绩查看页查询同一结果。

### 9.5 F 成绩分析流程【F 组重点写】

写作指引：
说明平均分、分布、排名、绩点、学分进展如何计算。

---

## 10. 安全、权限与异常处理设计【全组统一 + A-F 补充】

### 10.1 统一权限模型【A 组主写，全组确认】

写作指引：
说明角色、权限、资源之间的关系。建议画 RBAC 简图。

### 10.2 跨子系统权限控制

| 子系统 | 敏感操作 | 允许角色 | 控制方式 |
|---|---|---|---|
| A | 用户删除、权限修改 | 系统管理员/教务 | 权限校验 |
| B | 发布排课结果 | 教务管理人员 | 权限校验 |
| C | 学生选课/退课 | 学生本人 | Bearer Token + student 角色 + 当前用户学生档案 + 事务校验 |
| C | 教师名单查询/导出 | 任课教师 | Bearer Token + teacher 角色 + `CourseOffering.teacherId` 归属校验 |
| C | 选课阶段管理/手动加课 | 学术教务管理员 | admin/super_admin 路由入口 + `Admin.adminType = ACADEMIC` 服务层校验 + SystemLog |
| C | AI 推荐/解释 | 学生 | Bearer Token + student 角色；当前未实现且不得写入 Enrollment |
| E | 题库维护、题目维护、试卷创建/组卷/发布/关闭 | 教务管理人员/系统管理员 | Bearer Token + 角色校验 + 请求日志 |
| E | 查看整卷学生测试成绩 | 教师/教务管理人员/系统管理员 | Bearer Token + 角色校验 + 请求日志 |
| E | 开始答题、提交试卷 | 学生 | Bearer Token + 学生身份校验 + 防重复提交 |
| F | 修改成绩 | 教师/审核者 | 申请流程 + 日志 |

### 10.3 异常处理设计

写作指引：
统一说明异常返回、错误提示、日志记录。

建议异常类型：
- 参数错误。
- 权限不足。
- 数据不存在。
- 数据冲突。
- 容量已满。
- 时间冲突。
- 重复提交。
- 系统内部错误。

#### 10.3.1 C 组异常处理补充

| 异常类型 | 触发场景 | 处理方式 |
|---|---|---|
| 参数错误 | 非 UUID、非法阶段、非法分页、缺少手动加课原因 | schema 层拒绝请求，返回统一校验错误 |
| 权限不足 | 学生访问他人记录、教师访问非本人开课、非学术教务执行阶段管理或手动加课 | 服务层返回 403，不泄露他人数据 |
| 阶段关闭 | 当前服务器时间不在启用 `SelectionPeriod` 窗口内 | 返回 `CS_PERIOD_CLOSED`，不写入选课记录 |
| 容量已满 | `enrolledCount >= capacity` 或条件更新失败 | 返回 `CS_OFFERING_FULL`，不增加容量计数 |
| 重复选课 | 同一学生对同一开课已有有效记录 | 返回 `CS_DUPLICATE_ENROLLMENT`；带幂等键时可返回已有结果 |
| 时间冲突 | 目标开课 `Schedule` 与本人已选课程重叠 | 返回 `CS_SCHEDULE_CONFLICT` 和冲突说明 |
| 超过学分 | 已选学分加目标课程学分超过阶段上限 | 返回 `CS_MAX_CREDITS_EXCEEDED` |
| 先修课未满足 | 目标课程存在先修课且当前未接入成绩通过判断 | 返回 `CS_PREREQUISITE_NOT_MET`，不默认放行 |
| 并发事务冲突 | Serializable 事务重试后仍失败 | 返回 `CS_ADMISSION_LIMITED` |
| AI 不可用 | 推荐或解释服务当前未实现 | 返回未实现/不可用响应，不影响普通选课流程 |

---

## 11. 部署设计【全组统一写】

### 11.1 部署结构

写作指引：
说明前端、后端、数据库、AI 服务、文件存储部署在哪里。

### 11.2 运行环境

| 项目 | 说明 |
|---|---|
| 操作系统 |  |
| Web 服务器 |  |
| 后端运行环境 |  |
| 数据库 |  |
| 浏览器 |  |
| 其他依赖 |  |

### 11.3 构建与发布流程

写作指引：
简单说明如何构建、如何启动、如何初始化数据库、如何导入测试数据。

---

## 12. 需求到设计追踪矩阵【A-F 分组填写，统一整合】

| 需求编号 | 需求名称 | 设计类/组件 | 接口 | 数据表 | 页面 |
|---|---|---|---|---|---|
| FR-A-01 | 用户基本信息管理 | UserService | /api/users | users | 用户管理页 |
| FR-B-02 | 自动排课 | ScheduleService | /api/schedules/generate | schedules | 自动排课页 |
| FR-C-01 | 本人培养方案查询 | curriculumService、CreditProgressCard | `/api/v1/course-selection/curriculum/me` | students, curriculums, curriculum_courses, courses | 培养方案页 |
| FR-C-02 | 学分进展查询 | curriculumService、CreditProgressCard | `/api/v1/course-selection/curriculum/me/progress` | enrollments, course_offerings, courses, curriculums | 培养方案页 |
| FR-C-03 | 课程目录搜索 | courseSearchService | `/api/v1/course-selection/courses` | courses, teachers, course_offerings | 课程列表与选课页 |
| FR-C-04 | 开课列表与详情 | courseSearchService、CourseDetailDrawer | `/api/v1/course-selection/offerings`, `/api/v1/course-selection/offerings/:id` | course_offerings, courses, schedules, teachers, semesters | 课程列表与选课页 |
| FR-C-05 | 可选课程判断 | courseSearchService、CourseOfferingTable | `/api/v1/course-selection/offerings/available` | course_offerings, enrollments, schedules, curriculum_courses | 课程列表与选课页 |
| FR-C-06 | 学生选课事务 | enrollmentService | `/api/v1/course-selection/enrollments` | enrollments, course_offerings, selection_periods, schedules | 课程列表与选课页 |
| FR-C-07 | 学生退课事务 | enrollmentService | `/api/v1/course-selection/enrollments/:id/drop` | enrollments, course_offerings, selection_periods | 课程列表与选课页 |
| FR-C-08 | 本人选课结果查询 | enrollmentResultsService | `/api/v1/course-selection/enrollments/me` | enrollments, course_offerings, courses, semesters | 课程列表与选课页、我的课表页 |
| FR-C-09 | 本人课表查询与打印 | timetableService、TimetableGrid | `/api/v1/course-selection/timetable/me` | enrollments, course_offerings, schedules | 我的课表页 |
| FR-C-10 | 教师课程名单查询 | rosterService | `/api/v1/course-selection/teacher/offerings/:id/roster` | course_offerings, enrollments, students | 课程名单页 |
| FR-C-11 | 教师名单导出 | rosterService、roster-export.util | `/api/v1/course-selection/teacher/offerings/:id/roster/export` | course_offerings, enrollments, students | 课程名单页 |
| FR-C-12 | 选课阶段管理 | selectionPeriodService、SelectionPeriodStatusTag | `/api/v1/course-selection/admin/periods`, `/api/v1/course-selection/admin/periods/:id` | selection_periods, semesters, system_logs | 阶段管理页 |
| FR-C-13 | 教务手动加课 | selectionPeriodService | `/api/v1/course-selection/admin/enrollments` | enrollments, course_offerings, students, system_logs | 手动加课页 |
| FR-C-14 | AI 辅助选课接口预留 | aiAdvisorService、AiAdvisorPanel | `/api/v1/course-selection/ai-advisor/recommend`, `/api/v1/course-selection/ai-advisor/explain` | 无新增持久化表 | AI 推荐页 |
| FR-C-15 | 连接控制与空闲释放预留 | selectionPeriodService TODO | 暂无已实现接口 | 暂无新增表 | 阶段管理页 |
| FR-C-16 | C 组统一接口契约 | course-selection.routes、course-selection.schemas | `/api/v1/course-selection/*` | C 组相关表 | C 组所有页面 |
| FR-E-01 | 题库管理 | QuestionBankService | /online-testing/question-banks | question_banks | 题目管理页 |
| FR-E-02 | 题目管理 | QuestionBankService | /online-testing/questions | questions, question_options | 题目管理页 |
| FR-E-03 | 试卷基础信息管理 | PaperGenerationService | /online-testing/test-papers, /online-testing/test-papers/:id | test_papers | 组卷管理页 |
| FR-E-04 | 试卷组卷 | PaperGenerationService | /online-testing/test-papers/:id/questions, /online-testing/test-papers/:id/auto-generate | test_papers, test_questions, questions | 组卷管理页 |
| FR-E-05 | 试卷发布与关闭 | PaperLifecycleService | /online-testing/test-papers/:id/publish, /online-testing/test-papers/:id/close | test_papers | 组卷管理页/试卷列表页 |
| FR-E-06 | 学生在线答题 | TestSessionService | /online-testing/test-papers/:id/start | test_papers, test_questions, test_results | 在线答题页 |
| FR-E-07 | 考试计时与作答约束 | TestSessionService | /online-testing/test-papers/:id/start | test_papers, test_results | 在线答题页 |
| FR-E-08 | 自动评分 | AutoGradingService | /online-testing/test-results/:id/submit | answers, test_results, test_questions, questions | 在线答题页/答题结果页 |
| FR-E-09 | 个人测试成绩查询 | TestStatisticService | /online-testing/test-results/my, /online-testing/test-results/:id | test_results, answers | 成绩查看页 |
| FR-E-10 | 试卷测试成绩查看 | TestStatisticService | /online-testing/test-papers/:id/results, /online-testing/test-results/:id | test_results, answers, users | 试卷成绩页/成绩查看页 |

写作指引：  
这是检查设计完整性的表。每条核心需求应至少能追踪到组件、接口、数据和页面。

---

## 13. 设计风险与改进点【全组统一写，A-F 补充】

| 风险编号 | 风险描述 | 影响范围 | 应对策略 |
|---|---|---|---|
| R-01 | A-F 数据模型不统一 | 全系统 | 统一核心类和字段命名 |
| R-02 | 自动排课算法复杂度较高 | B | 先实现可运行版本，再优化 |
| R-03 | 选课并发可能导致容量超卖 | C | 当前学生选课使用 Serializable 事务、条件更新和重试；仍需压测验证高峰表现 |
| R-C-01 | AI 推荐与解释后端尚未实现 | C | 当前文档和页面均标注为未实现；后续实现时必须保持 AI 不直接写 `Enrollment` |
| R-C-02 | Redis 连接控制、心跳和无操作释放尚未实现 | C | 作为 C5 TODO 和风险记录，不作为当前验收通过项 |
| R-C-03 | 先修课通过判断尚未接入 F 组成绩数据 | C、F | 当前存在先修课时阻断选课；后续需与 F 组确定通过课程数据来源 |
| R-C-04 | 培养方案确认和公共课最低要求未完整建模 | C、A | 当前确认状态为非持久化返回，公共课要求以提示表达；后续需确认是否扩展已有数据模型 |
| R-C-05 | 200 在线用户目标未附压测证据 | C | 后续需在 Docker 环境补充压测或降级说明 |
| R-E-01 | 在线答题重复提交或刷新页面导致答案丢失 | E | 使用 test_results 状态限制重复提交，前端 sessionStorage 暂存未提交答案 |
| R-E-02 | 自动组卷条件过窄导致抽题数量不足 | E | 接口返回实际加入数量，教师可调整题型、难度、关键词或改用手动加题 |
| R-E-03 | 客观题自动评分只能处理固定答案格式 | E | 后端统一多选答案排序比较，后续若扩展主观题需引入人工阅卷状态 |
| R-04 | 成绩修改缺少审计会影响可信度 | F | 引入修改申请和日志 |

---

## 14. 附录

### 14.1 UML 图清单

| 图名 | 所属章节 | 负责人 |
|---|---|---|
| 总体架构图 | 3 |  |
| 核心类图 | 4 |  |
| A 子系统类图 | 4.2 | A 组 |
| B 子系统组件图 | 8.2 | B 组 |
| C 智能选课类图 | 4.4 | C 组 |
| C 选课事务流程图 | 9.2 | C 组 |
| C AI 辅助接口状态说明 | 9.3 | C 组 |

### 14.2 设计评审记录

| 日期 | 评审内容 | 参与者 | 问题 | 处理结果 |
|---|---|---|---|---|
