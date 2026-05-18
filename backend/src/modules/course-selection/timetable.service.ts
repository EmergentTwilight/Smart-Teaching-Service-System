import type { TimetablePayload, TimetableQuery } from './course-selection.types.js'

export const timetableService = {
  // TODO(C4, FR-C-25, NFR-C-08): 生成本人课表
  // - 汇总学生已选课程的 Schedule
  // - 合并冲突课程并标注，供前端课表组件降序展示
  // - 提供可打印字段：学期、星期、节次、周次、课程信息
  // TODO(C4, FR-C-25, FR-C-26, NFR-C-08): format=grid/list 目前先统一返回标准 list 结构，后续再补充表格格式化
  async getMyTimetable(
    studentId: string,
    query: TimetableQuery
  ): Promise<TimetablePayload | null> {
    void studentId
    void query

    return null
  },
}
