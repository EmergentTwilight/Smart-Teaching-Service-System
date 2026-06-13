/**
 * 用户管理相关类型定义
 * 包含用户查询、创建、更新的 schema 和类型
 */
import { z } from 'zod'
import { AdminType, Gender, UserStatus } from '@prisma/client'

const normalizeKeys = (
  input: unknown,
  aliases: Record<string, string>
): Record<string, unknown> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {}
  }

  const data = { ...(input as Record<string, unknown>) }
  for (const [from, to] of Object.entries(aliases)) {
    if (data[to] === undefined && data[from] !== undefined) {
      data[to] = data[from]
    }
  }
  return data
}

const userFieldAliases = {
  real_name: 'realName',
  avatar_url: 'avatarUrl',
  role_ids: 'roleIds',
} satisfies Record<string, string>

const studentFieldAliases = {
  student_number: 'studentNumber',
  major_id: 'majorId',
  class_name: 'className',
} satisfies Record<string, string>

const teacherFieldAliases = {
  teacher_number: 'teacherNumber',
  department_id: 'departmentId',
  office_location: 'officeLocation',
} satisfies Record<string, string>

const adminFieldAliases = {
  admin_type: 'adminType',
  department_id: 'departmentId',
} satisfies Record<string, string>

const paginationAliases = {
  page_size: 'pageSize',
} satisfies Record<string, string>

const logQueryAliases = {
  page_size: 'pageSize',
  user_id: 'userId',
  resource_type: 'resourceType',
  start_date: 'startDate',
  end_date: 'endDate',
} satisfies Record<string, string>

const booleanQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return value
}, z.boolean().optional())

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
export const getUsersQuerySchema = z.preprocess(
  (input) => normalizeKeys(input, paginationAliases),
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    keyword: z.string().optional(),
    status: z.nativeEnum(UserStatus).optional(),
    role: z.string().optional(),
    include_deleted: booleanQuerySchema,
  })
)

/**
 * 创建用户 schema
 * 密码强度要求：至少8位，包含大小写字母和数字
 */
export const createUserSchema = z.preprocess(
  (input) => normalizeKeys(input, userFieldAliases),
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
    student: z
      .preprocess(
        (input) => normalizeKeys(input, studentFieldAliases),
        z.object({
          studentNumber: z.string().min(1, '学号不能为空').max(20),
          majorId: z.string().optional(),
          grade: z.coerce.number().int().min(1900).max(2100),
          className: z.string().max(20).optional(),
        })
      )
      .optional(),
    teacher: z
      .preprocess(
        (input) => normalizeKeys(input, teacherFieldAliases),
        z.object({
          teacherNumber: z.string().min(1, '工号不能为空').max(20),
          departmentId: z.string().optional(),
          title: z.string().max(50).optional(),
          officeLocation: z.string().max(100).optional(),
        })
      )
      .optional(),
    admin: z
      .preprocess(
        (input) => normalizeKeys(input, adminFieldAliases),
        z.object({
          adminType: z.nativeEnum(AdminType),
          departmentId: z.string().optional(),
        })
      )
      .optional(),
  })
)

/**
 * 更新用户 schema
 * 密码可选，但如提供需满足强度要求
 */
export const updateUserSchema = z.preprocess(
  (input) => normalizeKeys(input, userFieldAliases),
  z.object({
    email: z.string().email('邮箱格式不正确').optional(),
    phone: z.string().optional(),
    realName: z.string().min(1, '姓名不能为空').max(50).optional(),
    avatarUrl: z.string().url('头像URL格式不正确').optional(),
    gender: z.nativeEnum(Gender).optional(),
    roleIds: z.array(z.string()).optional(),
  })
)

/**
 * 系统日志查询参数 schema
 */
export const getLogsQuerySchema = z.preprocess(
  (input) => normalizeKeys(input, logQueryAliases),
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    userId: z.string().optional(),
    action: z.string().optional(),
    resourceType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
)

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
      z.preprocess(
        (input) => normalizeKeys(input, userFieldAliases),
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
          student: z
            .preprocess(
              (input) => normalizeKeys(input, studentFieldAliases),
              z.object({
                studentNumber: z.string().min(1, '学号不能为空').max(20),
                majorId: z.string().optional(),
                grade: z.coerce.number().int().min(1900).max(2100),
                className: z.string().max(20).optional(),
              })
            )
            .optional(),
          teacher: z
            .preprocess(
              (input) => normalizeKeys(input, teacherFieldAliases),
              z.object({
                teacherNumber: z.string().min(1, '工号不能为空').max(20),
                departmentId: z.string().optional(),
                title: z.string().max(50).optional(),
                officeLocation: z.string().max(100).optional(),
              })
            )
            .optional(),
          admin: z
            .preprocess(
              (input) => normalizeKeys(input, adminFieldAliases),
              z.object({
                adminType: z.nativeEnum(AdminType),
                departmentId: z.string().optional(),
              })
            )
            .optional(),
        })
      )
    )
    .min(1, '至少需要一个用户')
    .max(100, '单次最多创建100个用户'),
})

/**
 * 批量修改用户状态 schema
 */
export const batchUpdateStatusSchema = z.preprocess(
  (input) =>
    normalizeKeys(input, {
      user_ids: 'userIds',
      role_ids: 'roleIds',
    }),
  z
    .object({
      userIds: z.array(z.string()).min(1, '至少需要一个用户ID').max(100, '单次最多修改100个用户'),
      status: z.nativeEnum(UserStatus).optional(),
      roleIds: z.array(z.string()).optional(),
      reason: z.string().max(200, '原因不能超过 200 个字符').optional(),
    })
    .refine(
      (data) =>
        data.status !== undefined || (data.roleIds !== undefined && data.roleIds.length > 0),
      {
        message: '至少需要提供状态或角色之一',
      }
    )
)

/**
 * 修改密码 schema
 */
export const changePasswordSchema = z.preprocess(
  (input) =>
    normalizeKeys(input, {
      old_password: 'oldPassword',
      new_password: 'newPassword',
    }),
  z.object({
    oldPassword: z.string().min(1, '旧密码不能为空'),
    newPassword: z
      .string()
      .min(8, '密码至少8位')
      .regex(/[A-Z]/, '密码必须包含大写字母')
      .regex(/[a-z]/, '密码必须包含小写字母')
      .regex(/[0-9]/, '密码必须包含数字'),
  })
)

/**
 * 重置密码 schema（管理员操作）
 */
export const resetPasswordSchema = z.preprocess(
  (input) =>
    normalizeKeys(input, {
      new_password: 'newPassword',
    }),
  z.object({
    newPassword: z
      .string()
      .min(8, '密码至少8位')
      .regex(/[A-Z]/, '密码必须包含大写字母')
      .regex(/[a-z]/, '密码必须包含小写字母')
      .regex(/[0-9]/, '密码必须包含数字'),
  })
)

/**
 * 修改用户状态 schema
 */
export const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
  reason: z.string().optional(),
})

/**
 * 分配角色 schema
 */
export const assignRolesSchema = z.preprocess(
  (input) => normalizeKeys(input, { role_ids: 'roleIds' }),
  z.object({
    roleIds: z.array(z.string()).min(1, '至少需要一个角色ID'),
  })
)

// ==================== 令牌管理 Schema ====================

/**
 * 令牌 ID 参数 schema（用于吊销指定令牌）
 */
export const tokenParamsSchema = z.object({
  id: z.string().min(1, '用户ID不能为空'),
  token_id: z.string().min(1, '令牌ID不能为空'),
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
/**
 * 更新学生专业 schema
 */
export const updateStudentMajorSchema = z.preprocess(
  (input) => normalizeKeys(input, { major_id: 'majorId' }),
  z.object({
    majorId: z.string().min(1, '专业ID不能为空'),
  })
)

/**
 * 更新教师/管理员院系 schema
 */
export const updateDepartmentSchema = z.preprocess(
  (input) => normalizeKeys(input, { department_id: 'departmentId' }),
  z.object({
    departmentId: z.string().min(1, '院系ID不能为空'),
  })
)

/** 令牌参数类型 */
export type TokenParams = z.infer<typeof tokenParamsSchema>
/** 更新学生专业输入类型 */
export type UpdateStudentMajorInput = z.infer<typeof updateStudentMajorSchema>
/** 更新院系输入类型 */
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>
