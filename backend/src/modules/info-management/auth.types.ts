/**
 * 认证相关类型定义
 * 包含登录、注册、修改密码的 schema 和类型
 */
import { z } from 'zod'
import { Gender } from '@prisma/client'

/**
 * 登录请求验证 schema
 * 登录时只检查密码非空，不限制密码格式（用户可能使用简单密码）
 */
export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
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
  gender: z.nativeEnum(Gender).optional(),
})

/**
 * 修改密码请求验证 schema
 * 新密码需满足强度要求：至少8位，包含大小写字母和数字
 */
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z
    .string()
    .min(8, '新密码至少8位')
    .regex(/[A-Z]/, '新密码必须包含大写字母')
    .regex(/[a-z]/, '新密码必须包含小写字母')
    .regex(/[0-9]/, '新密码必须包含数字'),
})

/**
 * 刷新令牌请求验证 schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, '刷新令牌不能为空'),
})

/**
 * 激活账号请求验证 schema
 */
export const activateAccountSchema = z.object({
  token: z.string().min(1, '激活令牌不能为空'),
})

/**
 * 忘记密码请求验证 schema
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
})

/**
 * 重置密码请求验证 schema
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, '重置令牌不能为空'),
    newPassword: z
      .string()
      .min(8, '新密码至少8位')
      .regex(/[A-Z]/, '新密码必须包含大写字母')
      .regex(/[a-z]/, '新密码必须包含小写字母')
      .regex(/[0-9]/, '新密码必须包含数字'),
    confirmPassword: z.string().min(8, '确认密码至少8位'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次输入的新密码不一致',
    path: ['confirmPassword'],
  })

/** 登录输入类型 */
export type LoginInput = z.infer<typeof loginSchema>
/** 注册输入类型 */
export type RegisterInput = z.infer<typeof registerSchema>
/** 修改密码输入类型 */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
/** 刷新令牌输入类型 */
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
/** 激活账号输入类型 */
export type ActivateAccountInput = z.infer<typeof activateAccountSchema>
/** 忘记密码输入类型 */
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
/** 重置密码输入类型 */
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
