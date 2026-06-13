/**
 * 用户管理 API
 * 处理用户 CRUD 接口
 */
import request from '@/shared/utils/request'
import type {
  CreateUserDTO,
  UpdateUserDTO,
  UserDetail,
  PaginatedData,
  SystemLogItem,
} from '@/shared/types'

/** 用户查询参数 */
export interface UserQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** 搜索关键词 */
  keyword?: string
  /** 角色筛选 */
  role?: string
  /** 状态筛选 */
  status?: string
  /** 是否包含已删除用户 */
  includeDeleted?: boolean
}

export interface UserPermissionsResponse {
  userId: string
  permissions: string[]
  roles: Array<{
    id: string
    code: string
    name: string
  }>
}

interface CreateUserPayload {
  username: string
  password: string
  email?: string
  real_name: string
  phone?: string
  gender?: string
  role_ids?: string[]
  student?: {
    student_number: string
    major_id?: string
    grade: number
    class_name?: string
  }
  teacher?: {
    teacher_number: string
    department_id?: string
    title?: string
    office_location?: string
  }
  admin?: {
    admin_type: string
    department_id?: string
  }
}

interface UpdateUserPayload {
  email?: string
  real_name?: string
  phone?: string
  avatar_url?: string
  gender?: string
  role_ids?: string[]
}

export interface BatchCreateUsersResult {
  total: number
  success_count?: number
  successCount?: number
  fail_count?: number
  failCount?: number
  results: Array<{
    index: number
    id?: string
    error?: string
    status: 'created' | 'failed'
  }>
}

export interface BatchUpdateStatusResult {
  updated_count?: number
  updatedCount?: number
  failed_count?: number
  failedCount?: number
}

type RawUserDetail = Omit<UserDetail, 'roles'> & {
  roles?: string[] | Array<{ code: string; name?: string; id?: string }>
}

function normalizeUserDetail(user: RawUserDetail): UserDetail {
  return {
    ...user,
    roles: Array.isArray(user.roles)
      ? user.roles.map((role) => (typeof role === 'string' ? role : role.code))
      : [],
  }
}

function toCreatePayload(data: CreateUserDTO): CreateUserPayload {
  return {
    username: data.username,
    password: data.password,
    email: data.email,
    real_name: data.realName,
    phone: data.phone,
    gender: data.gender,
    role_ids: data.roleIds,
    student: data.student
      ? {
          student_number: data.student.studentNumber,
          major_id: data.student.majorId,
          grade: data.student.grade,
          class_name: data.student.className,
        }
      : undefined,
    teacher: data.teacher
      ? {
          teacher_number: data.teacher.teacherNumber,
          department_id: data.teacher.departmentId,
          title: data.teacher.title,
          office_location: data.teacher.officeLocation,
        }
      : undefined,
    admin: data.admin
      ? {
          admin_type: data.admin.adminType,
          department_id: data.admin.departmentId,
        }
      : undefined,
  }
}

function toUpdatePayload(data: UpdateUserDTO): UpdateUserPayload {
  return {
    email: data.email,
    real_name: data.realName,
    phone: data.phone,
    avatar_url: data.avatarUrl,
    gender: data.gender,
    role_ids: data.roleIds,
  }
}

/** 用户管理 API 模块 */
export const usersApi = {
  /**
   * 获取用户列表
   * @param params 查询参数
   * @returns 用户列表和分页信息
   */
  getList: async (
    params?: UserQueryParams
  ): Promise<{ items: UserDetail[]; pagination: PaginatedData<UserDetail>['pagination'] }> => {
    return request.get('/users', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        keyword: params?.keyword || undefined,
        role: params?.role || undefined,
        status: params?.status || undefined,
        include_deleted: params?.includeDeleted,
      },
    })
  },

  /**
   * 获取用户统计
   * @returns 用户统计数据
   */
  getStats: async (): Promise<{
    total: number
    students: number
    teachers: number
    admins: number
    active: number
    inactive: number
    banned: number
  }> => {
    return request.get('/users/stats')
  },

  /**
   * 获取单个用户详情
   * @param id 用户ID
   * @returns 用户信息
   */
  getById: async (id: string): Promise<UserDetail> => {
    const user = (await request.get(`/users/${id}`)) as RawUserDetail
    return normalizeUserDetail(user)
  },

  /**
   * 创建用户
   * @param data 用户数据
   * @returns 新创建的用户
   */
  create: async (data: CreateUserDTO): Promise<UserDetail> => {
    const user = (await request.post('/users', toCreatePayload(data))) as RawUserDetail
    return normalizeUserDetail(user)
  },

  /**
   * 更新用户
   * @param id 用户ID
   * @param data 更新数据
   * @returns 更新后的用户
   */
  update: async (id: string, data: UpdateUserDTO): Promise<UserDetail> => {
    const user = (await request.put(`/users/${id}`, toUpdatePayload(data))) as RawUserDetail
    return normalizeUserDetail(user)
  },

  /**
   * 删除用户
   * @param id 用户ID
   */
  delete: async (id: string): Promise<void> => {
    await request.delete(`/users/${id}`)
  },

  /**
   * 批量创建用户
   * @param data 用户数据列表
   * @returns 创建结果
   */
  batchCreate: async (data: CreateUserDTO[]): Promise<BatchCreateUsersResult> => {
    return request.post('/users/batch', { users: data.map(toCreatePayload) })
  },

  /**
   * 批量更新用户状态
   * @param userIds 用户ID列表
   * @param status 新状态
   */
  batchUpdateStatus: async (
    userIds: string[],
    status?: string,
    roleIds?: string[],
    reason?: string
  ): Promise<BatchUpdateStatusResult> => {
    return request.patch('/users/batch/status', {
      user_ids: userIds,
      status,
      role_ids: roleIds,
      reason,
    })
  },

  /**
   * 修改用户密码
   * @param id 用户ID
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
  changePassword: async (id: string, oldPassword: string, newPassword: string): Promise<void> => {
    return request.patch(`/users/${id}/password`, {
      old_password: oldPassword,
      new_password: newPassword,
    })
  },

  /**
   * 重置用户密码
   * @param id 用户ID
   * @param newPassword 新密码
   */
  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    return request.post(`/users/${id}/password/reset`, { new_password: newPassword })
  },

  /**
   * 更新用户状态
   * @param id 用户ID
   * @param status 新状态
   */
  updateStatus: async (id: string, status: string, reason?: string): Promise<UserDetail> => {
    const user = (await request.patch(`/users/${id}/status`, { status, reason })) as RawUserDetail
    return normalizeUserDetail(user)
  },

  uploadAvatar: async (id: string, file: File): Promise<{ avatarUrl: string }> => {
    const formData = new FormData()
    formData.append('avatar', file)
    return request.post(`/users/${id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  updateStudentMajor: async (
    id: string,
    majorId: string
  ): Promise<{ userId: string; majorId: string; majorName: string }> => {
    return request.patch(`/users/${id}/student/major`, {
      major_id: majorId,
    })
  },

  updateTeacherDepartment: async (
    id: string,
    departmentId: string
  ): Promise<{ userId: string; departmentId: string; departmentName: string }> => {
    return request.patch(`/users/${id}/teacher/department`, {
      department_id: departmentId,
    })
  },

  updateAdminDepartment: async (
    id: string,
    departmentId: string
  ): Promise<{ userId: string; departmentId: string; departmentName: string }> => {
    return request.patch(`/users/${id}/admin/department`, {
      department_id: departmentId,
    })
  },

  /**
   * 分配角色
   * @param id 用户ID
   * @param roleIds 角色ID列表
   */
  assignRoles: async (id: string, roleIds: string[]): Promise<void> => {
    return request.post(`/users/${id}/roles`, { role_ids: roleIds })
  },

  /**
   * 撤销角色
   * @param id 用户ID
   * @param roleId 角色ID
   */
  revokeRole: async (id: string, roleId: string): Promise<void> => {
    return request.delete(`/users/${id}/roles/${roleId}`)
  },

  /**
   * 获取用户权限
   * @param id 用户ID
   * @returns 权限列表
   */
  getPermissions: async (id: string): Promise<UserPermissionsResponse> => {
    return request.get(`/users/${id}/permissions`)
  },

  /**
   * 获取用户操作日志
   * @param params 查询参数
   * @returns 日志列表
   */
  getLogs: async (params?: {
    page?: number
    pageSize?: number
    userId?: string
    action?: string
    resourceType?: string
    startDate?: string
    endDate?: string
  }): Promise<{
    items: SystemLogItem[]
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
  }> => {
    return request.get('/users/logs', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        user_id: params?.userId,
        action: params?.action,
        resource_type: params?.resourceType,
        start_date: params?.startDate,
        end_date: params?.endDate,
      },
    })
  },

  /**
   * 获取所有角色列表
   * @returns 角色列表
   */
  getRoles: async (): Promise<
    Array<{
      id: string
      name: string
      code: string
      description?: string
    }>
  > => {
    return request.get('/users/roles')
  },
}
