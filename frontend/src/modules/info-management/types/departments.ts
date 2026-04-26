/**
 * 部门相关类型定义
 */

/** 部门信息 */
export interface Department {
  /** 部门ID */
  id: string
  /** 部门名称 */
  name: string
  /** 部门代码 */
  code: string
  /** 部门描述 */
  description: string
  /** 教师数量 */
  teacher_count: number
  /** 学生数量 */
  student_count: number
  /** 专业数量 */
  major_count: number
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/** 部门详情（包含关联信息） */
export interface DepartmentDetail extends Department {
  /** 关联专业列表 */
  majors: MajorSummary[]
  /** 关联教师列表 */
  teachers: TeacherSummary[]
}

/** 专业摘要 */
export interface MajorSummary {
  id: string
  name: string
  code: string
  degree_type: 'bachelor' | 'master' | 'doctor'
  student_count: number
}

/** 教师摘要 */
export interface TeacherSummary {
  id: string
  teacher_number: string
  real_name: string
  title: string
}

/** 部门查询参数 */
export interface DepartmentQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** 搜索关键词 */
  keyword?: string
}

/** 创建部门请求数据 */
export interface CreateDepartmentDTO {
  /** 部门名称 */
  name: string
  /** 部门代码 */
  code: string
  /** 部门描述 */
  description?: string
}

/** 更新部门请求数据 */
export interface UpdateDepartmentDTO {
  /** 部门名称 */
  name?: string
  /** 部门描述 */
  description?: string
}

/** 学位类型标签 */
export const DEGREE_TYPE_LABELS: Record<string, string> = {
  bachelor: '本科',
  master: '硕士',
  doctor: '博士',
}
