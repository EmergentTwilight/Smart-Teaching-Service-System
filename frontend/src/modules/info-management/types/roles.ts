/**
 * 角色权限与令牌相关类型定义
 */

export interface Permission {
  id: string
  code: string
  name: string
  resource: string
  action: string
  description?: string | null
}

export interface RolePermissionSummary {
  id: string
  code: string
  name: string
}

export interface Role {
  id: string
  code: string
  name: string
  description?: string | null
  builtin: boolean
  userCount: number
  permissions: RolePermissionSummary[]
}

export interface RoleDetail extends Omit<Role, 'permissions' | 'userCount'> {
  permissions: Permission[]
  users: Array<{
    id: string
    username: string
    realName: string
  }>
}

export interface RoleQueryParams {
  keyword?: string
  builtin?: boolean
}

export interface PermissionQueryParams {
  resource?: string
  action?: string
  keyword?: string
}

export interface CreateRoleDTO {
  code: string
  name: string
  description?: string
  permissionIds?: string[]
}

export interface UpdateRoleDTO {
  name?: string
  description?: string
}

export interface RoleSummary {
  id: string
  code: string
  name: string
}

export interface AssignPermissionsResponse {
  roleId: string
  addedCount: number
}

export interface RefreshTokenItem {
  id: string
  createdAt: string
  expiresAt: string
  lastUsedAt?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  revokedAt?: string | null
}

export interface RevokeAllTokensResponse {
  revokedCount: number
}
