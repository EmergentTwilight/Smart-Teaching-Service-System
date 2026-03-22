/**
 * 用户管理相关类型定义
 * 包含用户查询、创建、更新的 schema 和类型
 */
import { z } from 'zod'

/**
 * 用户查询参数 schema
 */
export const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED']).optional(),
  role: z.string().optional(),
})

/**
 * 创建用户 schema
 */
export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  realName: z.string().min(1).max(50),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  roleIds: z.array(z.string()).optional(),
})

/**
 * 更新用户 schema
 */
export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  realName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED']).optional(),
  password: z.string().min(6).optional(),
  roleIds: z.array(z.string()).optional(),
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
