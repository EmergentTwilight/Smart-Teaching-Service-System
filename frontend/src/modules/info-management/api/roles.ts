/**
 * 角色权限与令牌管理 API
 */
import request from '@/shared/utils/request'
import type {
  AssignPermissionsResponse,
  CreateRoleDTO,
  Permission,
  PermissionQueryParams,
  RefreshTokenItem,
  RevokeAllTokensResponse,
  Role,
  RoleDetail,
  RoleQueryParams,
  RoleSummary,
  UpdateRoleDTO,
} from '../types/roles'

interface CreateRolePayload {
  code: string
  name: string
  description?: string
  permission_ids?: string[]
}

interface UpdateRolePayload {
  name?: string
  description?: string
}

function toCreatePayload(data: CreateRoleDTO): CreateRolePayload {
  return {
    code: data.code,
    name: data.name,
    description: data.description,
    permission_ids: data.permissionIds,
  }
}

function toUpdatePayload(data: UpdateRoleDTO): UpdateRolePayload {
  return {
    name: data.name,
    description: data.description,
  }
}

export const rolesApi = {
  getList: async (params?: RoleQueryParams): Promise<Role[]> => {
    return request.get('/roles', {
      params: {
        keyword: params?.keyword || undefined,
        builtin: params?.builtin,
      },
    })
  },

  getById: async (id: string): Promise<RoleDetail> => {
    return request.get(`/roles/${id}`)
  },

  create: async (data: CreateRoleDTO): Promise<RoleSummary> => {
    return request.post('/roles', toCreatePayload(data))
  },

  update: async (id: string, data: UpdateRoleDTO): Promise<RoleSummary> => {
    return request.put(`/roles/${id}`, toUpdatePayload(data))
  },

  delete: async (id: string): Promise<void> => {
    await request.delete(`/roles/${id}`)
  },

  getPermissions: async (params?: PermissionQueryParams): Promise<Permission[]> => {
    return request.get('/permissions', {
      params: {
        resource: params?.resource || undefined,
        action: params?.action || undefined,
        keyword: params?.keyword || undefined,
      },
    })
  },

  assignPermissions: async (
    id: string,
    permissionIds: string[]
  ): Promise<AssignPermissionsResponse> => {
    return request.post(`/roles/${id}/permissions`, { permission_ids: permissionIds })
  },

  revokePermission: async (id: string, permissionId: string): Promise<void> => {
    await request.delete(`/roles/${id}/permissions/${permissionId}`)
  },

  getUserTokens: async (userId: string): Promise<RefreshTokenItem[]> => {
    return request.get(`/users/${userId}/tokens`)
  },

  revokeToken: async (userId: string, tokenId: string): Promise<void> => {
    await request.delete(`/users/${userId}/tokens/${tokenId}`)
  },

  revokeAllTokens: async (userId: string): Promise<RevokeAllTokensResponse> => {
    return request.post(`/users/${userId}/tokens/revoke-all`)
  },
}
