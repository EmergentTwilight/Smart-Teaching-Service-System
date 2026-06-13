/**
 * 学期趋势图表组件
 *
 * 说明：
 * - 展示按学期的 GPA 和成绩趋势
 * - 使用 Ant Design 组件模拟折线图效果
 *
 * @module score-management/student/components/analytics
 */

import { Card, Col, Row, Statistic } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons'
import type { SemesterTrendPoint } from '../../types/score-types'
import { formatGradePoint, formatScore } from '../../../shared/utils/score-formatter'

/**
 * 组件 Props
 */
interface SemesterTrendChartProps {
  /** 学期趋势数据 */
  data: SemesterTrendPoint[]
  /** 加载状态 */
  loading?: boolean
}

/**
 * 学期趋势图表
 */
export function SemesterTrendChart({ data, loading }: SemesterTrendChartProps) {
  // 计算趋势
  const getTrendIcon = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return <MinusOutlined style={{ color: '#888' }} />
    if (current > previous) return <ArrowUpOutlined style={{ color: '#3f8600' }} />
    if (current < previous) return <ArrowDownOutlined style={{ color: '#cf1322' }} />
    return <MinusOutlined style={{ color: '#888' }} />
  }

  return (
    <Card title="学期趋势" loading={loading}>
      <Row gutter={[16, 16]}>
        {data.map((item, index) => {
          const prevItem = data[index - 1]
          const gpaTrend = index > 0 ? getTrendIcon(item.gpa, prevItem?.gpa || null) : null

          return (
            <Col xs={24} sm={12} md={8} key={item.semesterId}>
              <Card
                size="small"
                title={item.semesterName}
                extra={gpaTrend}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="GPA"
                      value={formatGradePoint(item.gpa)}
                      valueStyle={{ fontSize: 18 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="平均分"
                      value={formatScore(item.averageScore)}
                      valueStyle={{ fontSize: 18 }}
                    />
                  </Col>
                </Row>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                  <Statistic
                    title="获得学分"
                    value={item.earnedCredits}
                    suffix="分"
                    valueStyle={{ fontSize: 14 }}
                  />
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>
    </Card>
  )
}
