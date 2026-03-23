/**
 * 认证相关类型定义
 * 包含登录、注册、修改密码的 schema 和类型
 */
import { z } from 'zod'

/**
 * 登录请求验证 schema
 */
export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(6, '密码至少6位'),
})

/**
 * 注册请求验证 schema
 * 密码强度要求：至少8位，包含大小写字母和数字
 */
export const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3位').max(50, '用户名最多50位'),
  password: z
    .string()
    .min(8, '密码至少8位')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[0-9]/, '密码必须包含数字'),
  email: z.string().email('邮箱格式不正确').optional(),
  realName: z.string().min(1, '姓名不能为空').max(50),
  phone: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
})

/**
 * 修改密码请求验证 schema
 */
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z.string().min(6, '新密码至少6位'),
})

/** 登录输入类型 */
export type LoginInput = z.infer<typeof loginSchema>
/** 注册输入类型 */
export type RegisterInput = z.infer<typeof registerSchema>
/** 修改密码输入类型 */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
