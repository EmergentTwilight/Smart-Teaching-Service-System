import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Row,
  Space,
  Spin,
  Statistic,
  Typography,
  message,
} from 'antd'
import { EditOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { PostCard } from '../components/post-card'
import { forumApi } from '../api/forum-api'
import { useDemoMode } from '../hooks/use-demo-mode'
import { useForumPermissions } from '../hooks/use-forum-permissions'
import { DEMO_POSTS } from '../constants/demo-mock'
import styles from './forum.module.css'

const { Title } = Typography

export default function MyPosts() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const perms = useForumPermissions()
  const { demoMode } = useDemoMode()

  const { data: userStats } = useQuery({
    queryKey: ['forum-user-stats', user?.id],
    enabled: !!user?.id && !demoMode,
    queryFn: () => forumApi.getUserStats(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['forum-my-posts', user?.id, demoMode],
    enabled: !!user?.id || demoMode,
    queryFn: async () => {
      if (demoMode) {
        return {
          data: DEMO_POSTS.filter((p) => p.author.username === 'student'),
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        }
      }
      return forumApi.getPosts({ authorId: user!.id, pageSize: 50, sortBy: 'createdAt', sortOrder: 'desc' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => forumApi.deletePost(id),
    onSuccess: () => {
      message.success('已删除')
      void queryClient.invalidateQueries({ queryKey: ['forum-my-posts'] })
    },
    onError: () => message.error('删除失败'),
  })

  const posts = data?.data ?? []

  return (
    <div className={styles.pageWrap}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/forum/posts')}>课程论坛</a> },
          { title: '我的发布' },
        ]}
      />
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          我的发布
        </Title>
        <Button type="primary" onClick={() => navigate('/forum/posts/new')}>
          发布新帖
        </Button>
      </Space>

      {!demoMode && userStats && (
        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col xs={8}>
            <Card className={styles.statCard} size="small">
              <Statistic title="发帖数" value={userStats.postCount} />
            </Card>
          </Col>
          <Col xs={8}>
            <Card className={styles.statCard} size="small">
              <Statistic title="评论数" value={userStats.commentCount} />
            </Card>
          </Col>
          <Col xs={8}>
            <Card className={styles.statCard} size="small">
              <Statistic title="公告数" value={userStats.announcementCount} />
            </Card>
          </Col>
        </Row>
      )}
      <Spin spinning={isLoading}>
        {posts.length === 0 ? (
          <Empty description="暂无帖子" />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {posts.map((p) => {
              const canManage = perms.canEditPost(p.author.id)
              return (
                <div key={p.id} style={{ position: 'relative' }}>
                  <PostCard post={p} onClick={() => navigate(`/forum/posts/${p.id}`)} />
                  {canManage && (
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'edit',
                            icon: <EditOutlined />,
                            label: '编辑',
                            onClick: ({ domEvent }) => {
                              domEvent.stopPropagation()
                              navigate(`/forum/posts/${p.id}/edit`)
                            },
                          },
                          {
                            key: 'delete',
                            icon: <DeleteOutlined />,
                            label: '删除',
                            danger: true,
                            onClick: ({ domEvent }) => {
                              domEvent.stopPropagation()
                              if (demoMode) {
                                message.info('演示模式无法删除')
                                return
                              }
                              deleteMutation.mutate(p.id)
                            },
                          },
                        ],
                      }}
                      trigger={['click']}
                    >
                      <Button
                        type="text"
                        icon={<MoreOutlined />}
                        style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Dropdown>
                  )}
                </div>
              )
            })}
          </Space>
        )}
      </Spin>
    </div>
  )
}
