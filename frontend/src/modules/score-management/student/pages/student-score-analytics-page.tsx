import { Col, Empty, Row, Space } from 'antd'
import { useMemo } from 'react'
import { useStudentScoreAnalytics, useStudentScores } from '../hooks'
import {
  CourseTypeBreakdownChart,
  ScoreDistributionChart,
  SemesterTrendChart,
} from '../components/analytics'

export default function StudentScoreAnalyticsPage() {
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useStudentScoreAnalytics()
  const { data: scoreListData } = useStudentScores({
    page: 1,
    pageSize: 100,
  })

  const hasAnalyticsContent = useMemo(() => {
    if (!analyticsData) return false

    return (
      analyticsData.semesterTrend.length > 0 ||
      analyticsData.scoreDistribution.some((item) => item.count > 0) ||
      analyticsData.courseTypeBreakdown.length > 0
    )
  }, [analyticsData])

  const gradePointDistribution = useMemo(() => {
    const effectiveScores =
      scoreListData?.items.filter((score) => score.isEffective && score.gradePoint !== null) ?? []
    const total = effectiveScores.length
    const counts = new Map<string, number>()

    for (const score of effectiveScores) {
      const key = score.gradePoint!.toFixed(1)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return ['4.0', '3.7', '3.3', '3.0', '2.7', '2.3', '2.0', '1.5', '1.0', '0.0'].map((gradePoint) => {
      const count = counts.get(gradePoint) ?? 0
      return {
      gradePoint,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }
    })
  }, [scoreListData])

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {analyticsError && (
          <div
            style={{
              padding: 16,
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: 4,
            }}
          >
            加载成绩分析失败：{analyticsError.message}
          </div>
        )}

        {analyticsData && hasAnalyticsContent && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <SemesterTrendChart data={analyticsData.semesterTrend} loading={analyticsLoading} />
            </Col>
            <Col xs={24} lg={12}>
              <ScoreDistributionChart
                data={analyticsData.scoreDistribution}
                gradePointData={gradePointDistribution}
                loading={analyticsLoading}
              />
            </Col>
            <Col xs={24}>
              <CourseTypeBreakdownChart
                data={analyticsData.courseTypeBreakdown}
                loading={analyticsLoading}
              />
            </Col>
          </Row>
        )}

        {analyticsData && !hasAnalyticsContent && (
          <div style={{ background: '#fff', borderRadius: 8, padding: 24 }}>
            <Empty description="暂无可分析的成绩数据" />
          </div>
        )}
      </Space>
    </div>
  )
}
