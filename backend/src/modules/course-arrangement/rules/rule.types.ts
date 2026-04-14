export interface TimeSlot {
  dayOfWeek: number
  startPeriod: number
  endPeriod: number
}

export interface SchedulingRules {
  hardConstraints: {
    unavailableTimeSlots: TimeSlot[]
    requiredRoomType?: string
  }
  softConstraints: {
    preferredTimeSlots: TimeSlot[]
    continuousPeriods: boolean
    preferredBuilding?: string
  }
}

export interface RuleSaveInput {
  targetType: 'teacher' | 'course'
  targetId: string
  rules: SchedulingRules
}
