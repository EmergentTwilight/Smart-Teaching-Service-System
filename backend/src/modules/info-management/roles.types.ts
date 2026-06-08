/**
 * 角色权限管理相关类型定义
 * 包含角色 CRUD、权限查询、角色-权限关系维护等操作所需的类型定义
 */
import { z } from 'zod'

// ==================== 角色相关 Schema ====================

/**
 * 角色 ID 参数 schema
 */
export const roleIdSchema = z.object({
  id: z.string().min(1, '角色ID不能为空'),
})

/**
 * 角色权限参数 schema（用于撤销权限）
 */
export const rolePermissionParamsSchema = z.object({
  id: z.string().min(1, '角色ID不能为空'),
  permission_id: z.string().min(1, '权限ID不能为空'),
})

/**
 * 查询角色列表请求验证 schema
 */
export const getRoleListSchema = z.object({
  keyword: z.string().optional(),
  builtin: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true
      if (val === 'false') return false
      return undefined
    }),
})

/**
 * 创建角色请求验证 schema
 * name 和 code 字段限制与数据库 Role 表一致
 */
export const createRoleSchema = z.object({
  code: z.string().min(1, '角色代码不能为空').max(50, '角色代码最多50位'),
  name: z.string().min(1, '角色名称不能为空').max(50, '角色名称最多50位'),
  description: z.string().optional(),
  permission_ids: z.array(z.string().uuid('权限ID格式不正确')).optional(),
})

/**
 * 更新角色请求验证 schema
 */
export const updateRoleSchema = z.object({
  name: z.string().min(1, '角色名称不能为空').max(50, '角色名称最多50位').optional(),
  description: z.string().optional(),
})

/**
 * 分配权限请求验证 schema
 */
export const assignPermissionsSchema = z.object({
  permission_ids: z.array(z.string().uuid('权限ID格式不正确')).min(1, '至少需要一个权限ID'),
})

// ==================== 权限相关 Schema ====================

/**
 * 查询权限列表请求验证 schema
 */
export const getPermissionListSchema = z.object({
  resource: z.string().optional(),
  action: z.string().optional(),
  keyword: z.string().optional(),
})

// ==================== 类型导出 ====================

export type RoleIdParams = z.infer<typeof roleIdSchema>
export type RolePermissionParams = z.infer<typeof rolePermissionParamsSchema>
export type GetRoleListInput = z.infer<typeof getRoleListSchema>
export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>
export type GetPermissionListInput = z.infer<typeof getPermissionListSchema>
