import type {
  SelectionPeriodItem,
  PaginatedItems,
  SelectionPeriodQuery,
  CreateSelectionPeriodBody,
  UpdateSelectionPeriodBody,
  ManualEnrollmentBody,
  ManualEnrollmentResult,
} from './course-selection.types.js'

export const selectionPeriodService = {
  // TODO(C5, FR-C-30, FR-C-31, FR-C-32, NFR-C-14): 枚举学期阶段并校验时序
  // - 支持 first_round / second_round / adjustment 阶段配置
  // - 校验起止时间、是否重叠、是否启用互斥
  // - 路由层 admin/super_admin 仅为入口保护；服务层需映射到 academic_admin / Admin.adminType = ACADEMIC
  async listPeriods(query: SelectionPeriodQuery): Promise<PaginatedItems<SelectionPeriodItem> | null> {
    void query

    // TODO(C5, FR-C-30, FR-C-31, FR-C-32, NFR-C-14):
    // 由 C5 成员实现 SelectionPeriod 真实分页查询和状态展示。
    // 负责人 scaffold 不返回 200 空列表，避免掩盖已有阶段配置。
    return null
  },

  // TODO(C5, FR-C-30, FR-C-31, NFR-C-05): 创建阶段并触发可追踪记录
  // - 写入操作者与时间
  // - 校验时段内无冲突
  // - 默认保持事务一致
  // - 路由层 admin/super_admin 仅为入口保护；服务层需映射到 academic_admin / Admin.adminType = ACADEMIC
  async createPeriod(
    operatorUserId: string,
    body: CreateSelectionPeriodBody
  ): Promise<SelectionPeriodItem | null> {
    void operatorUserId
    void body

    return null
  },

  // TODO(C5, FR-C-30, FR-C-32, NFR-C-12): 更新阶段并记录历史
  // - 路由层 admin/super_admin 仅为入口保护；服务层需映射到 academic_admin / Admin.adminType = ACADEMIC
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
  // - 路由层 admin/super_admin 仅为入口保护；服务层需映射到 academic_admin / Admin.adminType = ACADEMIC
  async manualEnroll(
    operatorUserId: string,
    body: ManualEnrollmentBody
  ): Promise<ManualEnrollmentResult | null> {
    void operatorUserId
    void body

    return null
  },
}
