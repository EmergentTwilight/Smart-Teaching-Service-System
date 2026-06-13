/**
 * 成绩分布图表组件
 *
 * 说明：
 * - 展示成绩分数段分布
 * - 使用 Ant Design Progress 模拟柱状图效果
 *
 * @module score-management/student/components/analytics
 */

import { Card, Col, Progress, Row, Statistic } from 'antd'
import type { ScoreDistributionPoint } from '../../types/score-types'
import { SCORE_RANGES } from '../../../shared/constants/score-constants'

/**
 * 组件 Props
 */
interface ScoreDistributionChartProps {
  /** 成绩分布数据 */
  data: ScoreDistributionPoint[]
  /** 加载状态 */
  loading?: boolean
}

/**
 * 成绩分布图表
 */
export function ScoreDistributionChart({ data, loading }: ScoreDistributionChartProps) {
  // 按分数段从高到低排序
  const sortedData = [...data].sort((a, b) => {
    const order = ['EXCELLENT', 'GOOD', 'PASS', 'FAIL']
    return order.indexOf(a.range) - order.indexOf(b.range)
  })

  return (
    <Card title="成绩分布" loading={loading}>
      <Row gutter={[16, 16]}>
        {sortedData.map((item) => {
          const rangeInfo = SCORE_RANGES[item.range]
          return (
            <Col xs={24} sm={12} md={6} key={item.range}>
              <Card
                size="small"
                style={{ textAlign: 'center' }}
              >
                <Statistic
                  title={item.rangeLabel}
                  value={item.count}
                  suffix={`门 (${item.percentage.toFixed(1)}%)`}
                  valueStyle={{ color: rangeInfo.color, fontSize: 24 }}
                />
                <Progress
                  percent={item.percentage}
                  strokeColor={rangeInfo.color}
                  showInfo={false}
                  style={{ marginTop: 8 }}
                />
              </Card>
            </Col>
          )
        })}
      </Row>
    </Card>
  )
}
