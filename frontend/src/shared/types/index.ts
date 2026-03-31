/**
 * 前端共享类型定义
 * 从 @stss/shared 重导出类型，确保前后端类型一致
 */

// ==================== 从 @stss/shared 导入核心类型 ====================
import type {
  // 认证相关
  LoginRequest as SharedLoginRequest,
  LoginResponse as SharedLoginResponse,
  RefreshTokenResponse as SharedRefreshTokenResponse,
  AuthUserDto as SharedAuthUserDto,
  // API 响应
  ApiResponse as SharedApiResponse,
  PaginatedData as SharedPaginatedData,
  ApiError as SharedApiError,
  // 枚举
  UserRoleType as SharedUserRoleType,
} from '@stss/shared'

// 重导出认证类型（重命名以符合前端命名规范）
export type LoginRequest = SharedLoginRequest
export type LoginResponse = SharedLoginResponse
export type RefreshTokenResponse = SharedRefreshTokenResponse
export type AuthUserDto = SharedAuthUserDto

// 重导出 API 类型
export type ApiResponse<T = unknown> = SharedApiResponse<T>
export type PaginatedData<T> = SharedPaginatedData<T>
export type ApiError = SharedApiError

// ==================== 前端特定类型 ====================

/** 验证错误 */
export interface ValidationError {
  field: string
  message: string
}

/** API 错误响应（用于 AxiosError） */
export interface ApiErrorResponse {
  message?: string
  error?: string
  statusCode?: number
}

// ==================== 枚举类型重定义（前端使用） ====================

/** 性别（前端使用大写值） */
export type FrontendGender = 'MALE' | 'FEMALE' | 'OTHER'

/** 用户状态（前端使用大写值） */
export type FrontendUserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED'

/** 用户角色类型 */
export type UserRoleType = SharedUserRoleType

// ==================== 枚举标签 ====================

/** 用户状态标签 */
export const USER_STATUS_LABELS: Record<FrontendUserStatus, string> = {
  ACTIVE: '启用',
  INACTIVE: '禁用',
  BANNED: '封禁',
}

/** 性别标签 */
export const GENDER_LABELS: Record<FrontendGender, string> = {
  MALE: '男',
  FEMALE: '女',
  OTHER: '其他',
}

/** 用户角色标签 */
export const USER_ROLE_LABELS: Record<UserRoleType, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
  super_admin: '超级管理员',
  security_admin: '安全管理员',
}

// ==================== 扩展用户类型 ====================

/** 用户详情（包含关联信息，用于用户管理页面） */
export interface UserDetail {
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
  gender: FrontendGender | null
  /** 状态 */
  status: FrontendUserStatus
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
  gender?: FrontendGender
  /** 状态 */
  status?: FrontendUserStatus
  /** 角色ID列表 */
  roleIds?: string[]
}
