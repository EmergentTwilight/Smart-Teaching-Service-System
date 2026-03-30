/**
 * 用户管理相关类型定义
 * 包含用户查询、创建、更新的 schema 和类型
 */
import { z } from 'zod'
import { Gender, UserStatus } from '@prisma/client'

/**
 * 用户 ID 参数 schema
 */
export const userIdParamsSchema = z.object({
  id: z.string().min(1, '用户ID不能为空'),
})

/**
 * 用户和角色 ID 参数 schema
 */
export const userRoleParamsSchema = z.object({
  id: z.string().min(1, '用户ID不能为空'),
  role_id: z.string().min(1, '角色ID不能为空'),
})

/**
 * 用户查询参数 schema
 */
export const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.string().optional(),
})

/**
 * 创建用户 schema
 * 密码强度要求：至少8位，包含大小写字母和数字
 */
export const createUserSchema = z.object({
  username: z.string().min(3, '用户名至少3位').max(50, '用户名最多50位'),
  password: z
    .string()
    .min(8, '密码至少8位')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[0-9]/, '密码必须包含数字'),
  email: z.string().email('邮箱格式不正确').optional(),
  phone: z.string().optional(),
  realName: z.string().min(1, '姓名不能为空').max(50),
  gender: z.nativeEnum(Gender).optional(),
  roleIds: z.array(z.string()).optional(),
})

/**
 * 更新用户 schema
 * 密码可选，但如提供需满足强度要求
 */
export const updateUserSchema = z.object({
  email: z.string().email('邮箱格式不正确').optional(),
  phone: z.string().optional(),
  realName: z.string().min(1, '姓名不能为空').max(50).optional(),
  avatarUrl: z.string().url('头像URL格式不正确').optional(),
  gender: z.nativeEnum(Gender).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  roleIds: z.array(z.string()).optional(),
  password: z
    .string()
    .min(8, '密码至少 8 个字符')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[0-9]/, '密码必须包含数字')
    .optional(),
})

/**
 * 系统日志查询参数 schema
 */
export const getLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

/** 系统日志查询参数类型 */
export type GetLogsQuery = z.infer<typeof getLogsQuerySchema>

/** 用户查询参数类型 */
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>
/** 创建用户输入类型 */
export type CreateUserInput = z.infer<typeof createUserSchema>
/** 更新用户输入类型 */
export type UpdateUserInput = z.infer<typeof updateUserSchema>

// ==================== 批量操作 Schema ====================

/**
 * 批量创建用户 schema
 * 每个用户的密码强度要求同 createUserSchema
 */
export const batchCreateUsersSchema = z.object({
  users: z
    .array(
      z.object({
        username: z.string().min(3, '用户名至少3位').max(50, '用户名最多50位'),
        password: z
          .string()
          .min(8, '密码至少8位')
          .regex(/[A-Z]/, '密码必须包含大写字母')
          .regex(/[a-z]/, '密码必须包含小写字母')
          .regex(/[0-9]/, '密码必须包含数字'),
        email: z.string().email('邮箱格式不正确').optional(),
        phone: z.string().optional(),
        realName: z.string().min(1, '姓名不能为空').max(50),
        gender: z.nativeEnum(Gender).optional(),
        roleIds: z.array(z.string()).optional(),
      })
    )
    .min(1, '至少需要一个用户')
    .max(100, '单次最多创建100个用户'),
})

/**
 * 批量修改用户状态 schema
 */
export const batchUpdateStatusSchema = z
  .object({
    userIds: z.array(z.string()).min(1, '至少需要一个用户ID').max(100, '单次最多修改100个用户'),
    status: z.nativeEnum(UserStatus).optional(),
    roleIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) => data.status !== undefined || (data.roleIds !== undefined && data.roleIds.length > 0),
    {
      message: '至少需要提供状态或角色之一',
    }
  )

/**
 * 修改密码 schema
 */
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z
    .string()
    .min(8, '密码至少8位')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[0-9]/, '密码必须包含数字'),
})

/**
 * 重置密码 schema（管理员操作）
 */
export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, '密码至少8位')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[0-9]/, '密码必须包含数字'),
})

/**
 * 修改用户状态 schema
 */
export const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
})

/**
 * 分配角色 schema
 */
export const assignRolesSchema = z.object({
  roleIds: z.array(z.string()).min(1, '至少需要一个角色ID'),
})

/** 批量创建用户输入类型 */
export type BatchCreateUsersInput = z.infer<typeof batchCreateUsersSchema>
/** 批量修改状态输入类型 */
export type BatchUpdateStatusInput = z.infer<typeof batchUpdateStatusSchema>
/** 修改密码输入类型 */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
/** 重置密码输入类型 */
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
/** 修改状态输入类型 */
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
/** 分配角色输入类型 */
export type AssignRolesInput = z.infer<typeof assignRolesSchema>
