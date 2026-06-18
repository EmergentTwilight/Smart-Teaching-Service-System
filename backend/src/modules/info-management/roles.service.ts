/**
 * 角色权限管理服务
 * 处理角色 CRUD、权限查询、角色-权限关系维护等业务逻辑。
 * 所有重要操作（创建、更新、删除角色，分配/撤销权限）均记录系统日志。
 */
import prisma from '../../shared/prisma/client.js'
import { Request } from 'express'
import { NotFoundError, ConflictError } from '@stss/shared'
import type { Prisma } from '@prisma/client'
import type {
  GetRoleListInput,
  CreateRoleInput,
  UpdateRoleInput,
  AssignPermissionsInput,
  GetPermissionListInput,
} from './roles.types.js'

/**
 * 系统内置角色代码列表
 * 内置角色不可删除，其 code 不可修改
 */
const BUILTIN_ROLE_CODES = ['super_admin', 'admin', 'teacher', 'student']
const SUPER_ADMIN_CRITICAL_PERMISSIONS = [
  'role:read',
  'role:create',
  'role:update',
  'role:delete',
  'permission:read',
  'permission:assign',
  'permission:revoke',
]

export const rolesService = {
  /**
   * 获取角色列表（管理端）
   * 返回角色及其关联的权限、用户数量
   */
  async getRoleList(params: GetRoleListInput) {
    const { keyword, builtin } = params

    const where: Prisma.RoleWhereInput = {}

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    if (builtin !== undefined) {
      if (builtin) {
        where.code = { in: BUILTIN_ROLE_CODES }
      } else {
        where.code = { notIn: BUILTIN_ROLE_CODES }
      }
    }

    const roles = await prisma.role.findMany({
      where,
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        userRoles: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      builtin: BUILTIN_ROLE_CODES.includes(role.code),
      user_count: role.userRoles.length,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
      })),
    }))
  },

  /**
   * 获取角色详情
   * 返回角色信息、关联权限及拥有此角色的用户
   */
  async getRoleDetail(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                resource: true,
                action: true,
              },
            },
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                realName: true,
              },
            },
          },
        },
      },
    })

    if (!role) {
      throw new NotFoundError('角色不存在')
    }

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      builtin: BUILTIN_ROLE_CODES.includes(role.code),
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
      })),
      users: role.userRoles.map((ur) => ({
        id: ur.user.id,
        username: ur.user.username,
        real_name: ur.user.realName,
      })),
    }
  },

  /**
   * 创建角色
   * 支持创建时同时分配权限，记录创建日志
   */
  async createRole(data: CreateRoleInput, req: Request) {
    const { code, name, description, permission_ids } = data

    // 检查角色代码是否已存在
    const existingByCode = await prisma.role.findUnique({
      where: { code },
      select: { id: true },
    })
    if (existingByCode) {
      throw new ConflictError('角色代码已存在')
    }

    // 检查角色名称是否已存在
    const existingByName = await prisma.role.findUnique({
      where: { name },
      select: { id: true },
    })
    if (existingByName) {
      throw new ConflictError('角色名称已存在')
    }

    // 如果提供了权限ID，验证权限是否存在
    if (permission_ids && permission_ids.length > 0) {
      const existingPermissions = await prisma.permission.findMany({
        where: { id: { in: permission_ids } },
        select: { id: true },
      })
      if (existingPermissions.length !== permission_ids.length) {
        const missingIds = permission_ids.filter(
          (pid) => !existingPermissions.some((ep) => ep.id === pid)
        )
        throw new NotFoundError(`权限不存在: ${missingIds.join(', ')}`)
      }
    }

    const role = await prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          code,
          name,
          description,
          permissions: permission_ids?.length
            ? {
                create: permission_ids.map((permissionId) => ({
                  permissionId,
                })),
              }
            : undefined,
        },
      })

      // 记录创建日志
      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'role:create',
          resourceType: 'role',
          resourceId: newRole.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            role_code: code,
            role_name: name,
            permission_ids: permission_ids || [],
          },
        },
      })

      return newRole
    })

    return {
      id: role.id,
      code: role.code,
      name: role.name,
    }
  },

  /**
   * 更新角色
   * 系统内置角色的 code 不可修改
   */
  async updateRole(id: string, data: UpdateRoleInput, req: Request) {
    const role = await prisma.role.findUnique({
      where: { id },
    })

    if (!role) {
      throw new NotFoundError('角色不存在')
    }

    // 系统内置角色的 code 不可修改
    if (data.name === undefined && data.description === undefined) {
      return {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
      }
    }

    if (data.name && data.name !== role.name) {
      // 检查新名称是否已被其他角色使用
      const existingByName = await prisma.role.findFirst({
        where: { name: data.name, id: { not: id } },
        select: { id: true },
      })
      if (existingByName) {
        throw new ConflictError('角色名称已存在')
      }
    }

    const updatedRole = await prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
        },
      })

      // 记录更新日志
      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'role:update',
          resourceType: 'role',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            role_code: role.code,
            before: {
              name: role.name,
              description: role.description,
            },
            after: {
              name: data.name ?? role.name,
              description: data.description !== undefined ? data.description : role.description,
            },
          },
        },
      })

      return updated
    })

    return {
      id: updatedRole.id,
      code: updatedRole.code,
      name: updatedRole.name,
      description: updatedRole.description,
    }
  },

  /**
   * 删除角色
   * 前置条件：角色未被任何用户引用，且不是系统内置角色
   */
  async deleteRole(id: string, req: Request) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        userRoles: {
          select: { userId: true },
        },
      },
    })

    if (!role) {
      throw new NotFoundError('角色不存在')
    }

    // 系统内置角色不可删除
    if (BUILTIN_ROLE_CODES.includes(role.code)) {
      throw new ConflictError('系统内置角色不可删除')
    }

    // 检查是否有用户使用此角色
    if (role.userRoles.length > 0) {
      throw new ConflictError(`角色正在被 ${role.userRoles.length} 个用户使用，无法删除`)
    }

    await prisma.$transaction(async (tx) => {
      // 先删除角色-权限关联
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      })

      // 再删除角色
      await tx.role.delete({
        where: { id },
      })

      // 记录删除日志
      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'role:delete',
          resourceType: 'role',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            role_code: role.code,
            role_name: role.name,
          },
        },
      })
    })
  },

  // ==================== 权限管理 ====================

  /**
   * 获取权限列表
   * 支持按资源、操作、关键词筛选
   */
  async getPermissionList(params: GetPermissionListInput) {
    const { resource, action, keyword } = params

    const where: Prisma.PermissionWhereInput = {}

    if (resource) {
      where.resource = resource
    }

    if (action) {
      where.action = action
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
        { resource: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    const permissions = await prisma.permission.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        resource: true,
        action: true,
        description: true,
      },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    })

    return permissions
  },

  /**
   * 为角色分配权限
   */
  async assignPermissions(roleId: string, data: AssignPermissionsInput, req: Request) {
    const { permission_ids } = data

    // 检查角色是否存在
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          select: { permissionId: true },
        },
      },
    })

    if (!role) {
      throw new NotFoundError('角色不存在')
    }

    // 验证权限是否存在
    const existingPermissions = await prisma.permission.findMany({
      where: { id: { in: permission_ids } },
      select: { id: true, code: true },
    })

    if (existingPermissions.length !== permission_ids.length) {
      const missingIds = permission_ids.filter(
        (pid) => !existingPermissions.some((ep) => ep.id === pid)
      )
      throw new NotFoundError(`权限不存在: ${missingIds.join(', ')}`)
    }

    // 过滤掉已经分配的权限
    const existingPermissionIds = new Set(role.permissions.map((rp) => rp.permissionId))
    const newPermissionIds = permission_ids.filter((pid) => !existingPermissionIds.has(pid))

    if (newPermissionIds.length === 0) {
      return {
        role_id: roleId,
        added_count: 0,
      }
    }

    await prisma.$transaction(async (tx) => {
      // 批量创建角色-权限关联
      await tx.rolePermission.createMany({
        data: newPermissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      })

      // 记录日志
      const assignedCodes = existingPermissions
        .filter((ep) => newPermissionIds.includes(ep.id))
        .map((ep) => ep.code)

      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'permission:assign',
          resourceType: 'role',
          resourceId: roleId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            role_code: role.code,
            role_name: role.name,
            assigned_permissions: assignedCodes,
            permission_ids: newPermissionIds,
          },
        },
      })
    })

    return {
      role_id: roleId,
      added_count: newPermissionIds.length,
    }
  },

  /**
   * 撤销角色权限
   */
  async revokePermission(roleId: string, permissionId: string, req: Request) {
    // 检查角色是否存在
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          select: {
            permissionId: true,
            permission: true,
          },
        },
      },
    })

    if (!role) {
      throw new NotFoundError('角色不存在')
    }

    // 检查权限是否存在于该角色
    const rolePermission = role.permissions.find((rp) => rp.permissionId === permissionId)
    if (!rolePermission) {
      throw new NotFoundError('该角色未分配此权限')
    }

    if (
      role.code === 'super_admin' &&
      SUPER_ADMIN_CRITICAL_PERMISSIONS.includes(rolePermission.permission.code)
    ) {
      throw new ConflictError('不能撤销超级管理员关键权限')
    }

    await prisma.$transaction(async (tx) => {
      // 删除角色-权限关联
      await tx.rolePermission.delete({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
      })

      // 记录日志
      await tx.systemLog.create({
        data: {
          userId: req.user?.userId,
          action: 'permission:revoke',
          resourceType: 'role',
          resourceId: roleId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            role_code: role.code,
            role_name: role.name,
            revoked_permission: rolePermission.permission.code,
            permission_id: permissionId,
          },
        },
      })
    })
  },
}
