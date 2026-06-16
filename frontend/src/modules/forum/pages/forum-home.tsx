import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Empty,
  Pagination,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  BarChartOutlined,
  FireOutlined,
  NotificationOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { AnnouncementBanner } from '../components/announcement-banner'
import { CourseForumSelector } from '../components/course-forum-selector'
import { PostCard } from '../components/post-card'
import { PostFilters } from '../components/post-filters'
import { forumApi } from '../api/forum-api'
import { useDemoMode } from '../hooks/use-demo-mode'
import { useForumCourse } from '../hooks/use-forum-course'
import { useForumPermissions } from '../hooks/use-forum-permissions'
import { DEMO_POSTS } from '../constants/demo-mock'
import type { PostType } from '../types'
import styles from './forum.module.css'

const { Title, Paragraph, Text } = Typography

export default function ForumHome() {
  const navigate = useNavigate()
  const perms = useForumPermissions()
  const { demoMode, setDemoMode } = useDemoMode()
  const { courses, courseOfferingId, setCourseOfferingId, loading: courseLoading } =
    useForumCourse(demoMode)

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [postType, setPostType] = useState<PostType | undefined>()
  const [sortBy, setSortBy] = useState('createdAt')
  const pageSize = 10

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['forum-posts', courseOfferingId, keyword, postType, sortBy, page, demoMode],
    enabled: !!courseOfferingId || demoMode,
    queryFn: async () => {
      if (demoMode) {
        let list = [...DEMO_POSTS]
        if (postType) list = list.filter((p) => p.postType === postType)
        if (keyword) {
          const k = keyword.toLowerCase()
          list = list.filter(
            (p) =>
              p.title.toLowerCase().includes(k) ||
              p.content.toLowerCase().includes(k)
          )
        }
        return {
          data: list,
          pagination: { page: 1, pageSize, total: list.length, totalPages: 1 },
        }
      }
      return forumApi.getPosts({
        courseOfferingId,
        keyword: keyword || undefined,
        postType,
        page,
        pageSize,
        sortBy,
        sortOrder: 'desc',
      })
    },
  })

  const { data: announcements } = useQuery({
    queryKey: ['forum-announcements', courseOfferingId, demoMode],
    enabled: !!courseOfferingId || demoMode,
    queryFn: async () => {
      if (demoMode) {
        return {
          data: DEMO_POSTS.filter((p) => p.isAnnouncement),
          pagination: { page: 1, pageSize: 5, total: 1, totalPages: 1 },
        }
      }
      return forumApi.getAnnouncements({ courseOfferingId, pageSize: 5 })
    },
  })

  const posts = data?.data ?? []
  const pagination = data?.pagination
  const announcementList = announcements?.data ?? []

  const { data: hotPosts = [] } = useQuery({
    queryKey: ['forum-hot-posts-home', courseOfferingId, demoMode],
    enabled: !!courseOfferingId || demoMode,
    queryFn: async () => {
      if (demoMode) {
        return DEMO_POSTS.slice(0, 3).map((p) => ({
          id: p.id,
          title: p.title,
          viewCount: p.viewCount,
          commentCount: p.commentCount,
          author: p.author,
          courseName: p.courseOffering.course.name,
          activityScore: p.viewCount + p.commentCount * 2,
        }))
      }
      return forumApi.getHotPosts({
        period: 'week',
        courseOfferingId: courseOfferingId || undefined,
        limit: 5,
      })
    },
  })

  return (
    <div className={styles.pageWrap}>
      <div className={styles.hero}>
        <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Title level={2} className={styles.heroTitle}>
              课程论坛
            </Title>
            <Paragraph className={styles.heroSub}>
              师生围绕课程讨论、提问与资料分享 — STSS D 模块
            </Paragraph>
          </div>
          <Space>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>演示数据</Text>
            <Switch
              checked={demoMode}
              onChange={(v) => {
                setDemoMode(v)
                message.info(v ? '已开启演示模式' : '已切换为真实接口')
                void refetch()
              }}
            />
            {demoMode && <Tag color="gold">DEMO</Tag>}
          </Space>
        </Space>
      </div>

      <div className={styles.toolbar}>
        <CourseForumSelector
          courses={courses}
          value={courseOfferingId}
          onChange={(id) => {
            setCourseOfferingId(id)
            setPage(1)
          }}
          loading={courseLoading}
        />
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/forum/posts/new')}>
            发布帖子
          </Button>
          <Button icon={<SearchOutlined />} onClick={() => navigate('/forum/search')}>
            检索
          </Button>
          {perms.canManageAnnouncements && (
            <Button
              icon={<NotificationOutlined />}
              onClick={() => navigate('/forum/announcements')}
            >
              公告管理
            </Button>
          )}
          {perms.canViewStats && (
            <Button icon={<BarChartOutlined />} onClick={() => navigate('/forum/stats')}>
              论坛统计
            </Button>
          )}
        </Space>
      </div>

      {!courseOfferingId && !demoMode ? (
        <Empty description="请先选择课程开设，或开启演示数据">
          <Button type="primary" onClick={() => setDemoMode(true)}>
            开启演示数据
          </Button>
        </Empty>
      ) : (
        <Spin spinning={isLoading}>
          <AnnouncementBanner
            announcements={announcementList}
            onOpen={(id) => navigate(`/forum/posts/${id}`)}
          />

          <PostFilters
            keyword={keyword}
            postType={postType}
            sortBy={sortBy}
            onKeywordChange={(v) => {
              setKeyword(v)
              setPage(1)
            }}
            onPostTypeChange={(v) => {
              setPostType(v)
              setPage(1)
            }}
            onSortChange={(v) => {
              setSortBy(v)
              setPage(1)
            }}
          />

          <div className={styles.listLayout}>
            <div className={styles.listMain}>
              {posts.length === 0 ? (
                <Empty description="暂无帖子">
                  <Button type="primary" onClick={() => navigate('/forum/posts/new')}>
                    发布第一条帖子
                  </Button>
                </Empty>
              ) : (
                <>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onClick={() => navigate(`/forum/posts/${post.id}`)}
                      />
                    ))}
                  </Space>
                  {!demoMode && pagination && pagination.totalPages > 1 && (
                    <Pagination
                      style={{ marginTop: 24, textAlign: 'center' }}
                      current={page}
                      pageSize={pageSize}
                      total={pagination.total}
                      onChange={setPage}
                      showSizeChanger={false}
                    />
                  )}
                </>
              )}
            </div>

            {hotPosts.length > 0 && (
              <Card className={styles.hotPanel} title={<><FireOutlined /> 本周热帖</>}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {hotPosts.map((item, idx) => (
                    <Button
                      key={item.id}
                      type="link"
                      style={{ padding: 0, height: 'auto', textAlign: 'left' }}
                      onClick={() => navigate(`/forum/posts/${item.id}`)}
                    >
                      <Text>
                        <Text type="secondary">{idx + 1}. </Text>
                        {item.title}
                      </Text>
                    </Button>
                  ))}
                </Space>
              </Card>
            )}
          </div>
        </Spin>
      )}
    </div>
  )
}
