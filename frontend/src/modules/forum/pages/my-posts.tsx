import { useNavigate } from 'react-router-dom'
import { Breadcrumb, Empty, Spin, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { PostCard } from '../components/post-card'
import { forumApi } from '../api/forum-api'
import { useDemoMode } from '../hooks/use-demo-mode'
import { DEMO_POSTS } from '../constants/demo-mock'
import styles from './forum.module.css'

const { Title } = Typography

export default function MyPosts() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { demoMode } = useDemoMode()

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
      return forumApi.getPosts({ authorId: user!.id, pageSize: 50 })
    },
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
      <Title level={3}>我的发布</Title>
      <Spin spinning={isLoading}>
        {posts.length === 0 ? (
          <Empty description="暂无帖子" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onClick={() => navigate(`/forum/posts/${p.id}`)} />
            ))}
          </div>
        )}
      </Spin>
    </div>
  )
}
