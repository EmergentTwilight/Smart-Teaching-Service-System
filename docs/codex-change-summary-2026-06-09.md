# Codex 修改汇总

日期：2026-06-09  
项目：EmergentTwilight/Smart-Teaching-Service-System  
当前 Git 工作目录：`D:\Code\STSS-git`  
原本开发目录：`D:\Code\STSS`

## 1. 背景说明

这轮修改主要围绕论坛模块、真实数据库模式、附件上传，以及后续 Git 环境迁移展开。

最初的 `D:\Code\STSS` 目录不是 Git 仓库，目录内没有 `.git`，所以无法直接用 `git diff` 追踪之前每一步修改。后续已从 GitHub 重新 clone 一份带完整历史的仓库到：

```text
D:\Code\STSS-git
```

然后把当前本地项目中的改动迁移到了 `STSS-git` 工作区。原 GitHub 仓库历史可以保留，但旧目录里无 Git 期间的逐步修改历史无法自动恢复，只能从当前状态开始整理为新的 commit。

## 2. 环境与工具相关处理

### Node.js / pnpm / npm

- 确认本机 Node.js 可用。
- 解释并处理了 PowerShell 中 `npm.ps1` 被执行策略拦截的问题，临时建议使用 `npm.cmd` 或调整执行策略。
- 项目依赖安装后使用 `pnpm` 运行前后端脚本。

### Prisma

- 处理 `import { PrismaClient } from '@prisma/client'` 报错相关问题。
- 执行过 Prisma Client 生成，使 `@prisma/client` 类型可被 TypeScript 正常识别。
- 执行过数据库同步相关操作，使 schema 变更写入本地数据库。

### Git

- 发现原 `D:\Code\STSS` 不是 Git 仓库，无法使用 `git diff`。
- 协助安装 Git for Windows。
- 确认 Git 实际安装路径：

```text
C:\Program Files\Git\cmd\git.exe
```

- 从 GitHub clone 原项目到：

```text
D:\Code\STSS-git
```

- 将当前本地修改迁移到新 Git 工作区，但尚未提交 commit。

## 3. 后端配置与运行修改

### `backend/.env`

新增本地开发环境变量，用于连接本机 PostgreSQL、Redis 和前后端服务：

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT`
- `NODE_ENV`
- `CORS_ORIGIN`
- `FRONTEND_URL`
- SMTP 相关占位配置

该文件被 `.gitignore` 忽略，不应提交到仓库。

### `backend/src/app.ts`

主要修改：

- 增加上传文件访问静态资源：

```ts
app.use('/uploads', express.static('uploads'))
```

- 修复 JSON body 解析中间件未真正生效的问题：

```ts
app.use(express.json({ limit: '16mb' }))
app.use(express.urlencoded({ extended: true, limit: '16mb' }))
```

这次 PDF 上传失败的最可能根因就是这里：原本 `express.json({ limit: '16mb' })` 被乱码注释吞在同一行，实际没有执行。附件上传采用 Base64 JSON，后端拿不到正常的 `req.body`，所以选择 PDF 后会上传失败或表现异常。

影响说明：

- 现在 10MB 以内文件转 Base64 后可以被后端解析。
- `16mb` JSON 限制目前对所有 JSON 接口生效。
- 生产环境更推荐将附件上传改成 `multipart/form-data`，避免 Base64 带来的体积膨胀。

## 4. 数据库与 Prisma 修改

### `backend/prisma/schema.prisma`

论坛附件表相关调整：

- `ForumAttachment.postId` 改为可空，允许附件先上传，再在发帖时绑定到帖子。
- `ForumAttachment.fileType` 字段长度放宽到 `VarChar(150)`，避免 Office 文档 MIME 类型过长导致写库失败。

### `backend/prisma/seed.ts`

补充演示课程、课程开课、学生选课关系等种子数据，使关闭演示模式后真实数据库论坛流程也能测试。

解决过的问题：

- 演示模式正常，但关闭演示模式后像是没有连数据库。
- 发帖后提示“帖子不存在或无权查看”。
- 真实数据库模式下学生没有课程访问权限。

## 5. 论坛后端模块修改

涉及目录：

```text
backend/src/modules/forum/
```

### `forum.controller.ts`

主要处理：

- 上传附件接口支持 Base64 JSON。
- 根据文件扩展名优先推断 MIME 类型。
- 支持 PDF、Word、Excel、图片、文本、Markdown 等附件类型。
- 限制单文件最大 10MB。
- 上传前确保 `uploads/forum` 目录存在。
- 上传成功后写入 `ForumAttachment` 记录。
- 删除附件时通过 service 层检查权限。

### `forum.service.ts`

主要处理：

- 增加或完善附件 MIME 类型推断。
- 附件校验优先根据扩展名识别，避免浏览器传入空 MIME 或非标准 MIME 时误判。
- 上传附件时保存文件名、路径、大小、类型和上传时间。
- 删除附件时同时删除物理文件。
- 删除权限按帖子作者或管理员判断。

### `forum.routes.ts`

主要处理：

- 附件删除路由不再使用不合适的 `requireSelfOrAdmin`。
- 删除权限交给 controller/service 根据附件和帖子归属判断。

### `forum.schemas.ts` / `forum.types.ts`

主要处理：

- 补充论坛帖子、评论、公告、统计、附件上传等相关类型和校验结构。

## 6. API 响应与序列化修改

### `backend/src/shared/utils/response.ts`

处理 BigInt 序列化：

- 将响应对象中的 `bigint` 转成字符串。

解决的问题：

- 搜索或获取帖子时，如果结果中包含附件大小等 BigInt 字段，JSON 序列化可能导致页面错误。
- 创建名为“实验”的帖子后，搜索“实验”时页面报错，很可能与命中结果包含无法序列化字段有关。

## 7. 前端论坛模块修改

涉及目录：

```text
frontend/src/modules/forum/
```

### `api/forum-api.ts`

主要修改：

- 附件上传接口改为 60 秒超时：

```ts
request.post('/forum/attachments', data, { timeout: 60000 })
request.post('/forum/attachments/batch', { files }, { timeout: 60000 })
```

- 修复课程活跃度接口返回类型相关 typecheck 问题。

解决的问题：

- 较大的 PDF 上传可能超过默认 10 秒请求超时。
- 前端 typecheck 中课程活跃度数据类型不明确。

### `components/attachment-upload.tsx`

主要修改：

- 根据扩展名标准化 MIME 类型。
- 上传前立即把选中的文件显示为 pending 状态。
- 上传失败时保留失败项，并把失败原因写进文件名。
- 提取后端错误、HTTP 状态码、超时信息等具体错误。
- 修复上传失败时只有笼统“上传失败”的问题。
- 修复部分中文提示乱码。
- 支持 PDF、Office 文档、图片、文本、Markdown 等类型。

解决的问题：

- 选中 PDF 后没有反应。
- PDF 文件短暂出现在附件列表后又消失。
- 上传失败但没有具体错误。
- 失败原因不容易定位。

### `components/attachment-list.tsx`

主要修改：

- 下载链接兼容 Windows 路径分隔符，将 `\` 转成 `/`。
- 支持附件下载按钮。
- 支持附件删除按钮。

解决的问题：

- 上传后无法下载。
- 上传后无法删除。
- Windows 本地路径导致下载地址不正确。

### `pages/forum-home.tsx`

处理过导入问题：

- 同步补充 `Card` 导入，解决页面组件使用但未导入的问题。

### 其他论坛前端文件

新增或迁移了一批论坛页面、组件、hooks、常量、类型文件，包括：

- 公告列表
- 帖子列表
- 帖子详情
- 发帖编辑器
- 搜索结果页
- 我的帖子
- 统计页
- 评论编辑与评论列表
- 课程选择器
- 帖子类型标签
- 附件上传与列表
- 演示模式 mock 数据

这些文件构成论坛模块前端主要功能。

## 8. 前端共享配置修改

### `frontend/src/shared/config/menu.tsx`

主要修改：

- 修复 Ant Design `MenuProps['items']` 类型推断问题。
- 新增或调整论坛菜单项。
- 使用明确的 `MenuItem` 类型，解决 typecheck 报错。

### `frontend/src/shared/components/layout/MainLayout.tsx`

主要修改：

- 配合论坛模块菜单或路由接入做过调整。

### `frontend/src/App.tsx`

主要修改：

- 接入论坛相关路由。

## 9. 共享类型修改

### `shared/src/types/index.ts`

主要修改：

- 补充或调整论坛相关共享类型。
- 支持前后端论坛模块的数据结构复用。

## 10. Docker 与本地服务修改

### `docker-compose.yml`

主要修改：

- 配合本地 PostgreSQL / Redis 开发环境做过调整。

运行验证中确认：

- PostgreSQL 可连接。
- Redis 可连接。
- 后端健康检查返回 `status: ok`。

## 11. 已验证事项

已执行并通过：

```powershell
pnpm --filter @stss/web typecheck
pnpm --filter @stss/server typecheck
```

已通过接口验证：

- 登录接口正常。
- 后端健康检查正常。
- 数据库连接正常。
- Redis 连接正常。
- 200KB PDF 上传成功。
- 9MB PDF 上传成功。
- 上传后的测试附件可删除。

已处理运行环境问题：

- 清理重复启动的后端进程。
- 重启后端，使新的 JSON body 解析配置生效。

## 12. 最可能导致 PDF 上传 bug 的原因

最核心原因：

```ts
app.use(express.json({ limit: '16mb' }))
```

这行在 `backend/src/app.ts` 中被乱码注释吞掉，导致 Express 没有真正启用 JSON body 解析。

因为当前附件上传方案是：

1. 前端读取 PDF 文件。
2. 转成 Base64。
3. 放进 JSON body 发给后端。
4. 后端从 `req.body` 中读取 `fileName`、`fileType`、`content`。

如果 JSON body 解析没有生效，后端就无法正常拿到 `content`。PDF 文件体积比 Markdown 大很多，更容易暴露这个问题。

辅助原因：

- Base64 会让文件体积膨胀约三分之一。
- 默认 JSON body 限制不适合接收接近 10MB 的文件。
- 前端之前只显示笼统“上传失败”，没有暴露 413、超时或后端错误。
- 机器上曾同时运行多套后端进程，导致修改后可能打到旧进程。

## 13. 当前 Git 状态说明

当前新 Git 仓库为：

```text
D:\Code\STSS-git
```

原项目历史已保留，可以查看：

```powershell
git log --oneline -5
```

当前本地修改已迁移到工作区，但尚未提交，可以查看：

```powershell
git status
git diff
```

注意：

- `backend/.env` 被 `.gitignore` 忽略，不会提交。
- 旧目录 `D:\Code\STSS` 没有 `.git`，不能恢复旧目录内每一步修改的历史。
- 可以从现在开始把改动整理为 commit。

## 14. 建议的提交拆分

建议不要一次性提交所有内容，可以拆成几类：

```powershell
git add backend/prisma/schema.prisma backend/prisma/seed.ts backend/src/shared/utils/response.ts
git commit -m "fix: support forum data and attachment serialization"
```

```powershell
git add backend/src/app.ts backend/src/modules/forum
git commit -m "feat: add forum backend and attachment upload support"
```

```powershell
git add frontend/src/modules/forum frontend/src/App.tsx frontend/src/shared/config/menu.tsx frontend/src/shared/components/layout/MainLayout.tsx
git commit -m "feat: add forum frontend pages and attachment UI"
```

```powershell
git add docs/apis/D-discussion-forum.md docs/codex-change-summary-2026-06-09.md
git commit -m "docs: update forum implementation notes"
```

如果希望只提交 PDF 上传修复，应单独筛选以下文件：

```text
backend/src/app.ts
backend/prisma/schema.prisma
backend/src/modules/forum/forum.controller.ts
backend/src/modules/forum/forum.service.ts
backend/src/modules/forum/forum.routes.ts
backend/src/shared/utils/response.ts
frontend/src/modules/forum/api/forum-api.ts
frontend/src/modules/forum/components/attachment-upload.tsx
frontend/src/modules/forum/components/attachment-list.tsx
```

## 15. 后续建议

- 将附件上传从 Base64 JSON 改为 `multipart/form-data`，更适合生产环境。
- 清理仍然存在的乱码注释和乱码中文文案。
- 为论坛附件上传、下载、删除增加后端单元测试或集成测试。
- 为前端附件上传失败场景补充测试。
- 在提交前仔细检查 `git diff`，避免把无关文件一起提交。
