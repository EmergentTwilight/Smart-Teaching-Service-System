/**
 * 成绩分布图表组件
 *
 * 说明：
 * - 展示成绩分数段分布
 * - 使用 Ant Design Progress 模拟柱状图效果
 *
 * @module score-management/student/components/analytics
 */

import { Card, Empty, Progress, Segmented, Space, Typography } from 'antd'
import { useState } from 'react'
import type { ScoreDistributionPoint } from '../../types/score-types'

export interface GradePointDistributionPoint {
  gradePoint: string
  count: number
  percentage: number
}

/**
 * 组件 Props
 */
interface ScoreDistributionChartProps {
  /** 成绩分布数据 */
  data: ScoreDistributionPoint[]
  /** 绩点分布数据，基于后端返回的 gradePoint 聚合 */
  gradePointData?: GradePointDistributionPoint[]
  /** 加载状态 */
  loading?: boolean
}

/**
 * 成绩分布图表
 */
export function ScoreDistributionChart({
  data,
  gradePointData = [],
  loading,
}: ScoreDistributionChartProps) {
  const [mode, setMode] = useState<'score' | 'gradePoint'>('score')

  // 按分数段从高到低排序
  const sortedData = [...data].sort((a, b) => {
    const order = ['90-100', '80-89', '70-79', '60-69', '0-59']
    return order.indexOf(a.range) - order.indexOf(b.range)
  })

  const sortedGradePointData = [...gradePointData].sort(
    (a, b) => Number(b.gradePoint) - Number(a.gradePoint)
  )

  const colorByRange: Record<ScoreDistributionPoint['range'], string> = {
    '90-100': '#52c41a',
    '80-89': '#1677ff',
    '70-79': '#faad14',
    '60-69': '#d48806',
    '0-59': '#ff4d4f',
  }
  const colorByGradePoint: Record<string, string> = {
    '4.0': '#52c41a',
    '3.7': '#13c2c2',
    '3.3': '#1677ff',
    '3.0': '#9254de',
    '2.7': '#eb2f96',
    '2.3': '#faad14',
    '2.0': '#ffc53d',
    '1.5': '#fa8c16',
    '1.0': '#ff4d4f',
    '0.0': '#cf1322',
  }

  return (
    <Card
      title="成绩分布"
      loading={loading}
      extra={
        <Segmented
          size="small"
          value={mode}
          onChange={(value) => setMode(value as 'score' | 'gradePoint')}
          options={[
            { label: '分数段', value: 'score' },
            { label: '绩点', value: 'gradePoint' },
          ]}
        />
      }
    >
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        {mode === 'score' && sortedData.map((item) => {
          const color = colorByRange[item.range]
          return (
            <div key={item.range}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '72px minmax(0, 1fr) 72px',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <Typography.Text strong>{item.rangeLabel}</Typography.Text>
                <Progress
                  percent={item.percentage}
                  strokeColor={color}
                  trailColor="#f0f0f0"
                  showInfo={false}
                />
                <Typography.Text style={{ textAlign: 'right' }}>
                  {item.count} 门
                </Typography.Text>
              </div>
              <Typography.Text type="secondary" style={{ marginLeft: 84, fontSize: 12 }}>
                {item.percentage.toFixed(1)}%
              </Typography.Text>
            </div>
          )
        })}

        {mode === 'gradePoint' && sortedGradePointData.map((item) => {
          const color = colorByGradePoint[item.gradePoint] ?? '#1677ff'
          return (
            <div key={item.gradePoint}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '72px minmax(0, 1fr) 72px',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <Typography.Text strong>{item.gradePoint}</Typography.Text>
                <Progress
                  percent={item.percentage}
                  strokeColor={color}
                  trailColor="#f0f0f0"
                  showInfo={false}
                />
                <Typography.Text style={{ textAlign: 'right' }}>
                  {item.count} 门
                </Typography.Text>
              </div>
              <Typography.Text type="secondary" style={{ marginLeft: 84, fontSize: 12 }}>
                {item.percentage.toFixed(1)}%
              </Typography.Text>
            </div>
          )
        })}

        {mode === 'gradePoint' && sortedGradePointData.length === 0 && (
          <Empty description="暂无绩点分布数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Space>
    </Card>
  )
}
