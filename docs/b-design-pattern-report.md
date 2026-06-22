# B 组设计模式报告：责任链模式

## 1. 案例背景

本案例来自 Smart Teaching Service System 中 B 组“自动排课”模块的接口权限控制。

B 组包含教室管理、手动排课、规则管理和自动排课等功能。部分接口是查询类操作，例如查看教室列表、查询排课、查看自动排课任务状态；另一部分接口是写操作，例如新增教室、创建排课、设置规则、应用自动排课结果。

在测试过程中发现，部分写接口最初只使用 `authMiddleware` 判断用户是否登录，没有继续判断用户角色。这意味着学生或教师只要登录，就可能调用排课写接口。后续修复时，在路由中加入了 `requireRoles('admin', 'super_admin')`，形成了一个典型的请求处理链。

相关代码：

| 文件                                                                           | 作用                         |
| ------------------------------------------------------------------------------ | ---------------------------- |
| `backend/src/shared/middleware/auth.ts`                                        | 定义登录认证和角色校验中间件 |
| `backend/src/modules/course-arrangement/schedule/schedule.routes.ts`           | 手动排课路由                 |
| `backend/src/modules/course-arrangement/classroom/classroom.routes.ts`         | 教室管理路由                 |
| `backend/src/modules/course-arrangement/rules/rule.routes.ts`                  | 规则管理路由                 |
| `backend/src/modules/course-arrangement/auto-schedule/auto-schedule.routes.ts` | 自动排课路由                 |

## 2. 选择的设计模式

本案例体现的是行为型设计模式中的责任链模式。

课程材料中对责任链模式的定义是：避免请求发送者和接收者直接耦合，让多个对象都有机会处理请求。请求沿着处理链传递，直到某个对象处理它，或者最终到达业务处理对象。

在本项目中，一个 HTTP 请求不会直接到达 controller，而是依次经过：

```text
客户端请求
  -> authMiddleware
  -> requireRoles(...)
  -> controller
  -> service
```

每个节点都只负责一件事：

| 处理节点         | 职责                         |
| ---------------- | ---------------------------- |
| `authMiddleware` | 校验 token，解析用户身份     |
| `requireRoles`   | 校验当前用户是否具备指定角色 |
| `controller`     | 校验参数，调用业务服务       |
| `service`        | 执行业务逻辑                 |

这正符合责任链模式“将多个处理者串成一条链，每个处理者决定处理或放行”的思想。

## 3. 模式结构对应关系

责任链模式中的角色和本项目代码可以这样对应：

| 责任链模式角色  | 项目中的对应对象                         | 说明                      |
| --------------- | ---------------------------------------- | ------------------------- |
| Handler         | Express middleware 函数                  | 统一接收 `req, res, next` |
| ConcreteHandler | `authMiddleware`、`requireRoles`         | 具体处理认证、角色校验    |
| Client          | 前端或接口调用方                         | 发起 HTTP 请求            |
| Successor       | `next()` 指向的下一个中间件或 controller | 当前处理者放行后继续执行  |
| Final Handler   | controller                               | 最终进入业务处理          |

简化流程如下：

```text
Request
  |
  v
authMiddleware
  |-- token 不存在/无效 -> 返回 401
  |
  v
requireRoles('admin', 'super_admin')
  |-- 角色不足 -> 返回 403
  |
  v
createSchedule / applyTask / setSchedulingRule
  |
  v
业务服务
```

## 4. 项目中的实现

### 4.1 登录认证处理者

`authMiddleware` 负责检查请求头中的 JWT：

```ts
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, '未提供认证令牌', 401)
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload

    req.user = decoded
    next()
  } catch {
    return error(res, '无效或过期的令牌', 401)
  }
}
```

它的责任很清晰：

| 情况             | 处理                                     |
| ---------------- | ---------------------------------------- |
| 没有 token       | 返回 401                                 |
| token 无效或过期 | 返回 401                                 |
| token 有效       | 把用户信息挂到 `req.user`，调用 `next()` |

它不关心用户能不能排课，只负责“是否登录”。

### 4.2 角色校验处理者

`requireRoles` 是一个中间件工厂，根据传入角色生成具体处理者：

```ts
export const requireRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return error(res, '未认证', 401)
    }

    if (roles.length === 0) {
      return next()
    }

    const hasRole = req.user.roles.some((role) => roles.includes(role))
    if (!hasRole) {
      return error(res, '权限不足', 403)
    }

    next()
  }
}
```

它的责任是“角色是否满足要求”：

| 情况            | 处理          |
| --------------- | ------------- |
| 没有 `req.user` | 返回 401      |
| 角色不足        | 返回 403      |
| 角色满足        | 调用 `next()` |

它不关心 token 如何解析，也不关心排课业务如何执行。

### 4.3 路由中组装责任链

以手动排课为例：

```ts
router.use(authMiddleware)

router.get('/', getSchedules)
router.post('/', requireRoles('admin', 'super_admin'), createSchedule)
router.post('/validate', requireRoles('admin', 'super_admin'), validateSchedule)
router.get('/:id', getScheduleById)
router.patch('/:id', requireRoles('admin', 'super_admin'), updateSchedule)
router.delete('/:id', requireRoles('admin', 'super_admin'), deleteSchedule)
```

这里有两类链：

| 接口类型 | 处理链                                         |
| -------- | ---------------------------------------------- |
| 查询接口 | `authMiddleware -> controller`                 |
| 写接口   | `authMiddleware -> requireRoles -> controller` |

这样做的好处是：查询接口和写接口可以共享登录校验，但写接口可以额外增加管理员角色校验。

自动排课接口也是类似结构：

```ts
router.use(authMiddleware)

router.post('/tasks', requireRoles('admin', 'super_admin'), createAutoTask)
router.get('/tasks/:taskId', getTaskStatus)
router.get('/tasks/:taskId/preview', getTaskPreview)
router.post('/tasks/:taskId/apply', requireRoles('admin', 'super_admin'), applyTask)
```

创建任务和应用结果会改变系统状态，所以需要管理员权限；查询任务状态和预览结果只需要登录。

## 5. 为什么这是责任链模式

这个设计体现了责任链模式的三个关键点。

### 5.1 请求发送者不直接依赖最终处理者

前端只发起 HTTP 请求，并不知道后端会经过几个中间件。它不需要知道：

| 细节                         | 是否需要前端知道 |
| ---------------------------- | ---------------- |
| token 如何解析               | 不需要           |
| 角色如何判断                 | 不需要           |
| 哪个 controller 最终处理请求 | 不需要           |

请求发送者和具体处理者之间被路由链解耦。

### 5.2 每个处理者职责单一

如果没有责任链，可能会在每个 controller 中写类似逻辑：

```ts
if (!token) return 401
if (!isAdmin) return 403
// 再处理业务
```

这样会导致权限逻辑散落在多个 controller 中，重复且难维护。现在通过中间件链，登录、角色、业务分别放在不同节点中，职责更清晰。

### 5.3 链可以按接口动态组合

不同接口可以选择不同链条：

| 场景                 | 链条                                                              |
| -------------------- | ----------------------------------------------------------------- |
| 普通查询             | `authMiddleware -> controller`                                    |
| 管理员写操作         | `authMiddleware -> requireRoles -> controller`                    |
| 将来如果需要日志审计 | `authMiddleware -> requireRoles -> auditMiddleware -> controller` |

这体现了课程材料中的“动态指定能够处理请求的对象集合”。

## 6. 设计模式带来的好处

### 6.1 降低耦合

Controller 不需要知道 JWT 如何验证，也不需要重复写角色判断。认证逻辑、权限逻辑和业务逻辑分离。

### 6.2 便于复用

`authMiddleware` 和 `requireRoles` 不只用于 B 组，也可以用于 A、D、E、F 等模块。

例如：

```ts
requireRoles('teacher', 'admin', 'super_admin')
requireRoles('student')
requireRoles('admin', 'super_admin')
```

同一个中间件工厂可以组合出不同权限链。

### 6.3 便于扩展

如果未来 B 组需要更细粒度的“教务权限”，可以新增一个中间件：

```ts
requirePermissions('course-arrangement:write')
```

然后把链改为：

```ts
router.post('/', authMiddleware, requirePermissions('course-arrangement:write'), createSchedule)
```

业务 controller 不需要大改。

### 6.4 便于测试

本项目新增了 `write-routes-auth.test.ts`，直接验证责任链行为：

| 测试场景         | 预期            |
| ---------------- | --------------- |
| 学生访问写接口   | 403             |
| 教师访问写接口   | 403             |
| 管理员访问写接口 | 进入 controller |
| 学生访问读接口   | 允许访问        |

测试关注的是链条行为，而不是具体数据库数据，因此稳定性较好。

## 7. 代价和不足

责任链模式也有代价。

### 7.1 请求不一定被最终处理

课程材料中提到责任链的缺点是“Receipt isn't guaranteed”。在本项目中，如果某个中间件提前返回 401 或 403，请求不会到达 controller。这是符合安全需求的，但调试时需要知道请求停在哪一环。

### 7.2 链条顺序很重要

必须先执行 `authMiddleware`，再执行 `requireRoles`。因为 `requireRoles` 依赖 `req.user`。

错误顺序：

```ts
router.post('/', requireRoles('admin'), authMiddleware, createSchedule)
```

这样角色校验时还没有用户信息，会直接返回 401。

正确顺序：

```ts
router.use(authMiddleware)
router.post('/', requireRoles('admin', 'super_admin'), createSchedule)
```

### 7.3 权限粒度仍然偏粗

目前 B 组写接口使用的是角色级控制：

```ts
requireRoles('admin', 'super_admin')
```

这能解决学生/教师越权问题，但如果后续要区分“普通管理员”和“教务管理员”，还需要引入更细的权限中间件。

## 8. 与设计原则的关系

课程材料中提到设计模式的三个原则：

| 原则                         | 本案例体现                                          |
| ---------------------------- | --------------------------------------------------- |
| 面向接口编程，而不是面向实现 | 所有中间件都遵循 Express 的 `(req, res, next)` 接口 |
| 优先对象组合，而不是继承     | 路由通过组合多个中间件形成处理链，没有依赖继承层次  |
| 封装变化点，实现低耦合       | 登录校验、角色校验、业务逻辑分别封装，变化互不影响  |

本案例也符合开放封闭原则：增加新的权限检查时，可以新增中间件并插入链条，而不是修改每个 controller 的内部代码。

## 9. 简化 UML 表示

```text
+----------------+
| Client Request |
+----------------+
        |
        v
+------------------+
| authMiddleware   |
| Handler          |
+------------------+
 | 401 or next()
 v
+------------------------------+
| requireRoles(admin, super)   |
| ConcreteHandler              |
+------------------------------+
 | 403 or next()
 v
+------------------+
| Controller       |
| Final Handler    |
+------------------+
        |
        v
+------------------+
| Service          |
+------------------+
```

## 10. 总结

本项目 B 组的接口鉴权链是责任链模式的实际应用。它把一个请求拆成多个连续处理步骤：登录认证、角色判断、业务处理。每个处理者只负责自己的判断，能处理就返回结果，不能处理或通过后就交给下一个处理者。

这种设计的核心价值不是“代码看起来更复杂”，而是把变化点隔离开：

| 变化点         | 影响范围                  |
| -------------- | ------------------------- |
| token 规则变化 | 修改 `authMiddleware`     |
| 角色策略变化   | 修改或替换 `requireRoles` |
| 排课业务变化   | 修改 controller/service   |

因此，责任链模式提升了 B 组接口权限控制的可维护性、可复用性和可测试性，也体现了设计模式“复用成功设计、应对频繁变化、提高维护性”的理念。
