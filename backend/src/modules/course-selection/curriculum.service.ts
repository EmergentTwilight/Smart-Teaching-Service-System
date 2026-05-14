import type {
  CurriculumInfo,
  CurriculumProgress,
  CurriculumQuery,
  CurriculumProgressQuery,
  CurriculumCourseItem,
} from './course-selection.types.js'

/**
 * TODO(C1, FR-C-01, FR-C-02, FR-C-03): 补充学生专业与年级匹配逻辑
 * - 按当前用户 student.majorId + grade 查找 Curriculum
 * - 校验课程分类 required/elective/general 映射关系
 */
function placeholderCurriculumFromSeed(_studentId: string): CurriculumInfo {
  return {
    id: 'placeholder-curriculum-id',
    name: '待配置培养方案',
    year: new Date().getFullYear(),
    majorName: '待绑定专业',
    totalCredits: 0,
    requiredCredits: 0,
    electiveCredits: 0,
  }
}

/**
 * C1: 培养方案与学分进展服务
 */
export const curriculumService = {
  /**
   * 获取当前学生培养方案
   */
  async getMyCurriculum(
    studentId: string,
    _query: CurriculumQuery
  ): Promise<{ studentId: string; curriculum: CurriculumInfo; courseGroups: CurriculumCourseItem[] }> {
    const curriculum: CurriculumInfo = placeholderCurriculumFromSeed(studentId)

    const courseGroups: CurriculumCourseItem[] = []

    // TODO(C1, FR-C-05, NFR-C-08): 根据课程类型聚合课程进度所需课程清单
    // - 查询 CurriculumCourses，并补齐课程代码、名称和建议修读学期
    // - 与课程类型分类(必须/选修/公共)一致输出 courseGroups

    // TODO(C1, FR-C-06, NFR-C-06): 学生无匹配培养方案时返回拒绝提示，不允许进入自动选课列表
    // - 若 student.majorId/grade 与现有 Curriculum 不匹配，返回可见且可操作的错误提示

    return {
      studentId,
      curriculum,
      courseGroups,
    }
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
