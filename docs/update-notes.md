# 更新记录

## 2026-05-04

### 已改

| 文件 | 问题 | 处理 | 结果 |
| --- | --- | --- | --- |
| `docker-compose.yml` | 后端启动顺序不对，`shared` 构建和 Prisma 生成顺序冲突 | 调整为 `db:generate -> shared build -> server` | 后端可正常启动，`/api/health` 返回 `200` |
| `frontend/src/modules/course-arrangement/api/schedules.ts` | 排课更新接口方法不对 | 改为 `PATCH /course-arrangement/schedules/:id` | 已通过接口实测 |
| `backend/src/modules/course-arrangement/schedule/schedule.controller.ts` | 排课校验、更新、异常处理不稳定 | 调整参数解析和返回格式 | 已通过接口实测 |
| `frontend/src/modules/course-arrangement/pages/classroom-edit.tsx` | 教室状态枚举拼写错误 | `MAINTENENCE` 改为 `MAINTENANCE` | 待页面回归 |
| `frontend/src/modules/course-arrangement/pages/classroom-edit.tsx` | 教室表单设备字段是扁平结构，提交后设备信息不会落库 | 改为提交嵌套 `equipment` 字段 | 前端静态检查通过，待页面回归 |
| `backend/src/modules/course-arrangement/timetable/timetable.types.ts` | 导出实现只有 CSV，但类型声明暴露了 `pdf/excel` | 收敛为只支持 `csv` | 已复测通过 |
| `frontend/src/modules/course-arrangement/types/timetable.ts` | 前端导出类型允许 `pdf/excel` | 收敛为只支持 `csv` | 已复测通过 |
| `frontend/src/modules/course-arrangement/pages/timetable-view.tsx` | 导出弹窗默认值和下载扩展名与实际实现不一致 | 默认格式改为 `csv`，默认学期改为当前选择/首个学期，下载名固定为 `.csv` | 前端静态检查通过 |
| `backend/src/modules/course-arrangement/timetable/timetable.controller.ts` | 按教室查询课表接口参数绑定错误 | 改为显式传入 `classroomId: req.params.classroomId` | 已复测通过 |
| `backend/src/modules/course-arrangement/rules/rule.types.ts` | 规则里的教室类型没有约束，能写入小写值 | 改为复用教室类型枚举，只接受大写值 | 已复测通过 |
| `frontend/src/modules/course-arrangement/types/rule.ts` | 前端规则类型允许任意字符串 | 改为复用教室类型枚举，只接受大写值 | 前端静态检查通过 |
| `frontend/src/modules/course-arrangement/pages/constraint-rule-edit-drawer.tsx` | 规则编辑页教室类型选项是小写值 | 改为提交大写枚举值 | 前端静态检查通过 |
| `backend/src/modules/course-arrangement/rules/rule.service.ts` | 已存旧规则里的小写教室类型会继续影响调度 | 读取和保存时统一归一化为大写 | 已复测通过 |
| `frontend/src/modules/course-arrangement/pages/classroom-list.tsx` | 教室状态标签映射使用小写键，页面会显示原始枚举 | 改为使用大写状态键 | 前端静态检查通过 |
| `frontend/src/modules/course-arrangement/pages/constraint-rule-table.tsx` | 页面提供“约束强度”筛选，但前后端都不支持 | 移除无效筛选项 | 前端静态检查通过 |
| `frontend/src/modules/course-arrangement/pages/classroom-list.tsx` | 教室列表“重置”只清空表单，不刷新列表 | 重置后回到第一页并重新拉取列表 | 前端静态检查通过 |
| `frontend/src/modules/course-arrangement/pages/schedule-list.tsx` | 排课列表“重置”只清空表单，不刷新列表 | 重置后回到第一页并重新拉取列表 | 前端静态检查通过 |
| `frontend/src/modules/course-arrangement/pages/auto-schedule-management.tsx` | 自动排课页默认学期写死，概览未加载完也可启动任务 | 默认学期改为等待概览赋值；无学期或加载中时禁用启动按钮 | 前端静态检查通过 |
| `frontend/src/modules/course-arrangement/pages/timetable-view.tsx` | 课表页导出默认目标容易和当前视图脱节 | 导出默认目标改为当前选中教室或 `global/all` | 前端静态检查通过 |
| `frontend/src/modules/course-arrangement/pages/timetable-view.tsx` | 按教室查看未接入学期条件；按课程查看缺少学期筛选 | 为按教室/按课程视图补学期选择；按教室查询带上 `semesterId` | 前端静态检查通过 |
| `frontend/src/modules/course-arrangement/pages/classroom-list.tsx` | 教室页校区筛选写死，当前数据里的“测试校区”无法筛选 | 校区选项改为根据当前列表数据动态生成 | 前端静态检查通过 |
| `frontend/src/modules/course-arrangement/pages/constraint-rule-table.tsx` | 规则列表里的教室类型直接显示原始枚举 | 改为显示中文名称 | 前端静态检查通过 |
| `docker-compose.yml` | 依赖目录使用匿名卷，重建后难复用 | 改为命名卷 `stss_node_modules`、`stss_pnpm_store` | 已验证 |
| `scripts/docker-dev-bootstrap.sh` | 容器每次启动都执行 `pnpm install` | 增加依赖指纹判断，只有依赖变化时才安装 | 已验证 |

### 已验证

| 编号 | 内容 | 结果 |
| --- | --- | --- |
| `B-ENV-001` | 后端健康检查 | 通过 |
| `B-ENV-002` | 前端首页可访问 | 通过 |
| `B-ENV-003` | B 模块基础数据可读取 | 通过 |
| `B-SCH-001` | 排课更新接口 | 通过 |
| `B-SCH-002` | 排课冲突校验返回结构 | 通过 |
| `B-SCH-003` | 排课增删改查主链路 | 通过 |
| `B-TTB-002` | 按教室查询课表 | 通过 |

### 已确认问题

| 编号 | 问题 | 当前状态 |
| --- | --- | --- |
| `B-TTB-001` | 导出契约与实现不一致 | 已修，接口回归通过 |
| `B-RUL-001` | 规则里的教室类型大小写和后续调度逻辑可能不一致 | 已修，接口回归通过 |
| `B-CLS-002` | 教室表单提交扁平设备字段时，设备信息不会落库 | 已修，接口回归通过 |

### 备注

- 本轮测试中创建的临时排课和临时规则都已删除。
- 后续继续按“先测试，后修改”推进。

## 2026-05-04 第二轮处理

### 本轮只处理

| 编号 | 问题 | 处理 |
| --- | --- | --- |
| `B-TTB-002` | 按教室查询课表返回 `400` | 修正 controller 参数绑定 |

### 待复测

- 无

## 2026-05-04 第三轮处理

### 本轮只处理

| 编号 | 问题 | 处理 |
| --- | --- | --- |
| `B-ENV-004` | 依赖目录使用匿名卷 | 改为命名卷，便于复用和排查 |
| `B-ENV-005` | 每次启动都执行 `pnpm install` | 增加启动脚本，根据依赖指纹决定是否跳过安装 |

### 待验证

- `B-ENV-004`
- `B-ENV-005`

## 2026-05-04 环境根治验证

### 结果

| 编号 | 结果 | 说明 |
| --- | --- | --- |
| `B-ENV-004` | 通过 | `docker-compose config` 已显示固定命名卷 |
| `B-ENV-005` | 通过 | 第二次重建日志显示“依赖未变化，跳过 pnpm install” |
| `B-TTB-002` | 通过 | 按教室查询课表接口已返回 `200` |

### 结论

- 后端不再因为每次重建都重复执行全量依赖安装而长时间卡住。
- 第一次使用新命名卷仍会安装依赖，这属于正常初始化行为。

## 2026-05-04 教室设备字段补测

### 结果

| 编号 | 结果 | 说明 |
| --- | --- | --- |
| `B-CLS-002` | 失败 | 扁平字段创建的教室 `T901` 未保存设备信息；嵌套 `equipment` 创建的教室 `T902` 可正常返回设备信息 |

### 结论

- 后端保存链路正常。
- 当前问题在前端教室表单提交结构，与后端 schema 不一致。

## 2026-05-04 教室表单修复

### 本轮只处理

| 编号 | 问题 | 处理 |
| --- | --- | --- |
| `B-CLS-002` | 教室设备字段提交结构不对 | 表单字段改为嵌套 `equipment.*`，与后端 schema 对齐 |

### 已验证

| 编号 | 结果 | 说明 |
| --- | --- | --- |
| `B-CLS-002` | 通过 | `tsc --noEmit` 通过；嵌套 `equipment` 的新增、编辑、详情查询已回归通过 |

## 2026-05-04 导出契约修复

### 本轮只处理

| 编号 | 问题 | 处理 |
| --- | --- | --- |
| `B-TTB-001` | 导出实现只有 CSV，但前后端暴露了 `pdf/excel` | 前后端类型统一收敛为只支持 `csv`，页面下载名固定为 `.csv` |
| `B-TTB-001` | 非法格式请求被错误返回为 `500` | controller 对导出参数校验错误改为返回 `400` |

### 已验证

| 编号 | 结果 | 说明 |
| --- | --- | --- |
| `B-TTB-001` | 通过 | `format=csv` 返回 `200` 且内容类型为 `text/csv`；`format=pdf` 返回 `400`；前端 `tsc --noEmit` 通过 |

## 2026-05-05 规则枚举修复

### 本轮只处理

| 编号 | 问题 | 处理 |
| --- | --- | --- |
| `B-RUL-001` | 规则里的教室类型允许小写值，自动排课会把可用教室全部排除 | 前后端规则类型统一复用教室类型枚举，只接受大写值 |
| `B-RUL-001` | 旧规则中的小写值仍可能影响调度 | 规则服务在读取和保存时统一把教室类型归一化为大写 |

### 已验证

| 编号 | 结果 | 说明 |
| --- | --- | --- |
| `B-RUL-001` | 通过 | 小写 `lecture` 保存返回 `400`；大写 `LECTURE` 保存成功；同一门课自动排课成功率从 `0%` 恢复到 `100%`；前端 `tsc --noEmit` 通过 |

## 2026-05-05 页面点验第一轮

### 本轮只处理

| 页面 | 问题 | 处理 |
| --- | --- | --- |
| 教室列表 | 状态标签显示原始枚举 | 状态映射改为匹配后端返回的大写值 |
| 规则列表 | “约束强度”筛选无效 | 移除无效筛选项 |
| 教室列表 | “重置”不刷新列表 | 重置后自动回第一页并重新查询 |
| 排课列表 | “重置”不刷新列表 | 重置后自动回第一页并重新查询 |

### 已验证

| 内容 | 结果 | 说明 |
| --- | --- | --- |
| 页面第一轮修复 | 通过 | 前端 `tsc --noEmit` 通过 |

## 2026-05-05 页面点验第二轮

### 本轮只处理

| 页面 | 问题 | 处理 |
| --- | --- | --- |
| 自动排课页 | 默认学期写死，概览未加载时仍可启动任务 | 改为等待概览赋值；无学期或加载中禁用启动按钮 |
| 课表页 | 导出默认目标容易和当前视图脱节 | 默认导出目标改为当前选中教室或 `global/all` |

### 已验证

| 内容 | 结果 | 说明 |
| --- | --- | --- |
| 页面第二轮修复 | 通过 | 前端 `tsc --noEmit` 通过 |

## 2026-05-05 页面点验第三轮

### 本轮只处理

| 页面 | 问题 | 处理 |
| --- | --- | --- |
| 课表页 | 按教室查看未接入学期条件 | 补学期选择，并把 `semesterId` 传给按教室查询接口 |
| 课表页 | 按课程查看缺少学期筛选，课程选择粒度不清 | 补学期选择，课程下拉按当前学期过滤 |

### 已验证

| 内容 | 结果 | 说明 |
| --- | --- | --- |
| 页面第三轮修复 | 通过 | 前端 `tsc --noEmit` 通过 |

## 2026-05-05 页面点验第四轮

### 本轮只处理

| 页面 | 问题 | 处理 |
| --- | --- | --- |
| 教室页 | 校区筛选写死，无法覆盖当前数据中的所有校区 | 改为从当前列表数据动态生成校区选项 |
| 规则列表 | 教室类型显示原始枚举 | 改为显示中文名称 |

### 已验证

| 内容 | 结果 | 说明 |
| --- | --- | --- |
| 页面第四轮修复 | 通过 | 前端 `tsc --noEmit` 通过 |
