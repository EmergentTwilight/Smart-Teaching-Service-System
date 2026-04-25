/**
 * 专业相关类型定义
 */

/** 学位类型 */
export type DegreeType = 'bachelor' | 'master' | 'doctor'

/** 学位类型标签映射 */
export const DEGREE_TYPE_LABELS: Record<DegreeType, string> = {
  bachelor: '本科',
  master: '硕士',
  doctor: '博士',
}

/** 专业信息 */
export interface Major {
  /** 专业ID */
  id: string
  /** 专业名称 */
  name: string
  /** 专业代码 */
  code: string
  /** 所属院系ID */
  departmentId: string
  /** 所属院系名称 */
  departmentName: string
  /** 学位类型 */
  degreeType: DegreeType
  /** 总学分 */
  totalCredits: number
  /** 学生数量 */
  studentCount: number
  /** 创建时间 */
  createdAt: string
}

/** 培养方案摘要 */
export interface CurriculumSummary {
  id: string
  name: string
  year: number
  totalCredits: number
}

/** 学生摘要 */
export interface StudentSummary {
  userId: string
  studentNumber: string
  realName: string
  grade: number
}

/** 专业详情（包含关联信息） */
export interface MajorDetail extends Major {
  /** 专业描述 */
  description?: string
  /** 关联培养方案列表 */
  curriculums?: CurriculumSummary[]
  /** 关联学生列表 */
  students?: StudentSummary[]
  /** 更新时间 */
  updatedAt?: string
}

/** 专业查询参数 */
export interface MajorQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** 搜索关键词 */
  keyword?: string
  /** 院系ID筛选 */
  departmentId?: string
}

/** 创建专业请求数据 */
export interface CreateMajorDTO {
  /** 专业名称 */
  name: string
  /** 专业代码 */
  code: string
  /** 所属院系ID */
  departmentId: string
  /** 学位类型 */
  degreeType: DegreeType
  /** 总学分 */
  totalCredits: number
}

/** 更新专业请求数据 */
export interface UpdateMajorDTO {
  /** 专业名称 */
  name?: string
  /** 总学分 */
  totalCredits?: number
}

/** 专业列表响应 */
export interface MajorListResponse {
  items: Major[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPage: number
  }
}
