/**
 * 共享类型定义
 * 导出 Prisma 类型和自定义业务类型
 */

// ==================== Prisma 类型重导出 ====================

/**
 * 重导出 Prisma 生成的所有类型
 * 运行 `npx prisma generate` 后自动生成
 */

// 先导入类型（用于本地引用）
import type {
  User as UserType,
  Gender as GenderType,
  UserStatus as UserStatusType,
} from '@prisma/client'

// 导出所有 Model 类型
export type {
  User,
  Student,
  Teacher,
  Admin,
  Department,
  Major,
  Role,
  Permission,
  UserRole,
  RolePermission,
  SystemLog,
  Classroom,
  Schedule,
  Semester,
  Course,
  CourseOffering,
  Curriculum,
  CurriculumCourse,
  CoursePrerequisite,
  Enrollment,
  SelectionPeriod,
  ForumPost,
  ForumComment,
  ForumAttachment,
  QuestionBank,
  Question,
  QuestionOption,
  TestPaper,
  TestQuestion,
  TestResult,
  Answer,
  Score,
  ScoreModificationLog,
} from '@prisma/client'

// 导出所有枚举类型
export {
  Gender,
  UserStatus,
  AdminType,
  DegreeType,
  RoomType,
  RoomStatus,
  SemesterStatus,
  CourseType,
  CourseStatus,
  OfferingStatus,
  EnrollmentStatus,
  SelectionPhase,
  PostType,
  PostStatus,
  QuestionType,
  Difficulty,
  BankStatus,
  PaperStatus,
  TestStatus,
  ScoreStatus,
  Prisma, // Prisma 命名空间（包含工具类型）
} from '@prisma/client'

// 导出 Prisma Client（用于类型推导）
export { PrismaClient } from '@prisma/client'

// ==================== 认证相关 ====================

/** 登录请求 */
export interface LoginRequest {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
}

/** 角色详情 */
export interface RoleDetail {
  /** 角色代码 */
  code: string
  /** 角色名称 */
  name: string
}

/**
 * 认证用户 DTO
 * 登录/刷新令牌时返回的用户信息结构
 */
export interface AuthUserDto {
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
  gender: GenderType | null
  /** 状态（小写） */
  status: 'active' | 'inactive' | 'banned'
  /** 最后登录时间 */
  lastLoginAt: Date | null
  /** 角色代码列表 */
  roles: string[]
  /** 角色详情列表 */
  roleDetails?: RoleDetail[]
  /** 权限列表 */
  permissions: string[]
}

/** 登录响应 */
export interface LoginResponse {
  /** 访问令牌 */
  accessToken: string
  /** 刷新令牌 */
  refreshToken: string
  /** 过期时间（秒） */
  expiresIn: number
  /** 令牌类型 */
  tokenType: 'Bearer'
  /** 用户信息 */
  user: AuthUserDto
}

/** 刷新令牌响应 */
export interface RefreshTokenResponse {
  /** 访问令牌 */
  accessToken: string
  /** 刷新令牌 */
  refreshToken: string
  /** 过期时间（秒） */
  expiresIn: number
  /** 令牌类型 */
  tokenType: 'Bearer'
}

/** 注册请求 */
export interface RegisterRequest {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 邮箱 */
  email?: string
  /** 真实姓名 */
  realName: string
  /** 性别 */
  gender?: GenderType
  /** 手机号 */
  phone?: string
}

/** 修改密码请求 */
export interface ChangePasswordRequest {
  /** 旧密码 */
  oldPassword: string
  /** 新密码 */
  newPassword: string
}

// ==================== API 响应类型 ====================

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

/** API 错误响应 */
export interface ApiError {
  /** 错误码 */
  code: number
  /** 错误消息 */
  message: string
  /** 错误详情 */
  errors?: Array<{
    /** 字段名 */
    field: string
    /** 错误消息 */
    message: string
  }>
}

// ==================== 枚举常量 ====================

import type { UserStatus, Gender } from '@prisma/client'

/** 用户状态标签映射 */
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: '正常',
  INACTIVE: '停用',
  BANNED: '封禁',
}

/** 性别标签映射 */
export const GENDER_LABELS: Record<Gender, string> = {
  MALE: '男',
  FEMALE: '女',
  OTHER: '其他',
}

/** 用户角色类型（自定义，非 Prisma 枚举） */
export type UserRoleType = 'student' | 'teacher' | 'admin' | 'super_admin' | 'security_admin'

/** 用户角色标签映射 */
export const USER_ROLE_LABELS: Record<UserRoleType, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
  super_admin: '超级管理员',
  security_admin: '安全管理员',
}
