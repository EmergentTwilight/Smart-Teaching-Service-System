import { z } from 'zod'

const pageSchema = z.coerce.number().int().min(1).default(1)
const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(20)
const booleanSchema = z.preprocess((v) => {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return v
}, z.boolean().optional())

const idSchema = z.object({
  id: z.string().uuid('参数应为 UUID'),
})

const userIdSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
})

const paginationSchema = z
  .object({
    page: pageSchema.optional(),
    pageSize: pageSizeSchema.optional(),
    page_size: pageSizeSchema.optional(),
  })
  .transform(({ page, pageSize, page_size }) => ({
    page,
    pageSize: pageSize || page_size || 20,
  }))

// TODO(C1, FR-C-01, FR-C-03, NFR-C-13): 规范课程与培养方案分页查询参数风格
export const curriculumQuerySchema = paginationSchema.extend({
  includeCourses: z.coerce.boolean().optional(),
  include_courses: z.coerce.boolean().optional(),
  courseType: z.string().optional(),
  course_type: z.string().optional(),
})

export type CurriculumQuery = z.infer<typeof curriculumQuerySchema>

// TODO(C1, FR-C-05, NFR-C-13): 统一培养方案进度查询参数并支持按学期过滤
export const curriculumProgressQuerySchema = z
  .object({
    semesterId: z.string().uuid().optional(),
    includeDropped: z.coerce.boolean().optional(),
    include_dropped: z.coerce.boolean().optional(),
  })
  .merge(paginationSchema.partial())

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
    offeringStatus: z.string().optional(),
    offering_status: z.string().optional(),
    includeUnavailable: z.boolean().optional(),
    include_unavailable: z.boolean().optional(),
  })
  .merge(paginationSchema.partial())

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
    onlyAvailable: z.coerce.boolean().optional(),
    only_available: z.coerce.boolean().optional(),
    includeConflictReasons: z.coerce.boolean().optional(),
    include_conflict_reasons: z.coerce.boolean().optional(),
    includeUnavailable: z.coerce.boolean().optional(),
    include_unavailable: z.coerce.boolean().optional(),
  })
  .merge(paginationSchema.partial())

export type AvailableOfferingsQuery = z.infer<typeof availableOfferingsQuerySchema>

// TODO(C2, FR-C-11, FR-C-19, NFR-C-07): 课程详情可扩展包含先修与排课信息
export const courseOfferingParamsSchema = idSchema

export type CourseOfferingParams = z.infer<typeof courseOfferingParamsSchema>

// TODO(C3, FR-C-14, FR-C-16, NFR-C-04): 选课/退选前置参数应支持课程/阶段校验与幂等控制
export const enrollmentQuerySchema = paginationSchema

export type EnrollmentQuery = z.infer<typeof enrollmentQuerySchema>

// TODO(C3, FR-C-16, NFR-C-04): 强制校验课程开选、容量、重复和学分规则
export const createEnrollmentBodySchema = z.object({
  courseOfferingId: z.string().uuid('课程开设ID应为 UUID'),
  reason: z.string().max(200).optional(),
})

export type CreateEnrollmentBody = z.infer<typeof createEnrollmentBodySchema>

// TODO(C3, FR-C-21, NFR-C-04): 退选仅允许修改状态，不允许删除历史记录
export const dropEnrollmentParamsSchema = idSchema
export const dropEnrollmentBodySchema = z.object({
  reason: z.string().max(200).optional(),
})
export type DropEnrollmentParams = z.infer<typeof dropEnrollmentParamsSchema>
export type DropEnrollmentBody = z.infer<typeof dropEnrollmentBodySchema>

// TODO(C5, FR-C-30, FR-C-35, NFR-C-14): 选课阶段接口需校验时间范围与阶段互斥规则
export const selectionPeriodQuerySchema = paginationSchema
export const createSelectionPeriodBodySchema = z.object({
  semesterId: z.string().uuid(),
  phase: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  maxCredits: z.coerce.number().min(0).optional(),
  isActive: booleanSchema.default(false),
})

export const updateSelectionPeriodBodySchema = createSelectionPeriodBodySchema.partial()
export const selectionPeriodParamsSchema = idSchema

export type SelectionPeriodQuery = z.infer<typeof selectionPeriodQuerySchema>
export type CreateSelectionPeriodBody = z.infer<typeof createSelectionPeriodBodySchema>
export type UpdateSelectionPeriodBody = z.infer<typeof updateSelectionPeriodBodySchema>
export type SelectionPeriodParams = z.infer<typeof selectionPeriodParamsSchema>

// TODO(C5, FR-C-33, FR-C-34, NFR-C-04): 手动加课输入需包括理由并默认执行完整校验
export const manualEnrollmentBodySchema = z.object({
  studentId: z.string().uuid('学生ID应为 UUID'),
  courseOfferingId: z.string().uuid('课程开设ID应为 UUID'),
  reason: z.string().min(1, '必须填写操作原因').max(500),
})
export type ManualEnrollmentBody = z.infer<typeof manualEnrollmentBodySchema>

// TODO(C4, FR-C-27, FR-C-28, NFR-C-06): 老师名单接口需提供筛选参数，保证导出口径一致
export const rosterQuerySchema = paginationSchema.extend({
  offeringId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  status: z.string().optional(),
})

export type RosterQuery = z.infer<typeof rosterQuerySchema>

export const rosterOfferingParamsSchema = idSchema
export type RosterOfferingParams = z.infer<typeof rosterOfferingParamsSchema>

// TODO(C6, FR-C-38, FR-C-42, NFR-C-09): AI 输入需支持课程/课表上下文，支持降级返回
export const aiRecommendBodySchema = z.object({
  maxRecommendations: z.coerce.number().min(1).max(20).default(6),
  includeConflicts: z.coerce.boolean().optional(),
  constraints: z.record(z.unknown()).optional(),
})

export const aiExplainBodySchema = z.object({
  offeringId: z.string().uuid('课程开设ID应为 UUID'),
  studentContext: z.record(z.unknown()).optional(),
})

export type AiRecommendBody = z.infer<typeof aiRecommendBodySchema>
export type AiExplainBody = z.infer<typeof aiExplainBodySchema>
