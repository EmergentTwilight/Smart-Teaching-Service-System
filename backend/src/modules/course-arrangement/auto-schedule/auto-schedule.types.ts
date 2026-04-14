export interface AutoScheduleTask {
  taskId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  semesterId: string
  result?: {
    successRate: number
    schedules: Array<{
      courseOfferingId: string
      courseName: string
      teacherName: string
      classroomId: string
      building: string
      roomNumber: string
      dayOfWeek: number
      startWeek: number
      endWeek: number
      startPeriod: number
      endPeriod: number
    }>
    failures: Array<{
      courseOfferingId: string
      courseName: string
      teacherName: string
      reason: string
      detail: string
    }>
  }
}

export interface CreateTaskInput {
  semesterId: string
  courseOfferingIds?: string[]
}
