import type {
  EnrollmentItem,
  EnrollmentQuery,
  CreateEnrollmentBody,
  DropEnrollmentBody,
  PaginatedItems,
} from './course-selection.types.js'

const emptyPagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}

export const enrollmentService = {
  // TODO(C3, FR-C-14, FR-C-16, FR-C-17, NFR-C-04, NFR-C-05): 实现选课事务
  // - 校验启用的 SelectionPeriod（服务端时间）
  // - 校验 CourseOffering 状态、容量、重复、冲突、学分与先修
  // - 事务内创建/更新 Enrollment 并更新 CourseOffering.enrolledCount
  async createEnrollment(studentId: string, body: CreateEnrollmentBody): Promise<EnrollmentItem | null> {
    void studentId
    void body

    // TODO(C3, FR-C-17, FR-C-22): 这里返回 null 表示接口为占位
    return null
  },

  // TODO(C3, FR-C-21, FR-C-22, NFR-C-04): 实现退选事务
  // - 校验目标记录属于本人且当前状态为 ENROLLED
  // - 更新为 DROPPED，补充 dropped_at
  // - 在同一事务中同步减量 enrolledCount
  async dropEnrollment(
    studentId: string,
    enrollmentId: string,
    _body: DropEnrollmentBody
  ): Promise<EnrollmentItem | null> {
    void studentId
    void enrollmentId

    // TODO(C3, FR-C-23): 返回 null 表示当前未实现，请补齐历史记录保留逻辑
    return null
  },

  // TODO(C4, FR-C-24, FR-C-29, NFR-C-06): 列出本人选课记录并支持分页/筛选
  async listMyEnrollments(
    studentId: string,
    query: EnrollmentQuery
  ): Promise<PaginatedItems<EnrollmentItem>> {
    void studentId
    void query

    return {
      items: [],
      pagination: {
        ...emptyPagination,
        page: query.page ?? 1,
        pageSize: query.pageSize || 20,
      },
    }
  },
}
