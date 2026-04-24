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

import React from 'react'
import { Card, Col, Progress, Row, Empty } from 'antd'
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
export function CreditProgressCard({ summary, loading }: CreditProgressCardProps) {
  // 检查是否有分类学分数据
  // 注意：当前 F3 后端未返回 curriculumProgress 字段
  const hasCurriculumProgress = 'curriculumProgress' in summary

  if (!hasCurriculumProgress) {
    return (
      <Card title="学分进度" loading={loading}>
        <Empty
          description="分类学分数据暂不可用"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    )
  }

  // 以下代码保留以便将来 F3 后端支持时启用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { curriculumProgress } = summary as StudentScoreSummary & { curriculumProgress: CreditProgressCardProps['summary'] extends { curriculumProgress: infer T } ? T : never }

  // 计算各类型学分完成百分比
  const requiredPercent = curriculumProgress.requiredCredits
    ? (curriculumProgress.requiredEarned / curriculumProgress.requiredCredits) * 100
    : 0

  const electivePercent = curriculumProgress.electiveCredits
    ? (curriculumProgress.electiveEarned / curriculumProgress.electiveCredits) * 100
    : 0

  const generalPercent = curriculumProgress.generalCredits
    ? (curriculumProgress.generalEarned / curriculumProgress.generalCredits) * 100
    : 0

  return (
    <Card title="学分进度" loading={loading}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small" title="必修课">
            <div style={{ marginBottom: 8 }}>
              {curriculumProgress.requiredEarned} / {curriculumProgress.requiredCredits}
            </div>
            <Progress
              percent={parseFloat(requiredPercent.toFixed(1))}
              strokeColor="#ff7875"
              status={requiredPercent >= 100 ? 'success' : 'active'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" title="选修课">
            <div style={{ marginBottom: 8 }}>
              {curriculumProgress.electiveEarned} / {curriculumProgress.electiveCredits}
            </div>
            <Progress
              percent={parseFloat(electivePercent.toFixed(1))}
              strokeColor="#69c0ff"
              status={electivePercent >= 100 ? 'success' : 'active'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" title="通识课">
            <div style={{ marginBottom: 8 }}>
              {curriculumProgress.generalEarned} / {curriculumProgress.generalCredits}
            </div>
            <Progress
              percent={parseFloat(generalPercent.toFixed(1))}
              strokeColor="#95de64"
              status={generalPercent >= 100 ? 'success' : 'active'}
            />
          </Card>
        </Col>
      </Row>
    </Card>
  )
}
