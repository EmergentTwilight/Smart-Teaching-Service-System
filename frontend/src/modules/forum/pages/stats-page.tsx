import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Empty,
  Popconfirm,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Typography,
  message,
} from 'antd'
import {
  CommentOutlined,
  DownloadOutlined,
  FileTextOutlined,
  FireOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { StatFilter, type StatFilterValue } from '../components/stat-filter'
import { forumApi } from '../api/forum-api'
import { useForumCourse } from '../hooks/use-forum-course'
import { useForumPermissions } from '../hooks/use-forum-permissions'
import type { CourseOption, HiddenComment, HotPostItem } from '../types'
import styles from './forum.module.css'

const { Title, Text } = Typography

export default function StatsPage() {
  const navigate = useNavigate()
  const perms = useForumPermissions()
  const { courses, loading: courseLoading } = useForumCourse(false)

  const [filter, setFilter] = useState<StatFilterValue>({
    startDate: dayjs().subtract(30, 'day'),
    endDate: dayjs(),
  })
  const [hotPeriod, setHotPeriod] = useState<'week' | 'month'>('week')

  const statsParams = useMemo(
    () => ({
      startDate: filter.startDate.toISOString(),
      endDate: filter.endDate.toISOString(),
      courseOfferingId: filter.courseOfferingId,
      period: 'week' as const,
    }),
    [filter]
  )

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['forum-stats', statsParams],
    enabled: perms.canViewStats,
    queryFn: () => forumApi.getStats(statsParams),
  })

  const { data: hotPosts = [], isLoading: hotLoading } = useQuery({
    queryKey: ['forum-hot-posts', hotPeriod, filter.courseOfferingId],
    queryFn: () =>
      forumApi.getHotPosts({
        period: hotPeriod,
        courseOfferingId: filter.courseOfferingId,
        limit: 10,
      }),
  })

  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['forum-course-activity', statsParams],
    enabled: perms.canViewStats,
    queryFn: () => forumApi.getCourseActivity(statsParams),
  })

  const { data: hiddenData, isLoading: hiddenLoading, refetch: refetchHidden } = useQuery({
    queryKey: ['forum-hidden-comments', filter.courseOfferingId],
    enabled: perms.canViewHiddenComments,
    queryFn: () =>
      forumApi.getHiddenComments({
        courseOfferingId: filter.courseOfferingId,
        pageSize: 50,
      }),
  })

  const hiddenComments = hiddenData?.data ?? []

  const activityColumns: ColumnsType<CourseOption> = [
    { title: '课程', render: (_, r) => `${r.courseCode} · ${r.courseName}` },
    { title: '帖子', dataIndex: 'postCount', width: 80 },
    { title: '评论', dataIndex: 'commentCount', width: 80 },
    { title: '参与人数', dataIndex: 'participantCount', width: 100 },
    {
      title: '活跃度',
      dataIndex: 'activityScore',
      width: 100,
      render: (v) => (v != null ? Number(v).toFixed(1) : '—'),
    },
  ]

  const handleExport = async () => {
    try {
      const blob = await forumApi.exportStatsCsv(statsParams)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `forum_stats_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch {
      message.error('导出失败')
    }
  }

  if (!perms.canViewStats) {
    return (
      <div className={styles.pageWrap}>
        <Empty description="无权限查看论坛统计" />
      </div>
    )
  }

  return (
    <div className={styles.pageWrap}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/forum/posts')}>课程论坛</a> },
          { title: '论坛统计' },
        ]}
      />

      <div className={styles.hero} style={{ marginBottom: 20 }}>
        <Title level={3} className={styles.heroTitle}>
          论坛数据统计
        </Title>
        <Text className={styles.heroSub}>发文、评论、活跃度与热帖排行</Text>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <StatFilter courses={courses} value={filter} onChange={setFilter} loading={courseLoading} />
        {perms.canExportStats && (
          <Button icon={<DownloadOutlined />} onClick={() => void handleExport()}>
            导出 CSV
          </Button>
        )}
      </Card>

      <Spin spinning={overviewLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card className={styles.statCard}>
              <Statistic title="帖子总数" value={overview?.totalPosts ?? 0} prefix={<FileTextOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className={styles.statCard}>
              <Statistic title="评论总数" value={overview?.totalComments ?? 0} prefix={<CommentOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className={styles.statCard}>
              <Statistic title="附件数" value={overview?.totalAttachments ?? 0} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className={styles.statCard}>
              <Statistic title="活跃用户" value={overview?.activeUsers ?? 0} prefix={<TeamOutlined />} />
            </Card>
          </Col>
        </Row>
      </Spin>

      <Tabs
        items={[
          {
            key: 'hot',
            label: (
              <span>
                <FireOutlined /> 热帖排行
              </span>
            ),
            children: (
              <Spin spinning={hotLoading}>
                <Space style={{ marginBottom: 12 }}>
                  <Button
                    type={hotPeriod === 'week' ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setHotPeriod('week')}
                  >
                    周榜
                  </Button>
                  <Button
                    type={hotPeriod === 'month' ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setHotPeriod('month')}
                  >
                    月榜
                  </Button>
                </Space>
                {hotPosts.length === 0 ? (
                  <Empty description="暂无热帖数据" />
                ) : (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {hotPosts.map((item: HotPostItem) => (
                      <Card key={item.id} size="small" className={styles.postCard}>
                        <Space direction="vertical" size={4}>
                          <Button
                            type="link"
                            style={{ padding: 0, height: 'auto' }}
                            onClick={() => navigate(`/forum/posts/${item.id}`)}
                          >
                            {item.title}
                          </Button>
                          <Text type="secondary">
                            {item.courseName} · {item.viewCount} 浏览 · {item.commentCount} 评论 · 热度{' '}
                            {item.activityScore.toFixed(1)}
                          </Text>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                )}
              </Spin>
            ),
          },
          {
            key: 'activity',
            label: '课程活跃度',
            children: (
              <Spin spinning={activityLoading}>
                <Table
                  rowKey="courseOfferingId"
                  columns={activityColumns}
                  dataSource={activity}
                  pagination={{ pageSize: 8 }}
                />
              </Spin>
            ),
          },
          ...(perms.canViewHiddenComments
            ? [
                {
                  key: 'hidden',
                  label: '隐藏评论',
                  children: (
                    <Spin spinning={hiddenLoading}>
                      <Table<HiddenComment>
                        rowKey="id"
                        dataSource={hiddenComments}
                        pagination={false}
                        locale={{ emptyText: '暂无隐藏评论' }}
                        columns={[
                          {
                            title: '内容',
                            dataIndex: 'content',
                            ellipsis: true,
                          },
                          {
                            title: '作者',
                            render: (_, r) => r.author.realName || r.author.username,
                            width: 100,
                          },
                          {
                            title: '所属帖子',
                            render: (_, r) => (
                              <Button
                                type="link"
                                size="small"
                                onClick={() => navigate(`/forum/posts/${r.post.id}`)}
                              >
                                {r.post.title}
                              </Button>
                            ),
                          },
                          {
                            title: '操作',
                            width: 100,
                            render: (_, r) => (
                              <Popconfirm
                                title="恢复此评论？"
                                onConfirm={async () => {
                                  try {
                                    await forumApi.restoreComment(r.id)
                                    message.success('已恢复')
                                    void refetchHidden()
                                  } catch {
                                    message.error('恢复失败')
                                  }
                                }}
                              >
                                <Button type="link" size="small">
                                  恢复
                                </Button>
                              </Popconfirm>
                            ),
                          },
                        ]}
                      />
                    </Spin>
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  )
}
