/**
 * 课程类型分布图表组件
 *
 * 说明：
 * - 展示按课程类型的学分分布
 * - 使用 Ant Design Progress 模拟饼图效果
 *
 * @module score-management/student/components/analytics
 */

import React from 'react'
import { Card, Col, Progress, Row, Statistic } from 'antd'
import type { CourseTypeBreakdownPoint } from '../../types/score-types'
import { COURSE_TYPE } from '../../../shared/constants/score-constants'
import { formatScore, formatCredits } from '../../../shared/utils/score-formatter'

/**
 * 组件 Props
 */
interface CourseTypeBreakdownChartProps {
  /** 课程类型分布数据 */
  data: CourseTypeBreakdownPoint[]
  /** 加载状态 */
  loading?: boolean
}

/**
 * 课程类型分布图表
 */
export function CourseTypeBreakdownChart({ data, loading }: CourseTypeBreakdownChartProps) {
  // 计算总学分
  const totalCredits = data.reduce((sum, item) => sum + item.earnedCredits, 0)

  return (
    <Card title="课程类型分布" loading={loading}>
      <Row gutter={[16, 16]}>
        {data.map((item) => {
          const typeInfo = COURSE_TYPE[item.courseType]
          const percentage = totalCredits > 0 ? (item.earnedCredits / totalCredits) * 100 : 0

          return (
            <Col xs={24} sm={8} key={item.courseType}>
              <Card
                size="small"
                style={{ textAlign: 'center' }}
              >
                <Statistic
                  title={item.courseTypeLabel}
                  value={formatCredits(item.earnedCredits)}
                  suffix={`分 (${percentage.toFixed(1)}%)`}
                  valueStyle={{ color: typeInfo.color, fontSize: 20 }}
                />
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginBottom: 4, color: '#888', fontSize: 12 }}>
                    平均分
                  </div>
                  <Progress
                    percent={item.averageScore || 0}
                    strokeColor={typeInfo.color}
                    format={(percent) => formatScore(percent)}
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
