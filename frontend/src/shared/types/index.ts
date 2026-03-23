/**
 * 前端共享类型定义
 */

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

/** 登录请求 */
export interface LoginRequest {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
}

/** 登录响应 */
export interface LoginResponse {
  /** 访问令牌 */
  accessToken: string
  /** 过期时间（秒） */
  expiresIn: number
  /** 用户信息 */
  user: User
}

/** API 响应结构 */
export interface ApiResponse<T = unknown> {
  /** 状态码 */
  code: number
  /** 响应消息 */
  message: string
  /** 响应数据 */
  data: T
}

/** 分页数据结构 */
export interface PaginatedData<T> {
  /** 数据项列表 */
  items: T[]
  /** 分页信息 */
  pagination: {
    /** 当前页码 */
    page: number
    /** 每页数量 */
    pageSize: number
    /** 总数量 */
    total: number
    /** 总页数 */
    totalPages: number
  }
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
