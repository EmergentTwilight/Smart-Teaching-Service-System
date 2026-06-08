/**
 * Commitlint 配置
 * 规范 Git 提交信息格式
 *
 * 提交格式: type(scope): subject
 *
 * type 类型：
 * - feat: 新功能
 * - fix: 修复 bug
 * - docs: 文档变更
 * - style: 代码格式（不影响功能）
 * - refactor: 重构
 * - perf: 性能优化
 * - test: 测试相关
 * - chore: 构建/工具变更
 * - revert: 回滚提交
 *
 * scope 范围（符合项目 PR Check 要求）：
 * - A: 用户管理模块 (Subsystem A)
 * - B: 排课模块 (Subsystem B)
 * - C: 选课模块 (Subsystem C)
 * - D: 论坛模块 (Subsystem D)
 * - E: 在线测试模块 (Subsystem E)
 * - F: 成绩模块 (Subsystem F)
 * - shared: 共享模块
 * - db: 数据库相关
 * - ci: CI/CD 相关
 * - deps: 依赖更新
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // type 必须是小写
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert'],
    ],
    // scope 必须是指定的值之一
    'scope-enum': [
      2,
      'always',
      [
        'A', // 用户管理模块
        'B', // 排课模块
        'C', // 选课模块
        'D', // 论坛模块
        'E', // 在线测试模块
        'F', // 成绩模块
        'shared', // 共享模块
        'db', // 数据库相关
        'ci', // CI/CD 相关
        'deps', // 依赖更新
      ],
    ],
    // scope 为空时警告（允许无 scope）
    'scope-empty': [1, 'never'],
    // subject 不能为空
    'subject-empty': [2, 'never'],
    // subject 不能以句号结尾
    'subject-full-stop': [2, 'never', '.'],
    // subject 最大长度 72 字符
    'subject-max-length': [2, 'always', 72],
    // type 不能为空
    'type-empty': [2, 'never'],
    // 整行最大长度 100 字符
    'header-max-length': [2, 'always', 100],
  },
}
