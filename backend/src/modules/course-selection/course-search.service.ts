import type {
  CourseSearchQuery,
  AvailableOfferingsQuery,
  PaginatedItems,
  CourseListItem,
  CourseOfferingItem,
  CourseOfferingDetail,
} from './course-selection.types.js'

const emptyPagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}

export const courseSearchService = {
  // TODO(C2, FR-C-08, FR-C-09, FR-C-10, FR-C-12, NFR-C-13): 完整实现课程搜索查询
  // - 支持课程名/教师名/课程代码/学期/课程类型筛选
  // - 分页返回并支持按课程状态、是否可选过滤
  async searchCourses(query: CourseSearchQuery): Promise<PaginatedItems<CourseListItem>> {
    return {
      items: [],
      pagination: {
        ...emptyPagination,
        page: query.page ?? 1,
        pageSize: query.pageSize || 20,
      },
    }
  },

  // TODO(C2, FR-C-08, FR-C-15): 实现开课列表查询并返回容量与状态
  // - 基于 CourseOffering 返回课程容量/已选人数/教师
  // - 与课程状态变更一致，不依赖前端过滤
  async listOfferings(query: CourseSearchQuery): Promise<PaginatedItems<CourseOfferingItem>> {
    return {
      items: [],
      pagination: {
        ...emptyPagination,
        page: query.page ?? 1,
        pageSize: query.pageSize || 20,
      },
    }
  },

  // TODO(C2, C3, FR-C-13, FR-C-15, FR-C-16, FR-C-18, NFR-C-07, NFR-C-08): 返回学生可选课程并标记可选原因
  // - 筛掉不满足培养方案/学生权限的课程
  // - 标识容量、冲突、先修要求、是否可选
  async listAvailableOfferings(
    studentId: string,
    query: AvailableOfferingsQuery
  ): Promise<PaginatedItems<CourseOfferingItem>> {
    return {
      items: [],
      pagination: {
        ...emptyPagination,
        page: query.page ?? 1,
        pageSize: query.pageSize || 20,
      },
    }
  },

  // TODO(C2, C3, FR-C-18, FR-C-19, NFR-C-07):
  // 在详情中补充当前学生的可选性原因，不能绕过容量、课表冲突、培养方案和先修校验。
  // TODO(C2, FR-C-11, FR-C-18, FR-C-19, NFR-C-07):
  // 由 C2 成员按 API 文档返回 course_offering_id 以及 nested course/semester/teacher/eligibility。
  // 负责人骨架不得提前实现 Prisma 详情查询或返回与文档不一致的扁平 DTO。
  async getOfferingDetail(offeringId: string, studentId: string): Promise<CourseOfferingDetail | null> {
    void offeringId
    void studentId

    return null
  },
}
