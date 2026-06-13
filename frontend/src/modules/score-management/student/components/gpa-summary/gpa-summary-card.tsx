/**
 * GPA 摘要卡片组件
 *
 * 说明：
 * - 展示学生的 GPA、平均分、学分进度等信息
 * - 使用 Ant Design Card 和 Statistic 组件
 *
 * @module score-management/student/components/gpa-summary
 */

import { Card, Col, Progress, Row, Statistic } from 'antd'
import type { StudentScoreSummary } from '../../types/score-types'
import { formatGradePoint, formatScore, formatCredits } from '../../../shared/utils/score-formatter'

/**
 * 组件 Props
 */
interface GPASummaryCardProps {
  /** GPA 摘要数据 */
  summary: StudentScoreSummary
  /** 加载状态 */
  loading?: boolean
}

/**
 * GPA 摘要卡片
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const { data } = useStudentScoreSummary()
 *   return data ? <GPASummaryCard summary={data} /> : null
 * }
 * ```
 */
export function GPASummaryCard({ summary, loading }: GPASummaryCardProps) {
  // 计算学分完成百分比
  const creditsPercent = summary.totalRequiredCredits
    ? (summary.earnedCredits / summary.totalRequiredCredits) * 100
    : 0

  // 计算已通过课程百分比
  const totalCourses = summary.passedCourseCount + summary.failedCourseCount
  const coursePercent = totalCourses > 0
    ? (summary.passedCourseCount / totalCourses) * 100
    : 0

  return (
    <Card title="学业概况" loading={loading}>
      <Row gutter={16}>
        {/* GPA 和平均分 */}
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="GPA"
            value={formatGradePoint(summary.gpa)}
            valueStyle={{ color: summary.gpa && summary.gpa >= 3.5 ? '#3f8600' : '#cf1322' }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="平均分"
            value={formatScore(summary.averageScore)}
            suffix="/ 100"
          />
        </Col>

        {/* 课程统计 */}
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="已通过课程"
            value={summary.passedCourseCount}
            suffix="门"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="不及格课程"
            value={summary.failedCourseCount}
            suffix="门"
            valueStyle={{ color: summary.failedCourseCount > 0 ? '#cf1322' : '#3f8600' }}
          />
        </Col>
      </Row>

      {/* 总学分进度 */}
      <div style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>总学分进度：</strong>
          {formatCredits(summary.earnedCredits)} / {formatCredits(summary.totalRequiredCredits ?? 0)}
        </div>
        <Progress
          percent={parseFloat(creditsPercent.toFixed(1))}
          status={creditsPercent >= 100 ? 'success' : 'active'}
        />

        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>课程通过率：</strong>
            {summary.passedCourseCount} / {totalCourses} 门
          </div>
          <Progress
            percent={parseFloat(coursePercent.toFixed(1))}
            status={coursePercent >= 100 ? 'success' : 'active'}
            showInfo={false}
          />
        </div>
      </div>

      {/* 额外信息 */}
      <div style={{ marginTop: 24, color: '#666' }}>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <div>在修学分：{formatCredits(summary.inProgressCredits)}</div>
          </Col>
          <Col xs={24} sm={8}>
            <div>已获学分：{formatCredits(summary.passedCredits)}</div>
          </Col>
          <Col xs={24} sm={8}>
            <div>剩余应修：{formatCredits(summary.remainingRequiredCredits)}</div>
          </Col>
          <Col xs={24} sm={8}>
            <div>专业：{summary.majorName ?? '未知'}</div>
          </Col>
        </Row>
        <div style={{ marginTop: 8 }}>统计规则：{summary.effectiveScoreRule}</div>
      </div>
    </Card>
  )
}
