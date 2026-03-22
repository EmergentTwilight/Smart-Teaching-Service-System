import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(6, '密码至少6位'),
})

export const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3位').max(50, '用户名最多50位'),
  password: z.string().min(6, '密码至少6位'),
  email: z.string().email('邮箱格式不正确').optional(),
  realName: z.string().min(1, '姓名不能为空').max(50),
  phone: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
})

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z.string().min(6, '新密码至少6位'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
