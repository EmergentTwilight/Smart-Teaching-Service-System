---
title: STSS Design Report

---

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
| C | 智能选课 | C 组 |  | 培养方案、选课、AI 辅助 |
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

### 4.4 C 智能选课数据/类设计【C 组填写】

#### 4.4.1 主要设计类

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

#### 4.4.2 关系说明

学生通过 `Student.majorId` 和 `Student.grade` 匹配 `Curriculum`。培养方案通过 `CurriculumCourse` 关联课程并保存课程类型和建议修读学期。`CourseOffering` 关联课程、学期、教师和排课时间，`Enrollment` 关联学生与课程开设。

选课事务以 `Enrollment` 与 `CourseOffering.enrolledCount` 一致为核心。创建或恢复有效选课记录时增加已选人数，退课时把记录置为 `DROPPED` 并减少已选人数。时间冲突来自目标开课和本人已选开课的 `Schedule` 重叠判断，最大学分由当前开放阶段的 `SelectionPeriod.maxCredits` 控制。

当前无 AI 推荐结果表、连接队列表、手动加课申请表或培养方案确认表。

### 4.5 D 论坛交流数据/类设计【D 组填写】

D 论坛交流子系统围绕课程开设 `CourseOffering` 建立讨论空间。系统不单独维护 Forum 实体，而是以“课程开设 + 帖子集合”的方式表达课程论坛；公告、普通帖子、评论、附件和统计均围绕 `ForumPost` 展开。

#### 4.5.1 主要设计类

| 类名 | 职责 | 主要属性 | 主要方法/行为 |
|---|---|---|---|
| ForumPost | 表示课程论坛中的帖子或公告 | id, courseOfferingId, authorId, title, content, postType, isPinned, isAnnouncement, viewCount, status, createdAt, updatedAt | 创建帖子、编辑帖子、查询详情、软删除、置顶、浏览量递增 |
| ForumComment | 表示帖子下的评论和楼中楼回复 | id, postId, authorId, parentId, content, depth, status, createdAt | 创建评论、构建评论树、删除本人评论、隐藏/恢复违规评论 |
| ForumAttachment | 表示帖子附件或发帖前临时附件 | id, postId, fileName, filePath, fileSize, fileType, uploadedAt | 上传附件、批量上传、绑定帖子、删除附件、供前端下载 |
| Announcement | 公告视图对象，复用 ForumPost | isAnnouncement=true, postType=ANNOUNCEMENT, isPinned | 发布公告、更新公告、删除公告、按课程优先展示置顶公告 |
| SearchQuery | 帖子检索条件对象 | keyword, courseOfferingId, authorId, postType, startDate, endDate, page, pageSize, sortBy | 校验检索参数、组合查询条件、分页返回结果 |
| ForumStatistic | 统计结果对象 | totalPosts, totalComments, totalAttachments, activeUsers, hotPosts, courseActivity | 综合统计、热帖排行、用户统计、课程活跃度统计、CSV 导出 |
| ForumPermission | 论坛权限判断对象 | userId, roles, authorId, courseOfferingId | 判断作者本人、教师、论坛管理员、教务管理员和系统管理员的操作边界 |

#### 4.5.2 关系说明

`ForumPost` 与 `CourseOffering` 为多对一关系，同一课程开设下可以包含多条帖子和公告；`ForumPost.authorId` 关联 A 子系统的用户身份，用于展示作者和进行本人权限判断。公告不单独建表，而是通过 `ForumPost.isAnnouncement` 和 `PostType.ANNOUNCEMENT` 区分，避免公告与普通帖子在查询、置顶、权限和统计上产生重复模型。

`ForumComment` 与 `ForumPost` 为多对一关系，评论通过 `parentId` 自关联形成树形回复结构，并用 `depth` 辅助前端缩进展示。删除帖子时评论随帖子级联删除；普通用户可删除本人评论，管理员或论坛管理员可隐藏和恢复评论。普通评论列表只返回 `NORMAL` 状态内容，隐藏或删除内容不会继续污染普通用户视图。

`ForumAttachment` 与 `ForumPost` 为可选多对一关系。附件上传后可以先以 `postId = null` 保存，待用户提交帖子时再批量绑定到帖子；如果用户取消发帖，可删除未绑定附件。附件元数据保存文件名、路径、大小和 MIME 类型，实际文件存放在后端上传目录中。

当前检索采用数据库标题/正文关键词匹配，并叠加课程、作者、帖子类型、时间范围和排序条件；不单独维护搜索索引表。统计类不作为独立持久化表，而是基于 `forum_posts`、`forum_comments`、`forum_attachments` 和课程/用户关联实时聚合生成。

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

### 5.4 C 智能选课数据表【C 组填写】

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

### 5.5 D 论坛交流数据表【D 组填写】

| 表名 | 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| forum_posts | id, course_offering_id, author_id, title, content, post_type, is_pinned, is_announcement, view_count, status, created_at, updated_at | UUID/String, VarChar(200), Text, Enum, Boolean, Int, DateTime | id 主键；关联 course_offerings 和 users；post_type 为 QUESTION、DISCUSSION、SHARE、ANNOUNCEMENT；status 默认为 NORMAL | 保存课程论坛帖子和公告。公告通过 is_announcement 与 post_type 区分，删除采用状态变更方式，普通列表不展示 DELETED 内容 |
| forum_comments | id, post_id, author_id, parent_id, content, depth, status, created_at | UUID/String, Text, Int, Enum, DateTime | id 主键；关联 forum_posts 和 users；parent_id 自关联；帖子删除时级联删除评论 | 保存帖子评论和楼中楼回复。depth 用于构建评论层级，status 用于隐藏、恢复和删除控制 |
| forum_attachments | id, post_id, file_name, file_path, file_size, file_type, uploaded_at | UUID/String, VarChar, BigInt, DateTime | id 主键；post_id 可为空并关联 forum_posts；帖子删除时级联删除附件记录 | 保存附件元数据。上传后可先作为未绑定附件存在，发帖成功后绑定到帖子；物理文件保存在上传目录 |
| users | id, username, real_name, roles | UUID/String, VarChar | A 子系统维护，论坛只引用 | 用于论坛作者展示、角色判断和本人/管理员权限校验 |
| course_offerings | id, course_id, semester_id, teacher_id, status | UUID/String, Enum | C/B/A 子系统维护，论坛只引用 | 表示课程论坛所属开课实例，用于按课程过滤帖子、公告、统计和检索结果 |

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

### 6.4 C 智能选课接口【C 组填写】

#### 6.4.1 接口约定

| 项 | 约定 |
|---|---|
| Base URL | `/api/v1/course-selection` |
| 认证 | JWT Bearer Token |
| 字段命名 | 外部请求和响应使用 `snake_case`；服务层使用 camelCase |
| 分页 | `page` 从 1 开始，`page_size` 默认 20，最大 100；名单默认 50 |
| 时间 | ISO 8601，阶段判断以服务器时间为准 |
| 学生身份 | 从认证上下文解析，不接受选课请求中的 `student_id` |

#### 6.4.2 接口列表

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


### 6.5 D 论坛交流接口【D 组填写】

论坛接口统一前缀为 `/api/v1/forum`，所有接口先经过 A 子系统 JWT 认证中间件。普通帖子、评论、附件、检索和热帖查询面向登录用户；公告写操作、置顶、隐藏评论、统计和导出按角色进一步限制。

| 接口名称 | 方法 | 路径 | 输入 | 输出 | 权限 |
|---|---|---|---|---|---|
| 创建帖子 | POST | `/posts` | courseOfferingId, title, content, postType, attachmentIds | 帖子详情 | 登录用户 |
| 帖子列表 | GET | `/posts` | page, pageSize, courseOfferingId, keyword, postType, authorId, isAnnouncement, sortBy, sortOrder | 帖子分页列表 | 登录用户 |
| 帖子详情 | GET | `/posts/:id` | postId | 帖子详情、作者、课程、附件、评论统计 | 登录用户 |
| 编辑帖子 | PATCH | `/posts/:id` | title, content, postType, attachmentIds, isPinned, isAnnouncement | 更新后的帖子 | 作者本人、教师、admin、forum_admin |
| 删除帖子 | DELETE | `/posts/:id` | postId | 删除结果 | 作者本人、教师、admin、forum_admin |
| 置顶/取消置顶 | PATCH | `/posts/:id/pin` | pinned | 更新后的帖子 | teacher、admin、forum_admin |
| 创建评论 | POST | `/posts/:id/comments` | content, parentId | 评论详情 | 登录用户 |
| 评论列表 | GET | `/posts/:id/comments` | postId | 树形评论列表 | 登录用户 |
| 删除评论 | DELETE | `/comments/:id` | commentId | 删除结果 | 评论作者、教师、admin、forum_admin |
| 隐藏评论 | PATCH | `/comments/:id/hide` | commentId | 隐藏结果 | admin、forum_admin |
| 恢复评论 | PATCH | `/comments/:id/restore` | commentId | 恢复结果 | admin、forum_admin |
| 隐藏评论列表 | GET | `/comments/hidden` | courseOfferingId, page, pageSize | 隐藏评论分页列表 | admin、forum_admin、teacher |
| 创建公告 | POST | `/announcements` | courseOfferingId, title, content, isPinned | 公告详情 | teacher、admin、forum_admin |
| 公告列表 | GET | `/announcements` | courseOfferingId, page, pageSize | 公告分页列表 | 登录用户 |
| 编辑公告 | PATCH | `/announcements/:id` | title, content, isPinned | 更新后的公告 | teacher、admin、forum_admin |
| 删除公告 | DELETE | `/announcements/:id` | announcementId | 删除结果 | teacher、admin、forum_admin |
| 帖子检索 | GET | `/search` | keyword, courseOfferingId, authorId, postType, startDate, endDate, page, pageSize, sortBy | 搜索分页结果 | 登录用户 |
| 综合统计 | GET | `/stats` | courseOfferingId, startDate, endDate, period | 帖子数、评论数、附件数、活跃用户数和趋势 | admin、teacher、forum_admin、academic_admin |
| 热帖排行 | GET | `/stats/hot-posts` | period, courseOfferingId, limit | 热门帖子列表 | 登录用户 |
| 用户统计 | GET | `/stats/user`, `/stats/user/:userId` | userId | 发帖数、评论数、公告数 | 本人、teacher、admin、forum_admin、academic_admin |
| 课程活跃度统计 | GET | `/stats/course-activity` | courseOfferingId, startDate, endDate | 课程活跃度列表 | admin、teacher、forum_admin、academic_admin |
| 统计导出 | GET | `/stats/export` | courseOfferingId, startDate, endDate, period | CSV 文件 | admin、academic_admin |
| 上传附件 | POST | `/attachments` | fileName, fileType, fileSize, contentBase64 | 附件 id、文件名、大小、类型、下载路径 | 登录用户 |
| 批量上传附件 | POST | `/attachments/batch` | files[] | 附件结果列表 | 登录用户 |
| 删除附件 | DELETE | `/attachments/:id` | attachmentId | 删除结果 | 上传者/帖子作者、admin、forum_admin |

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

### 7.4 C 智能选课界面【C 组填写】

| 页面 | 路由 | 使用角色 | 用途 | 主要字段/控件 | 主要操作与异常提示 |
|---|---|---|---|---|---|
| 课程列表与选课页 | `/selection/courses` | 学生 | 搜索可选课程、查看详情、选课或退课 | keyword、teacher、courseType、offeringStatus、includeUnavailable、课程表格、详情抽屉、确认弹窗 | 查询、详情、确认选退课；显示后端业务错误 |
| 培养方案页 | `/selection/curriculum` | 学生 | 查看培养方案、课程分组和学分进展 | 培养方案信息、课程分组、建议学期、CreditProgressCard | 无档案/无方案时显示错误；确认状态只展示后端提示 |
| 我的课表页 | `/selection/timetable` | 学生 | 查看和打印本人课表 | semesterId、查询/重置/刷新/打印、TimetableGrid | 查询失败、无选课、缺少排课均有提示 |
| AI 推荐页 | `/selection/ai` | 学生 | 展示 AI 推荐入口 | 推荐数量、推荐按钮、AiAdvisorPanel、解释结果 | 支持成功/降级提示，不改变选课记录 |
| 阶段管理页 | `/selection/admin/periods` | admin、super_admin | 管理选课阶段 | 学期、阶段、开始/结束时间、最大学分、是否启用 | 创建/更新阶段；后端拒绝非法时间、重叠和非 ACADEMIC 管理员 |
| 手动加课页 | `/selection/admin/manual-enrollment` | admin、super_admin | 为学生手动加课 | studentId、courseOfferingId、reason、notifyStudent | 原因为必填；成功后显示记录、容量和审计结果 |
| 教师课程名单页 | `/selection/teacher/roster` | 教师 | 查询和导出本人课程名单 | offeringId、keyword、status、名单表格、导出按钮 | 非本人开课返回 403；导出后端 Excel |

### 7.5 D 论坛交流界面【D 组填写】

| 页面 | 路由 | 使用角色 | 用途 | 主要字段/控件 | 主要操作与异常提示 |
|---|---|---|---|---|---|
| 课程论坛首页 | `/forum/posts` | 学生、教师、论坛管理员 | 展示课程论坛入口、公告摘要、帖子列表和热帖 | 课程选择器、关键词输入、帖子类型筛选、排序、公告横幅、帖子卡片、分页 | 切换课程、搜索、进入详情、发帖；无课程、无帖子、加载失败时显示空状态或错误提示 |
| 帖子编辑页 | `/forum/posts/new`, `/forum/posts/:postId/edit` | 学生、教师、论坛管理员 | 发布或编辑提问、讨论、分享类帖子 | 课程论坛、帖子类型、标题、正文、附件上传列表 | 新建/保存帖子、上传/删除附件；标题为空、正文为空、附件过大或类型不支持时提示具体原因 |
| 帖子详情页 | `/forum/posts/:postId` | 学生、教师、论坛管理员 | 查看帖子正文、附件、评论树并参与讨论 | 标题、作者、课程、正文、附件列表、评论编辑器、评论列表、置顶/编辑/删除按钮 | 评论、回复、下载附件、编辑/删除本人帖子；帖子不存在、已删除或无权访问时显示明确错误 |
| 帖子检索页 | `/forum/search` | 学生、教师、论坛管理员 | 按关键词和条件检索帖子 | keyword、课程、作者、帖子类型、时间范围、搜索结果列表 | 执行搜索、进入详情；关键词为空或无结果时显示表单错误或无相关帖子提示 |
| 我的发布页 | `/forum/my` | 学生、教师、论坛管理员 | 查看本人发帖统计和历史发布 | 用户统计卡片、本人帖子列表、编辑/删除入口 | 编辑、删除、查看本人帖子；无发布记录时显示空状态 |
| 公告列表页 | `/forum/announcements` | 学生、教师、论坛管理员 | 查看课程公告，教师和管理员可维护公告 | 课程选择器、公告列表、置顶标识、公告表单 | 查询公告、发布/编辑/删除公告；普通学生隐藏写操作，越权时以后端错误提示为准 |
| 论坛统计页 | `/forum/stats` | 教师、论坛管理员、教务管理人员、系统管理员 | 查看论坛综合统计、热帖和课程活跃度 | 时间范围、课程选择器、统计卡片、热帖排行、课程活跃度表、导出按钮 | 查询统计、导出 CSV；普通学生无入口，权限不足、时间范围非法或导出失败时显示错误提示 |

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

### 8.3 C 智能选课组件设计【C 组填写】

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


### 8.4 D 论坛交流组件设计【D 组填写】

| 组件 | 职责 | 输入 | 输出 | 依赖 |
|---|---|---|---|---|
| forum.routes | 挂载论坛接口并组合认证、角色控制 | HTTP 请求、JWT、params/query/body | 控制器响应或权限错误 | authMiddleware、requireRoles、requireSelfOrAdmin |
| ForumController | 解析请求、调用服务层、统一成功/失败响应 | Express Request、用户上下文、DTO | JSON 响应或 CSV 文件 | ForumService、response 工具 |
| ForumService | 论坛核心业务逻辑 | userId、帖子/评论/公告/附件/统计参数 | 帖子、评论、公告、附件、统计结果 | Prisma、A 组用户与课程数据 |
| forum.schemas | 请求参数校验 | query/body/params | 服务层 DTO 或校验错误 | zod |
| PostService 逻辑 | 帖子创建、列表、详情、编辑、删除、置顶 | courseOfferingId、title、content、postType、attachmentIds | ForumPost、分页列表 | forum_posts、forum_attachments |
| CommentService 逻辑 | 评论和楼中楼回复管理 | postId、content、parentId、commentId | ForumComment、评论树 | forum_comments、forum_posts |
| AnnouncementService 逻辑 | 公告发布、查询、编辑和删除 | courseOfferingId、title、content、isPinned | 公告列表或公告详情 | forum_posts(isAnnouncement) |
| AttachmentService 逻辑 | Base64 附件上传、批量上传、删除和绑定 | fileName、fileType、fileSize、contentBase64、attachmentIds | 附件元数据、删除结果 | 文件系统、forum_attachments |
| SearchService 逻辑 | 标题/正文关键词检索和筛选 | keyword、课程、作者、类型、时间范围、分页排序 | 搜索分页结果 | forum_posts、users、course_offerings |
| ForumStatisticService 逻辑 | 综合统计、热帖、用户统计、课程活跃度和导出 | 时间范围、课程、用户、period、limit | 统计卡片、排行、CSV | forum_posts、forum_comments、forum_attachments |
| forumApi | 前端论坛 API 封装 | 页面参数、表单数据、附件数据 | Promise 业务结果 | request、axios、JWT token |
| CourseForumSelector | 课程论坛选择控件 | selectedCourseOfferingId、onChange | courseOfferingId | 课程活跃度/课程接口数据 |
| AttachmentUpload / AttachmentList | 附件上传、展示、删除和下载 | File、附件列表、onChange | 附件 id 列表、用户反馈 | forumApi.attachments、浏览器下载 |
| PostCard / PostFilters / PostTypeTag | 帖子列表展示和筛选 | ForumPost、筛选条件 | 点击、筛选和排序事件 | Ant Design、forum constants |
| CommentEditor / CommentList | 评论输入和树形评论展示 | content、ForumComment[]、回调 | 评论提交、回复、删除事件 | forumApi.comments |
| StatFilter | 统计筛选区域 | courseOfferingId、startDate、endDate、period | 查询条件 | CourseForumSelector、日期控件 |

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

#### 9.2.1 学生选课事务流程

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

#### 9.2.2 学生退课流程

退课校验当前用户为学生、目标记录属于本人、当前阶段允许退课。成功后把 `Enrollment.status` 更新为 `DROPPED`，写入 `droppedAt`，并减少开课已选人数。当前实现只允许第二轮和调整阶段退课，初选阶段退课策略仍为 TODO。

#### 9.2.3 选课阶段与手动加课流程

阶段创建和更新要求学术教务管理员身份，校验结束时间晚于开始时间、学期存在、同学期同阶段启用时间不重叠，并写入 `SystemLog`。手动加课要求填写原因，校验学生、课程开设、课程状态、容量、重复选课、时间冲突和最大学分，成功后创建或恢复选课记录、更新容量并写日志。

### 9.3 C AI 辅助选课流程

当前 AI 页面调用推荐或解释接口后，后端优先返回规则过滤后的候选 + LLM 推荐，LLM 不可用或校验失败时返回规则模板降级。该流程不写任何 AI 推荐数据，也不创建、修改或删除 `Enrollment`。输入来自学生本人可见的培养方案、已选课程、可选课程、容量和课表；输出建议仅包含推荐理由、风险提示和学分影响。正式选课仍必须走普通选课事务。

### 9.4 D 论坛发布、检索与统计流程

#### 9.4.1 发帖与附件绑定流程

1. 用户进入发帖页，前端读取登录态和可选课程论坛。
2. 用户选择课程开设、帖子类型，填写标题和正文。
3. 如选择附件，前端将文件转为 Base64，并提交文件名、大小、MIME 类型和内容。
4. 后端校验附件大小、扩展名和 MIME 类型，写入物理文件，并在 `forum_attachments` 中创建 `post_id = null` 的附件记录。
5. 用户提交帖子时，后端校验标题、正文、帖子类型、课程开设和当前用户身份。
6. 后端在事务中创建 `forum_posts` 记录，并把本次提交携带的附件 id 批量绑定到新帖子。
7. 前端跳转到帖子详情或刷新列表；如果发帖失败，已上传但未绑定的附件仍可由用户在编辑界面删除。

#### 9.4.2 评论树与内容管理流程

1. 用户打开帖子详情，后端校验帖子存在且状态不是 `DELETED`。
2. 查询该帖子下 `NORMAL` 状态评论，按照父子关系构建树形结构返回前端。
3. 用户提交评论时，后端校验内容长度；若传入 `parentId`，还要校验父评论存在、未删除且属于同一帖子。
4. 评论保存后，前端重新拉取评论列表和帖子评论数。
5. 评论作者可删除本人评论；管理员或论坛管理员可隐藏、恢复违规评论。
6. 普通评论树不展示 `HIDDEN` 和 `DELETED` 评论，隐藏评论列表仅对授权角色开放。

#### 9.4.3 检索与统计流程

帖子检索不单独维护搜索索引表，而是基于 `forum_posts.title` 和 `forum_posts.content` 做关键词匹配，并叠加课程、作者、帖子类型、时间范围和排序条件。检索结果只返回可见帖子，并分页返回标题、摘要、作者、课程、浏览量和评论数；无结果时前端展示空状态。

统计功能基于有效帖子、有效评论和附件记录实时聚合。综合统计返回帖子数、评论数、附件数和活跃用户数；热帖排行结合浏览量、评论数和时间范围生成；课程活跃度按照帖子数、评论数和参与人数计算；导出功能将授权范围内的课程活跃度结果生成 CSV 文件。

### 9.5 E 自动组卷与评分流程

#### 9.5.1 自动组卷流程

1. 教务管理人员或系统管理员先创建试卷，填写试卷标题、说明、总分、考试时长，以及可选的开始时间和结束时间。新建试卷默认为草稿状态，学生端暂时不可见。
2. 进入试卷配置后，管理人员可以选择手动组卷或自动组卷。手动组卷由管理人员从指定题库中选择一道或多道题目，系统按照加入顺序形成试卷题目顺序。
3. 自动组卷由管理人员设置筛选条件，包括题库范围、题型、难度、题干关键词、抽题数量和每题分值等；单次自动抽题数量应控制在需求规定范围内。
4. 系统根据筛选条件从题库中随机选取符合要求、且尚未加入当前试卷的题目，避免同一试卷中重复出现相同题目。
5. 若管理人员设置了统一分值，系统按统一分值计算每题得分；若未设置，则沿用题目在题库中的默认分值。组卷完成后，系统展示实际加入数量、试卷当前包含的题目、顺序和分值，供管理人员继续调整。
6. 试卷发布前，系统检查试卷中是否至少包含一道题。发布后学生才可以开始答题；关闭试卷后，学生不能再进入新的答题过程。

#### 9.5.2 答题与计时流程

1. 学生在试卷列表中选择已发布试卷，调用开始答题接口。
2. 后端检查学生角色、试卷状态、考试时间窗口，以及该学生是否已有已评分记录。
3. 如果学生已经开始过该试卷但尚未交卷，系统恢复原有答题会话；如果是首次进入，则创建新的答题记录。
4. 系统只向学生返回题干和选项，不返回正确答案或正确选项标记，避免前端暴露答案。
5. 前端根据考试时长和试卷结束时间计算剩余时间，并在浏览器本地临时保存未提交答案，刷新页面后可恢复答题进度。
6. 倒计时归零时前端自动触发交卷；学生主动点击交卷时，若存在未作答题目，先弹出确认提示。

#### 9.5.3 自动评分流程

1. 学生交卷时，前端按试卷题目顺序提交每道题的作答内容。
2. 后端读取该试卷的标准答案和每题分值，逐题进行判分。
3. 单选题和判断题采用直接比对规则：学生选择的选项与标准答案一致即判为正确。
4. 多选题采用集合比对规则：系统忽略选项提交顺序，只判断学生选择的选项集合是否与标准答案集合完全一致。
5. 每题完全正确得该题满分，错误、漏选、多选或未作答均不得分。系统累计总分、答对题数、已判题数和答题用时。
6. 系统保存每题的学生答案、正确与否和得分，同时将本次答题状态更新为已评分，记录提交时间和总分。
7. 评分完成后，前端立即展示总分、正确率、用时和每题判分明细；学生和教师后续也可以在成绩查看页查询同一结果。

### 9.6 F 成绩分析流程【F 组重点写】

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
| C | 手动加课 | 教务管理人员 | 权限校验 + 日志 |
| D | 发布公告、置顶帖子、隐藏评论、导出统计、删除他人内容 | teacher、forum_admin、academic_admin、admin | JWT 认证 + 角色校验 + 作者本人/管理员关系校验 |
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

D 论坛子系统在统一异常模型下补充以下处理规则：帖子、公告、评论和附件不存在时返回明确的资源不存在错误；普通用户访问已删除帖子、删除他人内容、发布公告、置顶帖子、隐藏评论或导出统计时返回权限不足；标题、正文、评论内容、关键词、分页、日期范围和 UUID 参数非法时返回参数错误；附件类型不支持、大小超过限制、Base64 内容无法解析或物理文件写入失败时返回可展示的附件错误；检索无结果不作为异常，而由前端展示空状态。

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
| FR-D-01 | 课程公告管理 | AnnouncementService 逻辑、AnnouncementBanner | `/api/v1/forum/announcements` | forum_posts | 公告列表页、课程论坛首页 |
| FR-D-02 | 帖子发布与编辑 | PostService 逻辑、PostEditor | `/api/v1/forum/posts`, `/api/v1/forum/posts/:id` | forum_posts | 帖子编辑页、帖子详情页 |
| FR-D-03 | 附件上传、绑定与删除 | AttachmentService 逻辑、AttachmentUpload、AttachmentList | `/api/v1/forum/attachments`, `/api/v1/forum/attachments/batch`, `/api/v1/forum/attachments/:id` | forum_attachments | 帖子编辑页、帖子详情页 |
| FR-D-04 | 回帖与楼中楼回复 | CommentService 逻辑、CommentEditor、CommentList | `/api/v1/forum/posts/:id/comments` | forum_comments | 帖子详情页 |
| FR-D-05 | 评论管理 | CommentService 逻辑、CommentList | `/api/v1/forum/comments/:id`, `/api/v1/forum/comments/:id/hide`, `/api/v1/forum/comments/:id/restore`, `/api/v1/forum/comments/hidden` | forum_comments | 帖子详情页、隐藏评论列表 |
| FR-D-06 | 帖子列表与详情查看 | PostService 逻辑、PostCard、PostFilters | `/api/v1/forum/posts`, `/api/v1/forum/posts/:id` | forum_posts, forum_comments, forum_attachments | 课程论坛首页、帖子详情页 |
| FR-D-07 | 帖子置顶与软删除 | PostService 逻辑、ForumPermission | `/api/v1/forum/posts/:id/pin`, `/api/v1/forum/posts/:id` | forum_posts | 帖子详情页、课程论坛首页 |
| FR-D-08 | 帖子全文检索 | SearchService 逻辑、SearchResult | `/api/v1/forum/search` | forum_posts | 帖子检索页 |
| FR-D-09 | 综合统计与热帖排行 | ForumStatisticService 逻辑、StatsPage | `/api/v1/forum/stats`, `/api/v1/forum/stats/hot-posts` | forum_posts, forum_comments, forum_attachments | 论坛统计页、课程论坛首页 |
| FR-D-10 | 用户与课程活跃度统计 | ForumStatisticService 逻辑、StatFilter | `/api/v1/forum/stats/user`, `/api/v1/forum/stats/user/:userId`, `/api/v1/forum/stats/course-activity` | forum_posts, forum_comments | 我的发布页、论坛统计页 |
| FR-D-11 | 统计数据导出 | ForumStatisticService 逻辑、forumApi.exportStatsCsv | `/api/v1/forum/stats/export` | forum_posts, forum_comments, forum_attachments, course_offerings | 论坛统计页 |
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
| R-03 | 选课并发可能导致容量超卖 | C | 加事务或并发控制 |
| R-D-01 | 附件采用 Base64 上传会增加请求体体积，过大文件可能导致请求失败或内存压力 | D | 限制单文件 10MB、批量数量受控，并在后端配置请求体大小限制；后续可改为 multipart 或对象存储 |
| R-D-02 | 检索基于标题/正文模糊匹配，数据量增长后查询性能可能下降 | D | 当前通过分页、课程和时间范围筛选控制规模；后续可增加全文索引或独立搜索服务 |
| R-D-03 | 热帖和活跃度统计实时聚合，极端数据量下可能影响响应时间 | D | 控制统计时间范围和返回数量；后续可引入缓存或定时统计快照 |
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
| D 论坛交流类图/组件图 | 4.5、8.4 | D 组 |

### 14.2 设计评审记录

| 日期 | 评审内容 | 参与者 | 问题 | 处理结果 |
|---|---|---|---|---|
