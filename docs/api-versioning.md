# API 版本控制策略

本文档说明 Smart Teaching Service System (STSS) 的 API 版本控制策略，包括版本升级流程、废弃 API 处理和向后兼容性承诺。

## 当前版本

- **当前 API 版本**: v1
- **API 基础路径**: `/api/v1`
- **发布日期**: 2026-01-01

## 版本策略

### URL 路径版本控制

STSS 使用 **URL 路径版本控制**，将版本号包含在 URL 中：

```
https://api.example.com/api/v1/resource
```

这种方式的优点：

- 清晰明确，易于理解和使用
- 客户端可以同时使用多个版本
- 便于 API 网关进行路由
- 浏览器缓存友好

### 版本号格式

版本号采用 **主版本号** 格式（`v1`, `v2`, `v3`），不使用次版本号：

- ✅ `/api/v1/users`
- ❌ `/api/v1.1/users` (不推荐)
- ❌ `/api/v1.0/users` (不推荐)

**原因**：

- 简化版本管理
- 避免客户端混淆
- 次版本更新（添加新字段、新接口）保持向后兼容，不需要修改版本号

## 版本升级流程

### 1. 新版本发布流程

当需要引入**不兼容**的 API 变更时，遵循以下流程：

1. **规划阶段** (提前 3 个月)
   - 评估变更影响范围
   - 设计新版本 API
   - 编写迁移指南

2. **通知阶段** (提前 2 个月)
   - 通过 API 文档发布公告
   - 在响应头中添加 `X-API-Deprecated` 标记
   - 向主要客户端发送邮件通知

3. **开发阶段** (1 个月)
   - 实现新版本 API
   - 更新 API 文档
   - 编写迁移示例

4. **并行运行阶段** (至少 3 个月)
   - 新旧版本同时可用
   - 监控旧版本使用情况
   - 收集客户端反馈

5. **废弃阶段** (提前 1 个月再次通知)
   - 旧版本返回 `X-API-Sunset` 响应头
   - 响应体中包含迁移提示

6. **下线阶段**
   - 停止旧版本服务
   - 返回 410 Gone 状态码
   - 提供 6 个月的文档访问

### 2. 次版本更新流程

对于**向后兼容**的变更（添加新字段、新接口），直接在当前版本更新：

1. **添加新接口**
   - 直接在 `/api/v1/` 下添加
   - 更新 API 文档
   - 发布更新日志

2. **添加新字段**
   - 在响应中添加新字段（不影响现有字段）
   - 在 API 文档中标注为 "新增"

3. **修复 Bug**
   - 修复不影响接口契约的 Bug
   - 发布补丁说明

## 废弃 API 处理

### 废弃通知机制

#### 1. 响应头标记

```
HTTP/1.1 200 OK
X-API-Deprecated: true
X-API-Sunset: Sat, 01 Jul 2026 00:00:00 GMT
Link: </api/v2/users>; rel="successor-version"
```

- `X-API-Deprecated`: 标记 API 已废弃
- `X-API-Sunset`: 废弃时间（RFC 7231 格式）
- `Link`: 指向新版本 API 的链接

#### 2. 响应体警告

```json
{
  "data": { ... },
  "warnings": [
    {
      "code": "API_DEPRECATED",
      "message": "此 API 已废弃，将于 2026-07-01 下线",
      "migration_guide": "https://docs.example.com/migration/v1-to-v2"
    }
  ]
}
```

### 废弃时间表

| 阶段     | 时间          | 状态       | 说明         |
| -------- | ------------- | ---------- | ------------ |
| 活跃     | 发布后        | 正常服务   | 默认状态     |
| 废弃通知 | 废弃前 3 个月 | 正常服务   | 添加废弃标记 |
| 下线警告 | 废弃前 1 个月 | 正常服务   | 加强警告     |
| 下线     | 废弃日        | 410 Gone   | 停止服务     |
| 文档保留 | 下线后 6 个月 | 文档可访问 | 仅保留文档   |

## 向后兼容性承诺

### 保证兼容的变更

以下变更**不会**导致主版本号升级：

✅ **添加新接口**

```typescript
// 新增接口
GET / api / v1 / courses / { id } / statistics
```

✅ **添加新字段**

```json
{
  "id": "123",
  "name": "Course A",
  "credits": 3,
  "newField": "value" // 新增字段
}
```

✅ **添加可选参数**

```
GET /api/v1/courses?page=1&size=10&sort=name  // sort 是新增的可选参数
```

✅ **添加新的枚举值**

```json
{
  "status": "active" // 新增 "suspended" 状态
}
```

✅ **修复 Bug**

- 修正错误的响应数据
- 修复性能问题
- 修复安全问题

### 不兼容的变更

以下变更**必须**升级主版本号：

❌ **删除接口**

```typescript
// 旧版本
DELETE / api / v1 / users / { id } / preferences

// 新版本中删除此接口
```

❌ **重命名字段**

```json
// 旧版本
{
  "userName": "alice"
}

// 新版本
{
  "username": "alice"  // 字段名变更
}
```

❌ **修改数据类型**

```json
// 旧版本
{
  "age": 25
}

// 新版本
{
  "age": "25"  // 类型从 number 变为 string
}
```

❌ **修改必填字段**

```json
// 旧版本
{
  "name": "Course A"
}

// 新版本
{
  "name": "Course A",
  "code": "CS101"  // 新增必填字段
}
```

❌ **修改错误码**

```json
// 旧版本
{
  "code": 40401,
  "message": "用户不存在"
}

// 新版本
{
  "code": 40402,  // 错误码变更
  "message": "用户不存在"
}
```

## 客户端最佳实践

### 1. 版本检测

客户端应检查响应头中的废弃标记：

```javascript
fetch('/api/v1/users').then((response) => {
  if (response.headers.get('X-API-Deprecated') === 'true') {
    const sunset = response.headers.get('X-API-Sunset')
    console.warn(`API will be deprecated on ${sunset}`)
  }
  return response.json()
})
```

### 2. 版本锁定

生产环境建议在客户端配置中显式指定 API 版本：

```javascript
const API_BASE_URL = 'https://api.example.com/api/v1'
```

### 3. 错误处理

处理 410 Gone 状态码：

```javascript
if (response.status === 410) {
  // API 已下线，提示用户升级客户端
  showUpdateDialog()
}
```

## 版本历史

| 版本 | 发布日期   | 状态     | 主要变更 |
| ---- | ---------- | -------- | -------- |
| v1   | 2026-01-01 | 当前版本 | 初始版本 |

## 联系方式

如有 API 版本相关问题，请联系：

- 技术支持: support@example.com
- API 文档: https://docs.example.com/api
