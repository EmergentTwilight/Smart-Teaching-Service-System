import type {
  CurriculumInfo,
  CurriculumProgress,
  CurriculumQuery,
  CurriculumProgressQuery,
  CurriculumCourseItem,
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
  ): Promise<{ studentId: string; curriculum: CurriculumInfo; courseGroups: CurriculumCourseItem[] } | null> {
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
    _query: CurriculumProgressQuery
  ): Promise<{ progress: CurriculumProgress; studentId: string }> {
    const progress: CurriculumProgress = {
      totalSelectedCredits: 0,
      requiredSelectedCredits: 0,
      electiveSelectedCredits: 0,
      generalSelectedCredits: 0,
      totalCreditRatio: 0,
    }

    // TODO(C1, FR-C-05, NFR-C-07): 由有效 Enrollment 汇总进度
    // - 读取学生 ENROLLED/非 DROPPED 记录
    // - 按课程类型聚合已选学分
    // - 计算与 Curriculum 目标学分的比例

    // TODO(C1, FR-C-05, NFR-C-12): 进度统计结果与后续选课/退课事务需保持一致

    return {
      studentId,
      progress,
    }
  },
}
