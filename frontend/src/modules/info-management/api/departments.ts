/**
 * 部门管理 API
 * 处理部门 CRUD 接口
 */
import request from '@/shared/utils/request'
import type {
  Department,
  DepartmentDetail,
  DepartmentQueryParams,
  CreateDepartmentDTO,
  UpdateDepartmentDTO,
} from '../types/departments'

/** 部门管理 API 模块 */
export const departmentsApi = {
  /**
   * 获取部门列表
   * @param params 查询参数
   * @returns 部门列表
   */
  getList: async (params?: DepartmentQueryParams): Promise<Department[]> => {
    const response = await request.get('/departments', { params })
    const data = response as unknown as { items?: Department[] }
    return data.items || (response as unknown as Department[])
  },

  /**
   * 获取单个部门详情
   * @param id 部门ID
   * @returns 部门详情信息
   */
  getById: async (id: string): Promise<DepartmentDetail> => {
    return request.get(`/departments/${id}`)
  },

  /**
   * 创建部门
   * @param data 部门数据
   * @returns 新创建的部门
   */
  create: async (data: CreateDepartmentDTO): Promise<Department> => {
    return request.post('/departments', data)
  },

  /**
   * 更新部门
   * @param id 部门ID
   * @param data 更新数据
   * @returns 更新后的部门
   */
  update: async (id: string, data: UpdateDepartmentDTO): Promise<Department> => {
    return request.put(`/departments/${id}`, data)
  },

  /**
   * 删除部门
   * @param id 部门ID
   */
  delete: async (id: string): Promise<void> => {
    await request.delete(`/departments/${id}`)
  },
}
