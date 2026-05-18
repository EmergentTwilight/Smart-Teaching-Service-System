import type { AiAdvicePayload, AiExplainResult } from './course-selection.types.js'
import type { AiRecommendBody } from './course-selection.schemas.js'

export const aiAdvisorService = {
  // TODO(C6, FR-C-38, FR-C-39, NFR-C-09): AI 推荐与解释骨架
  // - 输入：学生培养方案、已选课程、可选课程、容量/课表
  // - 输出：推荐原因、冲突风险、学分影响
  async recommend(
    studentId: string,
    body: AiRecommendBody
  ): Promise<AiAdvicePayload | null> {
    void studentId
    void body

    return null
  },

  // TODO(C6, FR-C-40, FR-C-41, FR-C-42, NFR-C-10, NFR-C-11): AI 仅提供解释，不直接写库
  // - explain 只返回建议文字，不提交 enrollment
  // - AI 不可用时返回降级提示，前端可继续选课
  async explain(
    studentId: string,
    offeringId: string
  ): Promise<AiExplainResult | null> {
    void studentId
    void offeringId

    return null
  },
}
