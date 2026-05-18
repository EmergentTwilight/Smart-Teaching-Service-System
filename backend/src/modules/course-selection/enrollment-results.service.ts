import type {
  EnrollmentItem,
  EnrollmentQuery,
  PaginatedItems,
} from './course-selection.types.js'

export const enrollmentResultsService = {
  // TODO(C4, FR-C-24, FR-C-26, FR-C-29): 列出本人选课记录并支持分页/筛选
  async listMyEnrollments(
    studentId: string,
    query: EnrollmentQuery
  ): Promise<PaginatedItems<EnrollmentItem> | null> {
    void studentId
    void query

    // TODO(C4, FR-C-24, FR-C-26, FR-C-29):
    // 由成员 3 实现基于当前学生 Enrollment 的真实分页查询。
    // 负责人 scaffold 不返回 200 空列表，避免把未实现误判为“暂无选课记录”。
    return null
  },
}
