/**
 * 用户模块相关常量
 */

// ==================== 用户状态配置 ====================

/** 用户状态配置（颜色和文本） */
export const USER_STATUS_CONFIG: Record<string, { color: string; text: string }> = {
  ACTIVE: { color: 'success', text: '正常' },
  INACTIVE: { color: 'default', text: '禁用' },
  BANNED: { color: 'error', text: '封禁' },
} as const

/** 用户角色标签映射 */
export const USER_ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  teacher: '教师',
  student: '学生',
  super_admin: '超级管理员',
} as const

// ==================== 日志配置 ====================

/** 操作类型颜色映射 */
export const ACTION_COLOR_MAP: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOGIN: 'cyan',
  LOGOUT: 'orange',
} as const

// ==================== 分页配置 ====================

/** 默认分页大小 */
export const DEFAULT_PAGE_SIZE = 10

/** 日志页面默认分页大小 */
export const DEFAULT_LOG_PAGE_SIZE = 20

// ==================== 文件上传配置 ====================

/** 文件上传大小限制（5MB） */
export const MAX_FILE_SIZE = 5 * 1024 * 1024
