# 初步开发进展

## 1. 已完成功能 (更新于 0413)

目前已完成以下前端页面的开发：

- 教室管理页 (教室管理) (0408)

- 自动排课页 (排课任务) (0413)

- 排课编辑页 (手动排课) (0411)

- 课表查询页 (课表查看) (0411)

## 2. 目录结构说明 (更新于 0413)

为保证项目规范的统一性, 前端页面目录已严格按照总开发文档中的规范进行划分(未使用 B 小组的 3.4 推荐目录), 新增的目录结构如下:

```
.
├── Readme.md
├── api
│   ├── auto-schedule.ts
│   ├── classrooms.ts
│   ├── schedules.ts
│   └── timetables.ts
├── components
├── hooks
├── pages
│   ├── auto-schedule-management.tsx
│   ├── classroom-edit.tsx
│   ├── classroom-list.tsx
│   ├── schedule-edit.tsx
│   ├── schedule-list.tsx
│   └── timetable-view.tsx
└── types
    ├── auto-schedule.ts
    ├── classroom.ts
    └── schedule.ts

6 directories, 14 files
```

## 3. 待确认与待开发项 (更新于 0413)

新增页面 (排课任务) 暂未进行单独功能测试.

总体未与后端联合测试.

有问题请联系 @刘锋锋 来修.

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
