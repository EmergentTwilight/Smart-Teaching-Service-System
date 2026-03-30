/**
 * 前端共享类型定义
 */

// ==================== 枚举类型 ====================

/** 性别 */
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

/** 用户状态 */
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED'

/** 用户角色类型 */
export type UserRoleType = 'admin' | 'teacher' | 'student'

/** 用户状态标签 */
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: '启用',
  INACTIVE: '禁用',
  BANNED: '封禁',
}

/** 性别标签 */
export const GENDER_LABELS: Record<Gender, string> = {
  MALE: '男',
  FEMALE: '女',
  OTHER: '其他',
}

/** 用户角色标签 */
export const USER_ROLE_LABELS: Record<UserRoleType, string> = {
  admin: '管理员',
  teacher: '教师',
  student: '学生',
}

// ==================== API 类型 ====================

/** 登录请求 */
export interface LoginRequest {
  username: string
  password: string
}

/** 登录响应 */
export interface LoginResponse {
  /** 访问令牌 */
  accessToken: string
  /** 刷新令牌（可选） */
  refreshToken?: string
  /** 用户信息 */
  user: User
}

/** API 响应 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}

/** 分页数据 */
export interface PaginatedData<T> {
  /** 数据列表 */
  items: T[]
  /** 总数 */
  total: number
  /** 当前页 */
  page: number
  /** 每页数量 */
  pageSize: number
  /** 总页数 */
  totalPages: number
  /** 分页信息（兼容后端格式） */
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/** API 错误 */
export interface ApiError {
  code: number
  message: string
  errors?: unknown
}

/** API 错误响应（用于 AxiosError） */
export interface ApiErrorResponse {
  message?: string
  error?: string
  statusCode?: number
}

// ==================== 用户类型 ====================

/** 用户信息 */
export interface User {
  /** 用户ID */
  id: string
  /** 用户名 */
  username: string
  /** 邮箱 */
  email: string | null
  /** 手机号 */
  phone: string | null
  /** 真实姓名 */
  realName: string
  /** 头像URL */
  avatarUrl: string | null
  /** 性别 */
  gender: Gender | null
  /** 状态 */
  status: UserStatus
  /** 角色列表 */
  roles: string[]
  /** 学生信息（如果用户是学生） */
  student?: {
    studentNumber: string
    grade: number
    className?: string
    majorId?: string
  } | null
  /** 教师信息（如果用户是教师） */
  teacher?: {
    teacherNumber: string
    title?: string
    officeLocation?: string
    departmentId?: string
  } | null
  /** 管理员信息（如果用户是管理员） */
  admin?: {
    adminType: 'SUPER' | 'DEPARTMENT' | 'SECURITY'
    departmentId?: string
  } | null
  /** 最后登录时间 */
  lastLoginAt: string | null
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 用户表单数据 */
export interface UserFormData {
  /** 用户名 */
  username: string
  /** 邮箱 */
  email?: string
  /** 真实姓名 */
  realName: string
  /** 密码 */
  password?: string
  /** 手机号 */
  phone?: string
  /** 性别 */
  gender?: Gender
  /** 状态 */
  status?: UserStatus
  /** 角色ID列表 */
  roleIds?: string[]
}
