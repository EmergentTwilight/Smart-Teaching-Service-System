import { z } from 'zod'

const pageSchema = z.coerce.number().int().min(1).default(1)
const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(20)
const booleanSchema = z.preprocess((v) => {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return v
}, z.boolean().optional())

type PaginationInput = {
  page?: number
  pageSize?: number
  page_size?: number
}

const normalizePaginationFields = <T extends PaginationInput>(
  value: T
): Omit<T, 'page' | 'pageSize' | 'page_size'> & { page?: number; pageSize: number } => {
  const { page, pageSize, page_size, ...rest } = value
  const normalized = {
    ...rest,
    pageSize: pageSize ?? page_size ?? 20,
  }

  if (page !== undefined) {
    return {
      ...normalized,
      page,
    }
  }

  return normalized
}

const idSchema = z.object({
  id: z.string().uuid('参数应为 UUID'),
})

const paginationSchema = z.object({
  page: pageSchema.optional(),
  pageSize: pageSizeSchema.optional(),
  page_size: pageSizeSchema.optional(),
})

// TODO(C1, FR-C-01, FR-C-03, NFR-C-13): 规范课程与培养方案分页查询参数风格
export const curriculumQuerySchema = paginationSchema
  .extend({
    includeCourses: booleanSchema,
    include_courses: booleanSchema,
    courseType: z.string().optional(),
    course_type: z.string().optional(),
  })
  .transform(({ includeCourses, include_courses, courseType, course_type, ...rest }) => ({
    ...normalizePaginationFields(rest),
    includeCourses: includeCourses ?? include_courses,
    courseType: courseType ?? course_type,
  }))

export type CurriculumQuery = z.infer<typeof curriculumQuerySchema>

// TODO(C1, FR-C-05, NFR-C-13): 统一培养方案进度查询参数并支持按学期过滤
export const curriculumProgressQuerySchema = z
  .object({
    semesterId: z.string().uuid().optional(),
    semester_id: z.string().uuid().optional(),
    includeDropped: booleanSchema,
    include_dropped: booleanSchema,
  })
  .merge(paginationSchema.partial())
  .transform(({ semesterId, semester_id, includeDropped, include_dropped, ...rest }) => ({
    ...normalizePaginationFields(rest),
    semesterId: semesterId ?? semester_id,
    includeDropped: includeDropped ?? include_dropped,
  }))

export type CurriculumProgressQuery = z.infer<typeof curriculumProgressQuerySchema>

// TODO(C2, FR-C-08, FR-C-12, NFR-C-13): 规范课程搜索入参，支持课程名/教师/学期/课程类型等筛选
export const courseSearchQuerySchema = z
  .object({
    keyword: z.string().optional(),
    teacher: z.string().optional(),
    teacher_id: z.string().optional(),
    semesterId: z.string().optional(),
    semester_id: z.string().optional(),
    courseType: z.string().optional(),
    course_type: z.string().optional(),
    status: z.string().optional(),
    offeringStatus: z.string().optional(),
    offering_status: z.string().optional(),
    availableOnly: booleanSchema,
    available_only: booleanSchema,
    includeUnavailable: booleanSchema,
    include_unavailable: booleanSchema,
  })
  .merge(paginationSchema.partial())
  .transform(({
    teacher_id,
    semesterId,
    semester_id,
    courseType,
    course_type,
    offeringStatus,
    offering_status,
    availableOnly,
    available_only,
    includeUnavailable,
    include_unavailable,
    ...rest
  }) => ({
    ...normalizePaginationFields(rest),
    teacherId: teacher_id,
    semesterId: semesterId ?? semester_id,
    courseType: courseType ?? course_type,
    offeringStatus: offeringStatus ?? offering_status,
    availableOnly: availableOnly ?? available_only,
    includeUnavailable: includeUnavailable ?? include_unavailable,
  }))

export type CourseSearchQuery = z.infer<typeof courseSearchQuerySchema>

// TODO(C2, FR-C-13, FR-C-15, NFR-C-13): 课程开设列表应支持可选、可分页和可按学生画像过滤
export const availableOfferingsQuerySchema = z
  .object({
    keyword: z.string().optional(),
    teacher: z.string().optional(),
    teacher_id: z.string().optional(),
    semesterId: z.string().optional(),
    semester_id: z.string().optional(),
    courseType: z.string().optional(),
    course_type: z.string().optional(),
    offeringStatus: z.string().optional(),
    offering_status: z.string().optional(),
    onlyAvailable: booleanSchema,
    only_available: booleanSchema,
    includeConflictReasons: booleanSchema,
    include_conflict_reasons: booleanSchema,
    includeUnavailable: booleanSchema,
    include_unavailable: booleanSchema,
  })
  .merge(paginationSchema.partial())
  .transform(({
    teacher_id,
    semesterId,
    semester_id,
    courseType,
    course_type,
    offeringStatus,
    offering_status,
    onlyAvailable,
    only_available,
    includeConflictReasons,
    include_conflict_reasons,
    includeUnavailable,
    include_unavailable,
    ...rest
  }) => ({
    ...normalizePaginationFields(rest),
    teacherId: teacher_id,
    semesterId: semesterId ?? semester_id,
    courseType: courseType ?? course_type,
    offeringStatus: offeringStatus ?? offering_status,
    onlyAvailable: onlyAvailable ?? only_available,
    includeConflictReasons: includeConflictReasons ?? include_conflict_reasons,
    includeUnavailable: includeUnavailable ?? include_unavailable,
  }))

export type AvailableOfferingsQuery = z.infer<typeof availableOfferingsQuerySchema>

// TODO(C2, FR-C-11, FR-C-19, NFR-C-07): 课程详情可扩展包含先修与排课信息
export const courseOfferingParamsSchema = idSchema

export type CourseOfferingParams = z.infer<typeof courseOfferingParamsSchema>

// TODO(C3, FR-C-14, FR-C-16, NFR-C-04): 选课/退选前置参数应支持课程/阶段校验与幂等控制
export const enrollmentQuerySchema = paginationSchema
  .extend({
    semesterId: z.string().uuid('semester_id 格式不正确').optional(),
    semester_id: z.string().uuid('semester_id 格式不正确').optional(),
    status: z.string().optional(),
    keyword: z.string().max(128).trim().optional(),
  })
  .transform(({ semesterId, semester_id, ...rest }) => ({
    ...normalizePaginationFields(rest),
    semesterId: semesterId ?? semester_id,
  }))

export type EnrollmentQuery = z.infer<typeof enrollmentQuerySchema>

// TODO(C3, FR-C-16, FR-C-14, NFR-C-04): 兼容 snake_case 入参并统一落到 camelCase，保留幂等键透传给服务层
const createEnrollmentBodyInputSchema = z.object({
  courseOfferingId: z.string().uuid('课程开设ID应为 UUID').optional(),
  course_offering_id: z.string().uuid('课程开设ID应为 UUID').optional(),
  clientRequestId: z.string().min(1).max(128).optional(),
  client_request_id: z.string().min(1).max(128).optional(),
  reason: z.string().max(200).optional(),
})

export const createEnrollmentBodySchema = createEnrollmentBodyInputSchema
  .superRefine((value, ctx) => {
    if (!value.courseOfferingId && !value.course_offering_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'courseOfferingId 或 course_offering_id 不能为空',
        path: ['course_offering_id'],
      })
    }

    if (
      value.courseOfferingId &&
      value.course_offering_id &&
      value.courseOfferingId !== value.course_offering_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'courseOfferingId 与 course_offering_id 不一致',
        path: ['course_offering_id'],
      })
    }

    if (
      value.clientRequestId &&
      value.client_request_id &&
      value.clientRequestId !== value.client_request_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'clientRequestId 与 client_request_id 不一致',
        path: ['client_request_id'],
      })
    }
  })
  .transform((value) => ({
    courseOfferingId: value.courseOfferingId ?? value.course_offering_id,
    clientRequestId: value.clientRequestId ?? value.client_request_id,
    reason: value.reason,
  }))
  .pipe(z.object({
    courseOfferingId: z.string().uuid('课程开设ID应为 UUID'),
    clientRequestId: z.string().min(1).max(128).optional(),
    reason: z.string().max(200).optional(),
  }))

export type CreateEnrollmentBody = z.infer<typeof createEnrollmentBodySchema>

// TODO(C3, FR-C-21, NFR-C-04): 退选仅允许修改状态，不允许删除历史记录
export const dropEnrollmentParamsSchema = idSchema
export const dropEnrollmentBodySchema = z
  .object({
    reason: z.string().max(200).optional(),
    clientRequestId: z.string().min(1).max(128).optional(),
    client_request_id: z.string().min(1).max(128).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.clientRequestId &&
      value.client_request_id &&
      value.clientRequestId !== value.client_request_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'clientRequestId 与 client_request_id 不一致',
        path: ['client_request_id'],
      })
    }
  })
  .transform((value) => ({
    reason: value.reason,
    clientRequestId: value.clientRequestId ?? value.client_request_id,
  }))
export type DropEnrollmentParams = z.infer<typeof dropEnrollmentParamsSchema>
export type DropEnrollmentBody = z.infer<typeof dropEnrollmentBodySchema>

// TODO(C5, FR-C-30, FR-C-35, NFR-C-14): 选课阶段接口需校验时间范围与阶段互斥规则
// TODO(C5, FR-C-30, FR-C-31, FR-C-32, NFR-C-14): 列表查询支持按学期/阶段/状态过滤
export const selectionPeriodQuerySchema = paginationSchema
  .extend({
    semesterId: z.string().uuid().optional(),
    semester_id: z.string().uuid().optional(),
    phase: z.string().optional(),
    isActive: booleanSchema,
    is_active: booleanSchema,
  })
  .transform(({ semesterId, semester_id, isActive, is_active, ...rest }) => ({
    ...normalizePaginationFields(rest),
    semesterId: semesterId ?? semester_id,
    isActive: isActive ?? is_active,
  }))

const selectionPeriodBodyInputSchema = z.object({
  semesterId: z.string().uuid().optional(),
  semester_id: z.string().uuid().optional(),
  phase: z.string().optional(),
  startTime: z.string().datetime({ offset: true }).optional(),
  start_time: z.string().datetime({ offset: true }).optional(),
  endTime: z.string().datetime({ offset: true }).optional(),
  end_time: z.string().datetime({ offset: true }).optional(),
  maxCredits: z.coerce.number().min(0).optional(),
  max_credits: z.coerce.number().min(0).optional(),
  isActive: booleanSchema,
  is_active: booleanSchema,
})

export const createSelectionPeriodBodySchema = selectionPeriodBodyInputSchema
  .superRefine((value, ctx) => {
    if (!value.semesterId && !value.semester_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'semesterId / semester_id 不能为空',
        path: ['semesterId'],
      })
    }
    if (!value.phase) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'phase 不能为空',
        path: ['phase'],
      })
    }
    if (!value.startTime && !value.start_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startTime / start_time 不能为空',
        path: ['startTime'],
      })
    }
    if (!value.endTime && !value.end_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endTime / end_time 不能为空',
        path: ['endTime'],
      })
    }
    if (value.isActive === undefined && value.is_active === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'isActive / is_active 不能为空',
        path: ['is_active'],
      })
    }

    if (
      value.phase &&
      !['first_round', 'second_round', 'adjustment'].includes(value.phase)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'phase 应为 first_round / second_round / adjustment',
        path: ['phase'],
      })
    }
  })
  .transform((value) => ({
    semesterId: value.semesterId ?? value.semester_id,
    phase: value.phase || '',
    startTime: value.startTime ?? value.start_time ?? '',
    endTime: value.endTime ?? value.end_time ?? '',
    maxCredits: value.maxCredits ?? value.max_credits,
    isActive: value.isActive ?? value.is_active,
  }))
  .pipe(z.object({
    semesterId: z.string().uuid(),
    phase: z.string(),
    startTime: z.string().datetime({ offset: true }),
    endTime: z.string().datetime({ offset: true }),
    maxCredits: z.number().min(0).optional(),
    isActive: z.boolean(),
  }))

export const updateSelectionPeriodBodySchema = selectionPeriodBodyInputSchema
  .partial()
  .transform((value) => ({
    semesterId: value.semesterId ?? value.semester_id,
    phase: value.phase,
    startTime: value.startTime ?? value.start_time,
    endTime: value.endTime ?? value.end_time,
    maxCredits: value.maxCredits ?? value.max_credits,
    isActive: value.isActive ?? value.is_active,
  }))
  .pipe(z.object({
    semesterId: z.string().uuid().optional(),
    phase: z.string().optional(),
    startTime: z.string().datetime({ offset: true }).optional(),
    endTime: z.string().datetime({ offset: true }).optional(),
    maxCredits: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  }))
export const selectionPeriodParamsSchema = idSchema

export type SelectionPeriodQuery = z.infer<typeof selectionPeriodQuerySchema>
export type CreateSelectionPeriodBody = z.infer<typeof createSelectionPeriodBodySchema>
export type UpdateSelectionPeriodBody = z.infer<typeof updateSelectionPeriodBodySchema>
export type SelectionPeriodParams = z.infer<typeof selectionPeriodParamsSchema>

// TODO(C5, FR-C-33, FR-C-34, NFR-C-04): 手动加课输入需包括理由并默认执行完整校验
const manualEnrollmentBodyInputSchema = z.object({
  studentId: z.string().uuid('学生ID应为 UUID').optional(),
  student_id: z.string().uuid('学生ID应为 UUID').optional(),
  courseOfferingId: z.string().uuid('课程开设ID应为 UUID').optional(),
  course_offering_id: z.string().uuid('课程开设ID应为 UUID').optional(),
  reason: z.string().trim().min(1, '必须填写操作原因').max(500),
  notifyStudent: booleanSchema,
  notify_student: booleanSchema,
})

export const manualEnrollmentBodySchema = manualEnrollmentBodyInputSchema
  .superRefine((value, ctx) => {
    if (!value.studentId && !value.student_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'studentId / student_id 不能为空',
        path: ['student_id'],
      })
    }

    if (!value.courseOfferingId && !value.course_offering_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'courseOfferingId / course_offering_id 不能为空',
        path: ['course_offering_id'],
      })
    }

    if (
      value.studentId &&
      value.student_id &&
      value.studentId !== value.student_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'studentId 与 student_id 不一致',
        path: ['student_id'],
      })
    }

    if (
      value.courseOfferingId &&
      value.course_offering_id &&
      value.courseOfferingId !== value.course_offering_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'courseOfferingId 与 course_offering_id 不一致',
        path: ['course_offering_id'],
      })
    }
  })
  .transform((value) => ({
    studentId: value.studentId ?? value.student_id,
    courseOfferingId: value.courseOfferingId ?? value.course_offering_id,
    reason: value.reason,
    notifyStudent: value.notifyStudent ?? value.notify_student ?? false,
  }))
  .pipe(z.object({
    studentId: z.string().uuid('学生ID应为 UUID'),
    courseOfferingId: z.string().uuid('课程开设ID应为 UUID'),
    reason: z.string().trim().min(1, '必须填写操作原因').max(500),
    notifyStudent: z.boolean(),
  }))
export type ManualEnrollmentBody = z.infer<typeof manualEnrollmentBodySchema>

// TODO(C4, FR-C-27, FR-C-28, NFR-C-06): 老师名单接口需提供筛选参数，保证导出口径一致
export const rosterQuerySchema = paginationSchema
  .extend({
    offeringId: z.string().uuid().optional(),
    semesterId: z.string().uuid().optional(),
    semester_id: z.string().uuid().optional(),
    status: z.string().optional(),
    keyword: z.string().max(128).trim().optional(),
  })
  .transform(({ semesterId, semester_id, ...rest }) => ({
    ...normalizePaginationFields(rest),
    semesterId: semesterId ?? semester_id,
  }))

export type RosterQuery = z.infer<typeof rosterQuerySchema>

export const rosterExportQuerySchema = z.object({
  status: z.string().optional(),
  format: z.enum(['xlsx']).default('xlsx'),
})

export type RosterExportQuery = z.infer<typeof rosterExportQuerySchema>

export const rosterOfferingParamsSchema = idSchema
export type RosterOfferingParams = z.infer<typeof rosterOfferingParamsSchema>

// TODO(C4, FR-C-25, FR-C-08, NFR-C-08): 课表查询支持学期与输出格式开关
export const timetableQuerySchema = z
  .object({
    semesterId: z.string().uuid().optional(),
    semester_id: z.string().uuid().optional(),
    format: z.enum(['grid', 'list']).optional(),
  })
  .transform(({ semesterId, semester_id, format }) => ({
    semesterId: semesterId ?? semester_id,
    format: format ?? 'grid',
  }))

export type TimetableQuery = z.infer<typeof timetableQuerySchema>

// TODO(C6, FR-C-38, FR-C-42, NFR-C-09): AI 输入需支持课程/课表上下文，支持降级返回
const aiRecommendBodyInputSchema = z.object({
  semesterId: z.string().uuid().optional(),
  semester_id: z.string().uuid().optional(),
  preferences: z.record(z.unknown()).optional(),
  maxRecommendations: z.coerce.number().int().min(1).max(10).optional(),
  max_recommendations: z.coerce.number().int().min(1).max(10).optional(),
  includeConflicts: booleanSchema,
  include_conflicts: booleanSchema,
  constraints: z.record(z.unknown()).optional(),
})

export const aiRecommendBodySchema = aiRecommendBodyInputSchema
  .transform((value) => ({
    semesterId: value.semesterId ?? value.semester_id,
    preferences: value.preferences ?? value.constraints,
    maxRecommendations: value.maxRecommendations ?? value.max_recommendations ?? 5,
    includeConflicts: value.includeConflicts ?? value.include_conflicts,
  }))
  .pipe(z.object({
    semesterId: z.string().uuid().optional(),
    preferences: z.record(z.unknown()).optional(),
    maxRecommendations: z.number().int().min(1).max(10),
    includeConflicts: z.boolean().optional(),
  }))

const aiExplainBodyInputSchema = z.object({
  offeringId: z.string().uuid('课程开设ID应为 UUID').optional(),
  course_offering_id: z.string().uuid('课程开设ID应为 UUID').optional(),
  question: z.string().max(500).optional(),
  studentContext: z.record(z.unknown()).optional(),
  student_context: z.record(z.unknown()).optional(),
})

export const aiExplainBodySchema = aiExplainBodyInputSchema
  .superRefine((value, ctx) => {
    if (!value.offeringId && !value.course_offering_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'offeringId / course_offering_id 不能为空',
        path: ['course_offering_id'],
      })
    }

    if (
      value.offeringId &&
      value.course_offering_id &&
      value.offeringId !== value.course_offering_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'offeringId 与 course_offering_id 不一致',
        path: ['course_offering_id'],
      })
    }
  })
  .transform((value) => ({
    offeringId: value.offeringId ?? value.course_offering_id,
    question: value.question,
    studentContext: value.studentContext ?? value.student_context,
  }))
  .pipe(z.object({
    offeringId: z.string().uuid('课程开设ID应为 UUID'),
    question: z.string().max(500).optional(),
    studentContext: z.record(z.unknown()).optional(),
  }))

export type AiRecommendBody = z.infer<typeof aiRecommendBodySchema>
export type AiExplainBody = z.infer<typeof aiExplainBodySchema>
