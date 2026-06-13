/**
 * 学分进度卡片组件
 *
 * 说明：
 * - 展示学生的各类学分完成情况
 * - 独立组件，可单独使用或与 GPA 卡片配合使用
 *
 * @module score-management/student/components/gpa-summary
 */

import { Card, Col, Empty, Progress, Row, Statistic } from 'antd'
import type { StudentScoreSummary } from '../../types/score-types'
import { formatCredits } from '../../../shared/utils/score-formatter'

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
 */
export function CreditProgressCard({ summary, loading }: CreditProgressCardProps) {
  const progress = summary.curriculumProgress

  if (!progress) {
    return (
      <Card title="培养方案进度" loading={loading}>
        <Empty description="培养方案数据暂不可用" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    )
  }

  const requiredPercent = progress.requiredCredits
    ? (progress.requiredPassedCredits / progress.requiredCredits) * 100
    : 0
  const electivePercent = progress.electiveCredits
    ? (progress.electivePassedCredits / progress.electiveCredits) * 100
    : 0
  const completionPercent = progress.completionRate ?? 0

  return (
    <Card title="培养方案进度" loading={loading}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Statistic
            title="总完成度"
            value={completionPercent}
            precision={1}
            suffix="%"
          />
          <Progress percent={completionPercent} status={completionPercent >= 100 ? 'success' : 'active'} />
        </Col>
        <Col xs={24} md={8}>
          <Statistic
            title="必修学分"
            value={`${formatCredits(progress.requiredPassedCredits)} / ${formatCredits(progress.requiredCredits)}`}
          />
          <Progress percent={Number(requiredPercent.toFixed(1))} strokeColor="#ff7875" />
        </Col>
        <Col xs={24} md={8}>
          <Statistic
            title="选修学分"
            value={`${formatCredits(progress.electivePassedCredits)} / ${formatCredits(progress.electiveCredits)}`}
          />
          <Progress percent={Number(electivePercent.toFixed(1))} strokeColor="#69c0ff" />
        </Col>
        <Col xs={24} md={8}>
          <Statistic
            title="培养方案课程"
            value={`${progress.completedCurriculumCourseCount} / ${progress.curriculumCourseCount}`}
            suffix="门"
          />
        </Col>
        <Col xs={24} md={8}>
          <Statistic
            title="剩余应修学分"
            value={formatCredits(progress.remainingRequiredCredits)}
          />
        </Col>
        <Col xs={24} md={8}>
          <Statistic title="培养方案" value={progress.curriculumName ?? '--'} />
        </Col>
      </Row>
    </Card>
  )
}
