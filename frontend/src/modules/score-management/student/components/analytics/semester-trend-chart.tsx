/**
 * 学期趋势图表组件
 *
 * 说明：
 * - 展示按学期的 GPA 和成绩趋势
 * - GPA 和平均分用折线展示，获得学分用柱状图展示
 *
 * @module score-management/student/components/analytics
 */

import { Card, Empty, Space, Typography } from 'antd'
import { useState } from 'react'
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (!loading && data.length === 0) {
    return (
      <Card title="学期趋势" loading={loading}>
        <Empty description="暂无学期趋势数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    )
  }

  const chartWidth = 610
  const chartHeight = 300
  const padding = { top: 28, right: 40, bottom: 58, left: 52 }
  const plotWidth = chartWidth - padding.left - padding.right
  const plotHeight = chartHeight - padding.top - padding.bottom
  const gpaColor = '#0958d9'
  const averageColor = '#d4380d'
  const creditColor = '#91caff'

  const buildDomain = (values: number[], fallbackMin: number, fallbackMax: number) => {
    if (values.length === 0) return { min: fallbackMin, max: fallbackMax }

    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)
    const range = rawMax - rawMin
    const paddingValue = range === 0 ? (fallbackMax - fallbackMin) * 0.05 : range * 0.35
    const min = Math.max(fallbackMin, rawMin - paddingValue)
    const max = Math.min(fallbackMax, rawMax + paddingValue)

    if (max === min) {
      return {
        min: Math.max(fallbackMin, min - 1),
        max: Math.min(fallbackMax, max + 1),
      }
    }

    return { min, max }
  }

  const gpaDomain = buildDomain(
    data.flatMap((item) => (item.gpa === null ? [] : [item.gpa])),
    0,
    4
  )
  const averageDomain = buildDomain(
    data.flatMap((item) => (item.averageScore === null ? [] : [item.averageScore])),
    0,
    100
  )
  const bandWidth = plotWidth / Math.max(data.length, 1)
  const xForIndex = (index: number) => {
    return padding.left + bandWidth * index + bandWidth / 2
  }
  const yForValue = (value: number | null, domain: { min: number; max: number }) => {
    const boundedValue = Math.min(domain.max, Math.max(domain.min, value ?? domain.min))
    return padding.top + plotHeight - ((boundedValue - domain.min) / (domain.max - domain.min)) * plotHeight
  }
  const yForGpa = (value: number | null) =>
    yForValue(value, gpaDomain)
  const yForAverage = (value: number | null) =>
    yForValue(value, averageDomain)

  const maxCredits = Math.max(...data.map((item) => item.earnedCredits), 1)
  const barWidth = Math.min(44, bandWidth * 0.45)
  const gpaPoints = data
    .filter((item) => item.gpa !== null)
    .map((item) => `${xForIndex(data.indexOf(item))},${yForGpa(item.gpa)}`)
    .join(' ')
  const averagePoints = data
    .filter((item) => item.averageScore !== null)
    .map((item) => `${xForIndex(data.indexOf(item))},${yForAverage(item.averageScore)}`)
    .join(' ')
  const axisTicks = [0, 0.25, 0.5, 0.75, 1]

  const activeItem = activeIndex === null ? null : data[activeIndex]

  return (
    <Card title="学期趋势" loading={loading}>
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label="学期 GPA、平均分和获得学分趋势"
          style={{ width: '100%', minWidth: 460, display: 'block' }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <line
            x1={padding.left}
            x2={padding.left}
            y1={padding.top}
            y2={padding.top + plotHeight}
            stroke="#d9d9d9"
          />
          <line
            x1={chartWidth - padding.right}
            x2={chartWidth - padding.right}
            y1={padding.top}
            y2={padding.top + plotHeight}
            stroke="#d9d9d9"
          />

          {axisTicks.map((tick) => {
            const y = padding.top + plotHeight - tick * plotHeight
            const gpaTick = gpaDomain.min + (gpaDomain.max - gpaDomain.min) * tick
            const averageTick =
              averageDomain.min + (averageDomain.max - averageDomain.min) * tick
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#f0f0f0"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill={gpaColor}
                >
                  {gpaTick.toFixed(2)}
                </text>
                <text
                  x={chartWidth - padding.right + 10}
                  y={y + 4}
                  textAnchor="start"
                  fontSize="11"
                  fill={averageColor}
                >
                  {averageTick.toFixed(1)}
                </text>
              </g>
            )
          })}

          <text
            x={padding.left - 34}
            y={padding.top - 10}
            textAnchor="start"
            fontSize="11"
            fill={gpaColor}
          >
            GPA
          </text>
          <text
            x={chartWidth - padding.right + 6}
            y={padding.top - 10}
            textAnchor="start"
            fontSize="11"
            fill={averageColor}
          >
            平均分
          </text>

          {data.map((item, index) => {
            const x = xForIndex(index)
            const barHeight = (item.earnedCredits / maxCredits) * (plotHeight * 0.5)
            const barY = padding.top + plotHeight - barHeight
            return (
              <g key={item.semesterId}>
                <rect
                  x={x - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={creditColor}
                />
                <text
                  x={x}
                  y={chartHeight - 28}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#595959"
                >
                  {item.semesterName}
                </text>
              </g>
            )
          })}

          <polyline points={averagePoints} fill="none" stroke={averageColor} strokeWidth="3" />
          <polyline points={gpaPoints} fill="none" stroke={gpaColor} strokeWidth="3" />

          {data.map((item, index) => {
            const x = xForIndex(index)
            return (
              <g key={`${item.semesterId}-points`}>
                {item.averageScore !== null && (
                  <circle cx={x} cy={yForAverage(item.averageScore)} r="4" fill={averageColor} />
                )}
                {item.gpa !== null && (
                  <circle cx={x} cy={yForGpa(item.gpa)} r="4" fill={gpaColor} />
                )}
                <rect
                  x={padding.left + bandWidth * index}
                  y={padding.top}
                  width={bandWidth}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseMove={() => setActiveIndex(index)}
                />
              </g>
            )
          })}

          {activeIndex !== null && (
            <line
              x1={xForIndex(activeIndex)}
              x2={xForIndex(activeIndex)}
              y1={padding.top}
              y2={padding.top + plotHeight}
              stroke="#bfbfbf"
              strokeDasharray="4 4"
            />
          )}
        </svg>

        {activeItem && (
          <div
            style={{
              position: 'absolute',
              left: `min(calc(${(xForIndex(activeIndex ?? 0) / chartWidth) * 100}% + 8px), calc(100% - 180px))`,
              top: 34,
              width: 172,
              padding: '10px 12px',
              background: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <Typography.Text strong>{activeItem.semesterName}</Typography.Text>
            <Space direction="vertical" size={2} style={{ marginTop: 6, width: '100%' }}>
              <Typography.Text style={{ color: gpaColor }}>
                GPA：{formatGradePoint(activeItem.gpa)}
              </Typography.Text>
              <Typography.Text style={{ color: averageColor }}>
                平均分：{formatScore(activeItem.averageScore)}
              </Typography.Text>
              <Typography.Text>获得学分：{activeItem.earnedCredits}</Typography.Text>
            </Space>
          </div>
        )}
      </div>

      <Space size={16} wrap style={{ marginTop: 8 }}>
        <Typography.Text>
          <span style={{ color: gpaColor, fontWeight: 700 }}>●</span> GPA
        </Typography.Text>
        <Typography.Text>
          <span style={{ color: averageColor, fontWeight: 700 }}>●</span> 平均分
        </Typography.Text>
        <Typography.Text>
          <span style={{ color: creditColor, fontWeight: 700 }}>■</span> 获得学分
        </Typography.Text>
        {/* <Typography.Text type="secondary">
          折线按当前数据范围缩放
        </Typography.Text> */}
      </Space>
    </Card>
  )
}
