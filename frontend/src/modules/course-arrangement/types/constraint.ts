// frontend/src/modules/course-arrangement/types/constraint.ts

// 时间段
export interface TimeSlot {
  dayOfWeek: number; // 1-7
  startPeriod: number;
  endPeriod: number;
}

// 完整的排课规则配置（匹配后端 SchedulingRules）
export interface SchedulingRules {
  hardConstraints: {
    unavailableTimeSlots: TimeSlot[];
    requiredRoomType?: string;
  };
  softConstraints: {
    preferredTimeSlots: TimeSlot[];
    continuousPeriods: boolean;
    preferredBuilding?: string;
  };
}

// 排课规则实体（数据库中的一条规则记录）
export interface SchedulingRule {
  id: string;
  targetType: 'teacher' | 'course';
  targetId: string;
  targetName?: string; // 展示用
  rules: SchedulingRules;  // 同时包含软硬约束
  createdAt: string;
  updatedAt: string;
}

// 规则查询参数
export interface RuleQueryParams {
  page?: number;
  pageSize?: number;
  targetType?: 'teacher' | 'course';
  targetId?: string;
  keyword?: string;
}

// 规则保存 Payload（匹配后端 RuleSaveInput）
export interface RuleSaveInput {
  targetType: 'teacher' | 'course';
  targetId: string;
  rules: SchedulingRules;
}