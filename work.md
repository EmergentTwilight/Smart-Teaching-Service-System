# D 组 · 论坛交流子系统 — 前端分工与任务拆解（v2）

> **文档用途**：供 D 组两名前端同学参考，基于**已合并的后端代码**规划前端开发。  
> **最后更新**：2026-05-17  
> **当前工作分支**：`feat/D-frontend-post-ui-0517`（基于 `develop`，已 Fast-forward 合并 `origin/feat/D-announcement-attachment-0517`）  
> **依据**：`docs/project-requirements.md`、`docs/development-specifications.md`、`docs/database-design.md`、**实际代码** `backend/src/modules/forum/*`

---

## 〇、当前进度快照（请先读）

### 已完成（后端 · 同组同学）

| 来源分支 | 提交 | 作者 | 内容 |
| -------- | ---- | ---- | ---- |
| `feat/D-核心api-0422` | `059352f` | — | 论坛核心 API 骨架 |
| `feat/D-announcement-attachment-0517` | `7d584e7` | 邱立潮 | 公告、附件(Base64)、搜索、统计、评论管理、审计、RBAC 等完整实现 |

**挂载路径**：`app.use('/api/v1/forum', forumRoutes)` → 所有接口前缀为 **`/api/v1/forum`**（前端 `request` 的 `baseURL` 已含 `/api/v1`，调用时写 `/forum/...` 即可）。

**实现文件**：

```plaintext
backend/src/modules/forum/
├── forum.routes.ts      # 路由与权限
├── forum.controller.ts  # HTTP 处理
├── forum.service.ts     # 业务逻辑（约 1280 行）
├── forum.schemas.ts     # Zod 校验
└── forum.types.ts       # DTO / 响应类型（前端 types 应对齐此文件）
```

### 未完成（前端 · 你们两人）

| 项 | 状态 |
| -- | ---- |
| `frontend/src/modules/forum/` | ❌ 不存在 |
| `App.tsx` 论坛路由 | ❌ 仍为 `ComingSoon` |
| `menu.tsx` | ⚠️ 仅 3 项，缺少检索/统计/发帖入口 |
| `docs/apis/D-discussion-forum.md` | ⚠️ 仅写了帖子/评论部分，**远少于实际接口** |
| 消息通知 | ❌ **后端无对应 API**（见下文说明） |
| 课程开设下拉数据源 | ⚠️ **无独立「我的课程」接口**，需 workaround |

### 你们无需再做的事

- ❌ 不必再 merge `feat/D-核心api-0422`（已包含在 `0517` 分支中）
- ❌ 不必从零设计 REST 路径（以下第二节已按代码整理）
- ❌ P0 阶段不必写 MSW Mock（直接联调 Docker 后端即可）

---

## 一、项目背景与需求映射

### 1.1 职责边界

- **D 组子系统**：论坛交流（师生课程讨论、公告、检索、统计）。
- **你们**：仅 **前端**；后端由同组同学维护，有问题直接对照 `forum.routes.ts` / `forum.types.ts`。
- **Git**：在 `feat/D-frontend-post-ui-0517`（或后续 `feat/D-frontend-xxx`）开发 → 合并 `dev/D`（若组长创建）或组内约定分支 → 组长合 `develop`。
- **Commit**：`feat(D): add forum post list page` 等。

### 1.2 需求 ↔ 后端 ↔ 前端（确定版）

| 需求 | 后端能力（已实现） | 前端页面/组件 |
| ---- | ------------------ | ------------- |
| D-1 论坛公告 | `POST/GET/PATCH/DELETE /forum/announcements` | 列表顶栏 `AnnouncementBanner` + 教师「发布公告」页/抽屉 |
| D-2 发帖+附件 | `POST /forum/posts` + `POST /forum/attachments`（Base64） | `PostEditor`、先传附件再绑 `attachmentIds` |
| D-3 回帖留言 | `POST/GET /forum/posts/:id/comments`（返回**树形** `children`） | `CommentList`（可直接渲染，不必自己建树） |
| D-4 文章管理 | `/forum/stats*` 多套统计 + CSV 导出 | `ForumStats` 页（教师/管理员） |
| D-5 帖子检索 | `GET /forum/search` | `PostSearch` 页 |
| （菜单已有）消息通知 | **无 API** | P2：占位或砍掉菜单项 |

---

## 二、后端 API 清单（按实际代码，前端联调以此为准）

> 以下路径均相对于 `baseURL`（`/api/v1`），即前端写：`request.get('/forum/posts')`。  
> **全部路由需登录**（`authMiddleware`）。

### 2.1 帖子

| 方法 | 路径 | 权限/说明 |
| ---- | ---- | --------- |
| POST | `/forum/posts` | 发帖；body 见 §2.6 |
| GET | `/forum/posts` | 列表；query：`page`, `pageSize`, `courseOfferingId`, `keyword`, `postType`, `isAnnouncement`, `authorId`, `status`, `startDate`, `endDate`, `sortBy`, `sortOrder` |
| GET | `/forum/posts/:id` | 详情；**浏览量 +1** |
| PATCH | `/forum/posts/:id` | 作者或教师/管理员 |
| DELETE | `/forum/posts/:id` | 软删 |
| PATCH | `/forum/posts/:id/pin` | 教师/admin/forum_admin；body：`{ "pinned": true \| false }` |

**列表响应结构（重要）**：与 A 组用户列表不同，后端返回：

```json
{
  "code": 200,
  "data": {
    "data": [ /* 帖子数组 */ ],
    "pagination": { "page", "page_size", "total", "total_pages" }
  }
}
```

经 `request` 拦截器后，前端拿到的是 **`{ data: Post[], pagination }`**（camelCase），**不是** `{ items, pagination }`。封装 API 时请单独定义 `ForumPaginatedResult<T>`。

### 2.2 评论

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| POST | `/forum/posts/:id/comments` | body：`{ content, parentId? }` |
| GET | `/forum/posts/:id/comments` | 返回 **根评论数组**，每项含嵌套 `children`（服务端已建树） |
| DELETE | `/forum/comments/:id` | 软删 |
| PATCH | `/forum/comments/:id/hide` | admin / forum_admin |
| PATCH | `/forum/comments/:id/restore` | admin / forum_admin |
| GET | `/forum/comments/hidden` | admin / forum_admin / teacher；管理隐藏评论 |

### 2.3 公告（独立接口，非普通帖子 POST）

| 方法 | 路径 | 权限 |
| ---- | ---- | ---- |
| POST | `/forum/announcements` | teacher / admin / forum_admin |
| GET | `/forum/announcements` | 已登录；query：`page`, `pageSize`, `courseOfferingId` |
| PATCH | `/forum/announcements/:id` | 同上 |
| DELETE | `/forum/announcements/:id` | 同上 |

### 2.4 检索

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/forum/search` | 必填 `keyword`；可选 `courseOfferingId`, `authorId`, `postType`, `startDate`, `endDate`, `page`, `pageSize`, `sortBy`（`relevance` \| `createdAt` \| `viewCount`） |

### 2.5 统计（D-4）

| 方法 | 路径 | 权限 |
| ---- | ---- | ---- |
| GET | `/forum/stats` | 必填 `startDate`, `endDate`；可选 `courseOfferingId`, `period` |
| GET | `/forum/stats/hot-posts` | query：`period=week\|month`, `courseOfferingId?`, `limit?` |
| GET | `/forum/stats/user/:userId?` | 发文统计；省略 userId 时查自己 |
| GET | `/forum/stats/course-activity` | 课程活跃度（**可作课程下拉数据源之一**） |
| GET | `/forum/stats/export` | admin / academic_admin；返回 **CSV 文件流** |

### 2.6 附件（Base64，非 multipart）

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| POST | `/forum/attachments` | body：`{ fileName, fileType?, content }`，`content` 为 **Base64 字符串** |
| POST | `/forum/attachments/batch` | body：`{ files: [{ fileName, fileType?, content }, ...] }`，最多 10 个 |
| DELETE | `/forum/attachments/:id` | 删附件及磁盘文件 |

**发帖绑附件流程（确定）**：

1. `POST /forum/attachments` 上传 → 拿到 `id`
2. `POST /forum/posts` 时传 `attachmentIds: [id, ...]`
3. 单文件 ≤ **10MB**；允许类型见 `forum.controller.ts`（图片、pdf、doc/docx、xls/xlsx、txt、md）

### 2.7 枚举与角色（前端常量）

**PostType**（Prisma）：`QUESTION` | `DISCUSSION` | `SHARE` | `ANNOUNCEMENT`

**PostStatus**：`NORMAL` | `HIDDEN` | `DELETED`（列表默认只看 NORMAL）

**涉及的特殊角色代码**：`teacher`, `admin`, `forum_admin`, `academic_admin`（统计/置顶/公告等）

测试账号（README）：`teacher` / `student` / `admin` 登录后 `useAuthStore` 的 `user.roles` 判断按钮显隐。

---

## 三、前端技术约束（不变）

| 项 | 规范 |
| -- | ---- |
| 目录 | `frontend/src/modules/forum/{api,components,pages,hooks,types,constants}` |
| 技术栈 | React 19、TS 5.7、Ant Design 5、TanStack Query 5、React Router 7、Zod |
| HTTP | 复用 `@/shared/utils/request`（自动带 JWT、**snake_case → camelCase**） |
| 参考模块 | `frontend/src/modules/info-management/`（`UserList` + `usersApi` 模式） |
| 安全 | 正文用纯文本或消毒后的 Markdown 渲染，禁止未处理 HTML |
| 测试 | Vitest + Playwright；关键路径覆盖发帖、评论、搜索 |

---

## 四、信息架构与路由（按后端能力修订）

### 4.1 建议菜单（`menu.tsx` 需扩展）

| 路径 | 菜单名 | 优先级 | 对接 API |
| ---- | ------ | ------ | -------- |
| `/forum/posts` | 课程论坛 | P0 | 列表 + 顶栏公告 |
| `/forum/posts/new` | 发帖（或页内按钮，可不单独菜单） | P0 | posts + attachments |
| `/forum/my` | 我的发布 | P0 | `GET /forum/posts?authorId=当前用户id` |
| `/forum/search` | 帖子检索 | P1 | `/forum/search` |
| `/forum/stats` | 论坛统计 | P1 | `/forum/stats*` |
| `/forum/notifications` | 消息通知 | **P2 / 建议暂缓** | 无后端 |

**无菜单路由**：

| 路径 | 页面 |
| ---- | ---- |
| `/forum/posts/:postId` | 帖子详情 + 评论 |
| `/forum/posts/:postId/edit` | 编辑帖 |
| `/forum/announcements/manage` | 教师公告管理（可选） |

### 4.2 模块目录结构（确定版）

```plaintext
frontend/src/modules/forum/
├── api/
│   ├── posts.ts           # 列表/详情/CRUD/置顶
│   ├── comments.ts
│   ├── announcements.ts
│   ├── attachments.ts     # Base64 编码上传
│   ├── search.ts
│   └── stats.ts
├── components/
│   ├── course-forum-selector.tsx   # 见 §4.3
│   ├── post-card.tsx
│   ├── post-type-tag.tsx
│   ├── post-filters.tsx
│   ├── announcement-banner.tsx
│   ├── comment-list.tsx            # 直接渲染 children 树
│   ├── comment-form.tsx
│   ├── attachment-upload.tsx       # File → Base64
│   └── attachment-list.tsx
├── hooks/
│   ├── use-forum-course.ts         # 当前 courseOfferingId（localStorage）
│   └── use-forum-permissions.ts    # 按 roles 判断按钮
├── pages/
│   ├── post-list.tsx               # 论坛首页
│   ├── post-detail.tsx
│   ├── post-editor.tsx             # 新建/编辑
│   ├── my-posts.tsx
│   ├── post-search.tsx
│   └── forum-stats.tsx
├── types/
│   └── index.ts                    # 对齐 forum.types.ts + 列表分页包装
└── constants/
    └── forum.ts                    # PostType 中文、文件大小限制等
```

### 4.3 课程开设选择器（原不确定项 · 现方案）

后端 **没有** `GET /forum/my-courses`，发帖却 **必须** 传 `courseOfferingId`（UUID）。

**P0 可行方案（按优先级）**：

1. **教师/管理员**：进入论坛时调 `GET /forum/stats/course-activity`（不传或传日期范围），用返回的 `courseOfferingId` + `courseName` 填充下拉。
2. **学生**：调 `GET /forum/posts?pageSize=100`（不传 `courseOfferingId`），从结果里 **去重** `courseOffering.id`（后端已按选课过滤可见课程）。
3. **联调兜底**：向队友要 seed 里的 `courseOfferingId`，或本地 `localStorage` 存 `forum.courseOfferingId`。
4. **后续**：请后端补 `GET /forum/courses`（建议提 issue，不阻塞 P0）。

---

## 五、开发阶段与里程碑（修订）

| 阶段 | 目标 | 完成标志 |
| ---- | ---- | -------- |
| **P0-0**（1～2 天） | 脚手架 + API 封装 + 路由 | `modules/forum` 存在；`App.tsx` 替换 ComingSoon；能调通 `GET /forum/posts` |
| **P0-1**（2～3 天） | 浏览与互动 | 列表、详情、评论树、我的发布 |
| **P0-2**（2～3 天） | 创作与公告 | 发帖/编辑、Base64 附件、教师公告 |
| **P1**（2 天） | 检索与统计 | 搜索页、统计页、热帖 |
| **P2**（可选） | 通知、管理端 | 隐藏评论管理 UI；通知占位 |

**联调环境**：

```powershell
cd e:\SE\Smart-Teaching-Service-System
docker compose up -d
# 前端 http://localhost:5173  后端 http://localhost:3000
# 用 teacher / student 登录测试权限差异
```

---

## 六、详细任务拆解与双人分工（按现有 API 均衡）

### 6.0 公共任务（第 1 天，两人协作）

| ID | 任务 | 说明 | 负责人 |
| -- | ---- | ---- | ------ |
| D-F01 | 创建 `modules/forum` 目录 | 按 §4.2 | A 主导，B review |
| D-F02 | `types/index.ts` | 从 `backend/.../forum.types.ts` 复制/精简前端用类型；定义 `ForumPaginatedResult<T>` | A |
| D-F03 | `constants/forum.ts` | PostType 中文、角色常量、10MB 限制 | A |
| D-F04 | `hooks/use-forum-permissions.ts` | `isTeacher`, `canManageStats`, `canPostAnnouncement` | B |
| D-F05 | `hooks/use-forum-course.ts` | §4.3 课程选择 + localStorage | B |
| D-F06 | 更新 `App.tsx` 路由 | 懒加载 forum 页面 | B |
| D-F07 | 更新 `menu.tsx` | 增加「检索」「统计」；通知项可标「即将推出」 | B |
| D-F08 | 联调冒烟 | Docker 下 `GET /forum/posts` 有数据或空列表不 401 | 一起 |

**预估**：各 0.5～1 人日。

---

### 6.1 同学 A — 浏览与互动主线（约 50%）

| ID | 任务 | 对接 API | 预估 |
| -- | ---- | -------- | ---- |
| D-A01 | `api/posts.ts`（读） | GET 列表/详情；注意 `{ data, pagination }` | 1d |
| D-A02 | `api/comments.ts` | GET 树形评论、POST 回复、DELETE | 0.5d |
| D-A03 | `PostTypeTag` / `PostCard` / `PostFilters` | 列表筛选项与 query 对齐 | 0.5d |
| D-A04 | `post-list.tsx` | 置顶帖样式；顶栏嵌入 `AnnouncementBanner`（只读） | 1d |
| D-A05 | `post-detail.tsx` | 详情 + `AttachmentList` 只读 + 浏览量展示 | 1d |
| D-A06 | `comment-list.tsx` + `comment-form.tsx` | 递归渲染 `children`；`parentId` 回复 | 1d |
| D-A07 | `my-posts.tsx` | `authorId=当前用户` | 0.5d |
| D-A08 | 单测 + E2E | 浏览 → 详情 → 评论 | 0.5d |

**交付**：用户可选课程 → 看列表/公告 → 进详情 → 发评论 → 在「我的发布」查看自己的帖。

---

### 6.2 同学 B — 创作、运营与检索主线（约 50%）

| ID | 任务 | 对接 API | 预估 |
| -- | ---- | -------- | ---- |
| D-B01 | `api/attachments.ts` | FileReader → Base64；单文件/批量 | 1d |
| D-B02 | `api/posts.ts`（写） | POST/PATCH/DELETE；`attachmentIds` | 0.5d |
| D-B03 | `api/announcements.ts` | 教师公告 CRUD | 0.5d |
| D-B04 | `attachment-upload.tsx` | 类型/大小校验与后端一致 | 0.5d |
| D-B05 | `post-editor.tsx` | 新建/编辑；类型 Select；先上传后发帖 | 1.5d |
| D-B06 | 教师公告 UI | 发布公告入口 + 列表管理（可用 Modal） | 0.5d |
| D-B07 | `api/search.ts` + `post-search.tsx` | 防抖搜索、结果跳转详情 | 1d |
| D-B08 | `api/stats.ts` + `forum-stats.tsx` | 概览、热帖 Tab、用户发文、课程活跃度；导出 CSV | 1.5d |
| D-B09 | 单测 + E2E | 发帖+附件 → 搜索命中 | 0.5d |

**交付**：发帖（含附件）、教师公告、搜索、统计页（按角色显示）。

---

### 6.3 分工总览

| 模块 | 同学 A | 同学 B |
| ---- | :----: | :----: |
| 类型/常量/帖子读 API | ✅ | |
| 评论 UI + API | ✅ | |
| 列表/详情/我的发布 | ✅ | |
| 发帖/附件/公告写 API | | ✅ |
| 搜索/统计 | | ✅ |
| 路由/菜单/权限 hooks | 协助 | ✅ |
| 消息通知页 | — | P2 占位 |

**每人合计**：约 **7～9 人日**（后端已就绪，较 v1 文档减少 Mock/猜接口时间）。

---

## 七、协作与 Git（你们当前状态）

### 7.1 已在的分支

```text
feat/D-frontend-post-ui-0517  →  指向 7d584e7（含全部后端）
develop                       →  8bdfee8（后端未含论坛）
```

后续前端提交：

```powershell
git add frontend/src/modules/forum
git commit -m "feat(D): add forum post list page"
git push -u origin feat/D-frontend-post-ui-0517
```

### 7.2 若后端同学再推新分支

```powershell
git fetch origin
git merge origin/feat/D-xxx -X theirs   # 后端文件冲突优先同事的
# 前端目录冲突用 --ours
git checkout --ours -- frontend/src/modules/forum
```

### 7.3 文件归属（减少冲突）

| 路径 | 主负责人 |
| ---- | -------- |
| `api/posts.ts` | 拆成 `posts.read.ts`（A）+ `posts.write.ts`（B），或一人负责合并 |
| `api/comments.ts` | A |
| `api/attachments.ts`, `announcements.ts`, `search.ts`, `stats.ts` | B |
| `pages/post-list.tsx`, `post-detail.tsx`, `my-posts.tsx` | A |
| `pages/post-editor.tsx`, `post-search.tsx`, `forum-stats.tsx` | B |
| `App.tsx`, `menu.tsx` | B 改，A 提需求 |

---

## 八、验收标准（修订）

### P0 必须

- [ ] 登录后论坛路由不再是 `ComingSoon`
- [ ] 可选/切换 `courseOfferingId` 并拉取帖子列表（分页）
- [ ] 帖子详情展示正文、附件、评论树，可发表回复
- [ ] 可发帖（含 Base64 附件流程）
- [ ] 教师可发布公告并在列表区展示
- [ ] 「我的发布」可按作者筛选

### P1 应该

- [ ] 搜索页 `GET /forum/search` 可用
- [ ] 统计页：热帖 + 时间范围统计（教师/管理员可见）
- [ ] 单测/E2E 至少两条主路径

### P2 可选

- [ ] 隐藏评论管理（`/forum/comments/hidden`）
- [ ] 置顶按钮（`PATCH .../pin`）
- [ ] 消息通知（需后端新增 API 后再做）
- [ ] 协助补全 `docs/apis/D-discussion-forum.md`（与代码一致）

---

## 九、风险与待办（原「不确定」项落地）

| 项 | 状态 | 处理 |
| -- | ---- | ---- |
| API 文档不全 | ⚠️ | **以 `forum.routes.ts` 为准**；有空时把 §二同步进 `D-discussion-forum.md` |
| 列表分页字段名 | ✅ 已明确 | 用 `data` + `pagination`，勿照搬 users 的 `items` |
| 附件上传方式 | ✅ 已明确 | Base64 JSON，**不是** FormData |
| 评论结构 | ✅ 已明确 | 后端返回树，**无需** `use-comment-tree`（可选仅用于单测） |
| 消息通知 | ❌ 无 API | P2 或菜单暂时隐藏 |
| 课程下拉 | ⚠️ workaround | §4.3 |
| `dev/D` 远程不存在 | ⚠️ | 问组长；暂用 `feat/D-frontend-post-ui-0517` 协作 |
| 数据库 seed 无论坛数据 | ⚠️ | 联调前请后端在 seed 加测试帖，或自己用 API 造数据 |
| `sortBy=commentCount` | ⚠️ | schema 允许但 types 注释说不支持，前端 **只用 `createdAt` / `viewCount`** |

---

## 十、附录

### A. PostType 展示

| 枚举 | 中文 | Tag 色 |
| ---- | ---- | ------ |
| QUESTION | 提问 | blue |
| DISCUSSION | 讨论 | green |
| SHARE | 分享 | cyan |
| ANNOUNCEMENT | 公告 | gold / red |

### B. 创建帖子请求体示例

```json
{
  "courseOfferingId": "uuid",
  "title": "标题",
  "content": "正文",
  "postType": "DISCUSSION",
  "isAnnouncement": false,
  "attachmentIds": ["uuid-of-attachment"]
}
```

### C. 附件上传请求体示例

```json
{
  "fileName": "notes.pdf",
  "fileType": "application/pdf",
  "content": "<base64-string-without-data-url-prefix>"
}
```

### D. 需求 → 页面 → 负责人（速查）

| 需求 | 页面 | A | B |
| ---- | ---- | - | - |
| D-1 公告 | Banner + 教师发布 | 展示 | 发布 |
| D-2 发帖 | PostEditor | | ✅ |
| D-3 评论 | PostDetail | ✅ | |
| D-4 统计 | ForumStats | | ✅ |
| D-5 检索 | PostSearch | | ✅ |

---

**文档变更**：v1 → v2，根据合并后的 `feat/D-announcement-attachment-0517` 重写；删除虚构 API 草案与「后端未实现」表述；明确分页/附件/评论树/无通知 API 等联调细节。
