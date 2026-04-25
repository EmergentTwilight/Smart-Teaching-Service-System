import request from '@/shared/utils/request'
import {
  Major,
  MajorDetail,
  MajorQueryParams,
  MajorListResponse,
  CreateMajorDTO,
  UpdateMajorDTO,
} from '../types/majors'

/**
 * 获取专业列表
 * @param params 查询参数
 * @returns 专业列表数据
 */
export async function getMajorList(params?: MajorQueryParams): Promise<MajorListResponse> {
  const response = await request.get('/majors', {
    params: {
      page: params?.page || 1,
      page_size: params?.pageSize || 20,
      keyword: params?.keyword,
      department_id: params?.departmentId,
    },
  })
  return response as unknown as MajorListResponse
}

/**
 * 获取专业详情
 * @param id 专业ID
 * @returns 专业详情数据
 */
export async function getMajorDetail(id: string): Promise<MajorDetail> {
  const response = await request.get(`/majors/${id}`)
  return response as unknown as MajorDetail
}

/**
 * 创建专业
 * @param data 创建专业数据
 * @returns 创建的专业信息
 */
export async function createMajor(data: CreateMajorDTO): Promise<Major> {
  console.log('=== [createMajor] 准备发送的数据:', data)
  const response = await request.post('/majors', data)
  console.log('=== [createMajor] 响应:', response)
  return response as unknown as Major
}

/**
 * 更新专业
 * @param id 专业ID
 * @param data 更新数据
 * @returns 更新后的专业信息
 */
export async function updateMajor(id: string, data: UpdateMajorDTO): Promise<Major> {
  const response = await request.put(`/majors/${id}`, data)
  return response as unknown as Major
}

/**
 * 删除专业
 * @param id 专业ID
 * @returns 删除结果
 */
export async function deleteMajor(id: string): Promise<void> {
  await request.delete(`/majors/${id}`)
}
