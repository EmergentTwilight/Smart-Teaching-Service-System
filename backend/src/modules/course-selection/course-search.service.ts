import type {
  CourseSearchQuery,
  AvailableOfferingsQuery,
  PaginatedItems,
  CourseListItem,
  CourseOfferingItem,
  CourseOfferingDetail,
} from './course-selection.types.js'
import { CourseType, OfferingStatus } from '@prisma/client'

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

  // TODO(C2, FR-C-11, FR-C-19, FR-C-18, NFR-C-07): 实现课程详情和依赖信息聚合
  // - 读取课程、开课、教师、课表、先修列表
  // - 不在详情内篡改容量和状态
  async getOfferingDetail(offeringId: string, _studentId: string): Promise<CourseOfferingDetail> {
    return {
      id: offeringId,
      courseId: 'placeholder-course-id',
      semesterId: 'placeholder-semester-id',
      semesterName: '未开启',
      courseName: '待配置课程',
      courseCode: 'CUR-0000',
      credits: 0,
      courseType: CourseType.ELECTIVE,
      teacherId: 'placeholder-teacher-id',
      teacherName: '待绑定教师',
      capacity: 0,
      enrolledCount: 0,
      offeringStatus: OfferingStatus.PLANNED,
      isAvailable: false,
      schedules: [],
      prerequisites: [],
    }
  },
}
