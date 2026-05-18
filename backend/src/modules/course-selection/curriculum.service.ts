import type {
  CurriculumPayload,
  CurriculumProgress,
  CurriculumQuery,
  CurriculumProgressQuery,
} from './course-selection.types.js'

/**
 * C1: 培养方案与学分进展服务
 */
export const curriculumService = {
  /**
   * 获取当前学生培养方案
   */
  async getMyCurriculum(
    studentId: string,
    query: CurriculumQuery
  ): Promise<CurriculumPayload | null> {
    void studentId
    void query

    // TODO(C1, FR-C-01, FR-C-02, FR-C-03, FR-C-06, NFR-C-13):
    // 由 C1 成员实现学生 major/grade 到 Curriculum 的匹配，以及 CurriculumCourse 分类输出。
    // 负责人骨架不得提前写入未经 C1 review 的 Prisma 查询假设。
    return null
  },

  /**
   * 获取当前学生学分进展
   */
  async getMyCurriculumProgress(
    studentId: string,
    query: CurriculumProgressQuery
  ): Promise<CurriculumProgress | null> {
    void studentId
    void query

    // TODO(C1, FR-C-05, NFR-C-07): 由有效 Enrollment 汇总真实学分进度
    // - 读取学生 ENROLLED/非 DROPPED 记录
    // - 按课程类型聚合已选学分
    // - 计算与 Curriculum 目标学分的比例
    // TODO(C1, FR-C-05, NFR-C-12): 进度统计结果与后续选课/退课事务需保持一致
    // 负责人 scaffold 不返回 200 全零进度，避免把未实现误判为真实统计结果。
    return null
  },
}
