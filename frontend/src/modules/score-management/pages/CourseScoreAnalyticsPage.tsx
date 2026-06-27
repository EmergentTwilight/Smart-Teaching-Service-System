import {
  Alert,
  Button,
  Col,
  Empty,
  Form,
  Input,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import { LineChartOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useState } from 'react'
import {
  scoreManagementApi,
  type CourseScoreDistributionItem,
  type CourseScoreRankingItem,
} from '../api/score-management'

const { Text, Title } = Typography

const rankingColumns: ColumnsType<CourseScoreRankingItem> = [
  { title: '排名', dataIndex: 'rank', width: 80 },
  { title: '学号', dataIndex: 'studentNumber', width: 140 },
  { title: '姓名', dataIndex: 'studentName' },
  {
    title: '总评',
    dataIndex: 'totalScore',
    width: 100,
    render: (value: number) => value.toFixed(2),
  },
]

function formatScore(value: number | null) {
  return value == null ? '-' : value.toFixed(2)
}

export default function CourseScoreAnalyticsPage() {
  const [draftCourseOfferingId, setDraftCourseOfferingId] = useState('')
  const [courseOfferingId, setCourseOfferingId] = useState('')

  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['score-management', 'course-score-analytics', courseOfferingId],
    enabled: Boolean(courseOfferingId),
    queryFn: () => scoreManagementApi.getCourseScoreAnalytics(courseOfferingId),
  })

  const submittedRate =
    data && data.totalStudents > 0
      ? Math.round((data.submittedCount / data.totalStudents) * 100)
      : 0
  const passRate =
    data && data.submittedCount > 0
      ? Math.round((data.passCount / data.submittedCount) * 100)
      : 0

  const handleSubmit = () => {
    const value = draftCourseOfferingId.trim()
    if (!value) return
    setCourseOfferingId(value)
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
            <Space>
              <LineChartOutlined style={{ color: '#1677ff', fontSize: 22 }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  课程成绩分析
                </Title>
                <Text type="secondary">教师查看本人任课课程，管理员查看全部课程。</Text>
              </div>
            </Space>
            <Button
              icon={<ReloadOutlined />}
              disabled={!courseOfferingId}
              loading={isFetching}
              onClick={() => {
                void refetch()
              }}
            >
              刷新
            </Button>
          </Space>

          <Form layout="inline" onFinish={handleSubmit}>
            <Form.Item style={{ flex: 1, minWidth: 280 }}>
              <Input
                allowClear
                value={draftCourseOfferingId}
                placeholder="请输入开设课程 ID"
                onChange={(event) => setDraftCourseOfferingId(event.target.value)}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                loading={isFetching}
              >
                查询
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="课程成绩分析加载失败"
          description={error instanceof Error ? error.message : '请检查课程 ID 或当前账号权限'}
        />
      ) : null}

      {!courseOfferingId ? (
        <div style={{ background: '#fff', borderRadius: 8, padding: 32 }}>
          <Empty description="输入开设课程 ID 后查看课程成绩分布、通过率和排名" />
        </div>
      ) : null}

      {data ? (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ background: '#fff', borderRadius: 8, padding: 20 }}>
                <Statistic title="课程" value={data.courseName} />
                <Text type="secondary">任课教师：{data.teacherName}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ background: '#fff', borderRadius: 8, padding: 20 }}>
                <Statistic
                  title="已提交/选课人数"
                  value={`${data.submittedCount}/${data.totalStudents}`}
                />
                <Progress percent={submittedRate} size="small" />
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ background: '#fff', borderRadius: 8, padding: 20 }}>
                <Statistic title="平均分" value={formatScore(data.averageScore)} />
                <Text type="secondary">
                  最高 {formatScore(data.maxScore)} / 最低 {formatScore(data.minScore)}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ background: '#fff', borderRadius: 8, padding: 20 }}>
                <Statistic title="通过率" value={passRate} suffix="%" />
                <Text type="secondary">
                  通过 {data.passCount} / 未通过 {data.failCount}
                </Text>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={10}>
              <div style={{ background: '#fff', borderRadius: 8, padding: 20 }}>
                <Title level={5} style={{ marginTop: 0 }}>
                  分数段分布
                </Title>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {data.distribution.map((item: CourseScoreDistributionItem) => {
                    const percent =
                      data.submittedCount > 0
                        ? Math.round((item.count / data.submittedCount) * 100)
                        : 0

                    return (
                      <div key={item.range}>
                        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                          <Text>{item.range}</Text>
                          <Text type="secondary">{item.count} 人</Text>
                        </Space>
                        <Progress percent={percent} size="small" />
                      </div>
                    )
                  })}
                </Space>
              </div>
            </Col>
            <Col xs={24} lg={14}>
              <div style={{ background: '#fff', borderRadius: 8, padding: 20 }}>
                <Title level={5} style={{ marginTop: 0 }}>
                  课程排名 Top 10
                </Title>
                <Table
                  rowKey="studentId"
                  columns={rankingColumns}
                  dataSource={data.rankingTop10}
                  pagination={false}
                  size="middle"
                />
              </div>
            </Col>
          </Row>
        </>
      ) : null}
    </Space>
  )
}
