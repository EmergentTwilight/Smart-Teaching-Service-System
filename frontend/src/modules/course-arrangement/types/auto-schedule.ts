/**
 * 排课任务相关的类型定义
 */

// 排课任务创建的 Payload
export interface AutoScheduleTaskPayload {
  semesterId: string
  courseOfferingIds?: string[]
}

// 排课任务状态
export interface AutoScheduleTaskStatus {
  taskId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
}

// 排课失败明细
export interface AutoScheduleFailure {
  courseOfferingId: string
  courseName: string
  teacherName: string
  reason: string
  detail: string
}

// 派克完成后生成的草稿与异常报告
export interface AutoSchedulePreview {
  taskId: string
  status: string
  successRate: number
  schedules: any[] // 临时排课结果数组
  failures: AutoScheduleFailure[]
}

// 结果统计
export interface AutoScheduleApplyResult {
  appliedCount: number
  ignoredCount: number
}
