/**
 * 专业相关类型定义
 */

/** 学位类型 */
export type DegreeType = 'BACHELOR' | 'MASTER' | 'DOCTOR'

/** 学位类型标签映射 */
export const DEGREE_TYPE_LABELS: Record<DegreeType, string> = {
  BACHELOR: '本科',
  MASTER: '硕士',
  DOCTOR: '博士',
}

/** 专业信息 */
export interface Major {
  id: string
  name: string
  code?: string | null
  departmentId: string
  departmentName: string
  degreeType?: DegreeType | null
  totalCredits: number
  studentCount: number
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
  description?: string | null
  curriculums?: CurriculumSummary[]
  students?: StudentSummary[]
  updatedAt?: string
}

/** 专业查询参数 */
export interface MajorQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  departmentId?: string
}

/** 创建专业请求数据 */
export interface CreateMajorDTO {
  name: string
  code?: string
  departmentId: string
  degreeType?: DegreeType
  totalCredits?: number
}

/** 更新专业请求数据 */
export interface UpdateMajorDTO {
  name?: string
  degreeType?: DegreeType
  totalCredits?: number
}

/** 专业创建/更新响应摘要 */
export interface MajorSummary {
  id: string
  name: string
  code?: string | null
}

/** 专业列表响应 */
export interface MajorListResponse {
  items: Major[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
