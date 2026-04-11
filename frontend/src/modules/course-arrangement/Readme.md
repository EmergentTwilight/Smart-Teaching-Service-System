# 初步开发进展

## 1. 已完成功能

目前已完成以下前端页面的开发：

- 教室管理页 (教室管理)

- 排课编辑页 (手动排课)

- 课表查询页 (课表查看)

## 2. 目录结构说明

为保证项目规范的统一性, 前端页面目录已严格按照总开发文档中的规范进行划分(未使用 B 小组的 3.4 推荐目录), 新增的目录结构如下:

```
.
├── Readme.md
├── api
│   ├── classrooms.ts
│   ├── schedules.ts
│   └── timetables.ts
├── components
├── hooks
├── pages
│   ├── classroom-edit.tsx
│   ├── classroom-list.tsx
│   ├── schedule-edit.tsx
│   ├── schedule-list.tsx
│   └── timetable-view.tsx
└── types
    ├── classroom.ts
    └── schedule.ts

6 directories, 11 files
```

## 3. 待确认与待开发项

主页面中的 **"排课任务"** 页面暂未进行设计开发。

原因: 目前的业务流程是 "手动排课 -> 校验冲突 -> 无冲突时写入 Schedule" , 暂未涉及自动排课逻辑. 大概看了一下, 后端目前也暂无对应的自动排课接口. 或许要看下后续怎么安排.

## 4. 其他

修复了不同环境下运行 `lint-staged` 校验时报错的问题:

原因: 原配置使用 `cd frontend && ...`, 在本人电脑系统的 `lint-staged` 子进程中无法识别 `cd` 等命令，导致 [ENOENT] 报错. 于是修改:

```json
// 原配置
"frontend/**/*.{ts,tsx}": ["cd frontend && pnpm exec eslint --fix"],
// 修改后
"frontend/**/*.{ts,tsx}": ["pnpm --dir frontend exec eslint --fix"],
```

效果是一样的.
