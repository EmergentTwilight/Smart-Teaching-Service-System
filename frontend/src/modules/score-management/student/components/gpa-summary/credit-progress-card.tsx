/**
 * 学分进度卡片组件
 *
 * 说明：
 * - 展示学生的各类学分完成情况
 * - 独立组件，可单独使用或与 GPA 卡片配合使用
 *
 * @deprecated 此组件需要 F3 后端提供 curriculumProgress 字段
 *             当前 F3 后端未返回此数据，组件暂时不可用
 *
 * @module score-management/student/components/gpa-summary
 */

import { Card, Empty } from 'antd'
import type { StudentScoreSummary } from '../../types/score-types'

/**
 * 组件 Props
 */
interface CreditProgressCardProps {
  /** GPA 摘要数据 */
  summary: StudentScoreSummary
  /** 加载状态 */
  loading?: boolean
}

/**
 * 学分进度卡片
 *
 * @deprecated 需要后端支持 curriculumProgress 字段
 */
export function CreditProgressCard({ loading }: CreditProgressCardProps) {
  return (
    <Card title="学分进度" loading={loading}>
      <Empty description="分类学分数据暂不可用" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </Card>
  )
}
