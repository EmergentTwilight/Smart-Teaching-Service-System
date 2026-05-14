import type {
  SelectionPeriodItem,
  PaginatedItems,
  SelectionPeriodQuery,
  CreateSelectionPeriodBody,
  UpdateSelectionPeriodBody,
  ManualEnrollmentBody,
} from './course-selection.types.js'

const emptyPagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}

export const selectionPeriodService = {
  // TODO(C5, FR-C-30, FR-C-31, FR-C-32, NFR-C-14): 枚举学期阶段并校验时序
  // - 支持 initial / second / adjustment 阶段配置
  // - 校验起止时间、是否重叠、是否启用互斥
  async listPeriods(query: SelectionPeriodQuery): Promise<PaginatedItems<SelectionPeriodItem>> {
    return {
      items: [],
      pagination: {
        ...emptyPagination,
        page: query.page || 1,
        pageSize: query.pageSize || 20,
      },
    }
  },

  // TODO(C5, FR-C-30, FR-C-31, NFR-C-05): 创建阶段并触发可追踪记录
  // - 写入操作者与时间
  // - 校验时段内无冲突
  // - 默认保持事务一致
  async createPeriod(
    operatorUserId: string,
    body: CreateSelectionPeriodBody
  ): Promise<SelectionPeriodItem | null> {
    void operatorUserId
    void body

    return null
  },

  // TODO(C5, FR-C-30, FR-C-32, NFR-C-12): 更新阶段并记录历史
  // - 仅 admin/super_admin 可改
  // - 校验时间/状态变化合法
  async updatePeriod(
    operatorUserId: string,
    periodId: string,
    body: UpdateSelectionPeriodBody
  ): Promise<SelectionPeriodItem | null> {
    void operatorUserId
    void periodId
    void body

    return null
  },

  // TODO(C5, FR-C-33, FR-C-34, NFR-C-04, NFR-C-12): 手动加课保持全量校验
  // - 校验目标学生、课程开设、容量、重复、冲突、学分
  // - 记录操作原因、操作者
  async manualEnroll(
    operatorUserId: string,
    body: ManualEnrollmentBody
  ): Promise<{ success: boolean; enrollmentId: string } | null> {
    void operatorUserId
    void body

    return null
  },
}
