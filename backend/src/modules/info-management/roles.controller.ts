/**
 * 角色权限控制器
 * 处理角色和权限相关的HTTP请求，调用 rolesService 进行业务逻辑处理
 */
import { Request, Response } from 'express'
import { rolesService } from './roles.service.js'
import { success } from '../../shared/utils/response.js'
import {
  getRoleListSchema,
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
  getPermissionListSchema,
  roleIdSchema,
  rolePermissionParamsSchema,
} from './roles.types.js'

export const rolesController = {
  // ==================== 角色 CRUD ====================

  /**
   * 获取角色列表（管理端）
   */
  async list(req: Request, res: Response) {
    const params = getRoleListSchema.parse(req.query)
    const result = await rolesService.getRoleList(params)
    success(res, result)
  },

  /**
   * 获取角色详情
   */
  async detail(req: Request, res: Response) {
    const { id } = roleIdSchema.parse(req.params)
    const role = await rolesService.getRoleDetail(id)
    success(res, role)
  },

  /**
   * 创建角色
   */
  async create(req: Request, res: Response) {
    const data = createRoleSchema.parse(req.body)
    const role = await rolesService.createRole(data, req)
    success(res, role, '角色创建成功', 201)
  },

  /**
   * 更新角色
   */
  async update(req: Request, res: Response) {
    const { id } = roleIdSchema.parse(req.params)
    const data = updateRoleSchema.parse(req.body)
    const role = await rolesService.updateRole(id, data, req)
    success(res, role, '角色更新成功')
  },

  /**
   * 删除角色
   */
  async delete(req: Request, res: Response) {
    const { id } = roleIdSchema.parse(req.params)
    await rolesService.deleteRole(id, req)
    success(res, null, '角色已删除')
  },

  // ==================== 权限管理 ====================

  /**
   * 获取权限列表
   */
  async listPermissions(req: Request, res: Response) {
    const params = getPermissionListSchema.parse(req.query)
    const result = await rolesService.getPermissionList(params)
    success(res, result)
  },

  /**
   * 为角色分配权限
   */
  async assignPermissions(req: Request, res: Response) {
    const { id } = roleIdSchema.parse(req.params)
    const data = assignPermissionsSchema.parse(req.body)
    const result = await rolesService.assignPermissions(id, data, req)
    success(res, result, '权限分配成功')
  },

  /**
   * 撤销角色权限
   */
  async revokePermission(req: Request, res: Response) {
    const { id, permission_id } = rolePermissionParamsSchema.parse(req.params)
    await rolesService.revokePermission(id, permission_id, req)
    success(res, null, '权限已撤销')
  },
}
