// 共享类型定义

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
  GPARecord,
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

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: UserType
}

export interface RegisterRequest {
  username: string
  password: string
  email?: string
  realName: string
  gender?: GenderType
  phone?: string
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
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

import type { UserStatus, Gender } from '@prisma/client'

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: '正常',
  INACTIVE: '停用',
  BANNED: '封禁'
}

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: '男',
  FEMALE: '女',
  OTHER: '其他'
}

// 用户角色标签（自定义，非 Prisma 枚举）
export type UserRoleType = 'student' | 'teacher' | 'admin' | 'super_admin' | 'security_admin'

export const USER_ROLE_LABELS: Record<UserRoleType, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
  super_admin: '超级管理员',
  security_admin: '安全管理员'
}
