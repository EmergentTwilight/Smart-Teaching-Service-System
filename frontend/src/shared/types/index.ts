/**
 * 前端共享类型定义
 *
 * 共享类型从 @stss/shared 导入
 * 这里只保留前端特有的类型定义
 */

// ==================== 从共享包导入类型 ====================
export type {
  LoginRequest,
  LoginResponse,
  ApiResponse,
  PaginatedData,
  ApiError,
} from '@stss/shared'

export {
  Gender,
  UserStatus,
  USER_STATUS_LABELS,
  GENDER_LABELS,
  type UserRoleType,
  USER_ROLE_LABELS,
} from '@stss/shared'

// ==================== 前端特有类型 ====================

/** 用户信息（前端扩展版本，包含关联信息） */
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
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  /** 状态 */
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED'
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
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  /** 状态 */
  status?: 'ACTIVE' | 'INACTIVE' | 'BANNED'
  /** 角色ID列表 */
  roleIds?: string[]
}
