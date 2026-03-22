// 共享类型定义

// ==================== 用户相关 ====================

export type UserRole = 'student' | 'teacher' | 'admin' | 'super_admin' | 'security_admin'
export type UserStatus = 'active' | 'inactive' | 'banned'
export type Gender = 'male' | 'female' | 'other'

export interface User {
  id: string
  username: string
  email: string | null
  phone: string | null
  realName: string
  avatarUrl: string | null
  gender: Gender | null
  status: UserStatus
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  roles: UserRole[]
}

export interface Student extends User {
  studentNumber: string
  majorId: string | null
  grade: number
  className: string | null
}

export interface Teacher extends User {
  teacherNumber: string
  departmentId: string | null
  title: string | null
  officeLocation: string | null
}

export interface Admin extends User {
  adminType: 'academic' | 'super' | 'security'
  departmentId: string | null
}

// ==================== 认证相关 ====================

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
}

export interface RegisterRequest {
  username: string
  password: string
  email?: string
  realName: string
  gender?: Gender
  phone?: string
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

// ==================== 院系专业相关 ====================

export interface Department {
  id: string
  name: string
  code: string | null
  description: string | null
}

export interface Major {
  id: string
  departmentId: string
  name: string
  code: string | null
  degreeType: 'bachelor' | 'master' | 'doctor' | null
  totalCredits: number | null
}

// ==================== API 响应类型 ====================

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PaginatedData<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ApiError {
  code: number
  message: string
  errors?: Array<{
    field: string
    message: string
  }>
}

// ==================== 枚举常量 ====================

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: '正常',
  inactive: '停用',
  banned: '封禁'
}

export const GENDER_LABELS: Record<Gender, string> = {
  male: '男',
  female: '女',
  other: '其他'
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
  super_admin: '超级管理员',
  security_admin: '安全管理员'
}
