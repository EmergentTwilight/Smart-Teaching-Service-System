/**
 * 排课管理相关的类型定义
 */

// 排课记录实体
export interface Schedule {
  id: string
  courseOfferingId: string
  classroomId: string
  dayOfWeek: number // 1-7
  startWeek: number
  endWeek: number
  startPeriod: number
  endPeriod: number
  notes?: string
  // 关联的展示字段
  classroom?: { building: string; roomNumber: string; campus: string }
  courseOffering?: { courseName: string; teacherName: string }
}

// 排课查询参数
export interface ValidScheduleQueryParams {
  page?: number
  pageSize?: number
  classroomId?: string
  courseOfferingId?: string
}

// 预校验请求 Payload
export interface ValidateSchedulePayload {
  courseOfferingId: string
  classroomId: string
  dayOfWeek: number
  startWeek: number
  endWeek: number
  startPeriod: number
  endPeriod: number
}

// 预校验冲突明细
export interface ScheduleConflict {
  type: string
  message: string
}

// 预校验结果
export interface ValidationResult {
  valid: boolean
  conflicts: ScheduleConflict[]
}
