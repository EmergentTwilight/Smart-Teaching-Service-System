import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  ExperimentOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { AnnouncementBanner } from '../components/announcement-banner'
import { CourseForumSelector } from '../components/course-forum-selector'
import { PostCard } from '../components/post-card'
import { forumApi } from '../api/forum-api'
import { useDemoMode } from '../hooks/use-demo-mode'
import { useForumCourse } from '../hooks/use-forum-course'
import { DEMO_POSTS } from '../constants/demo-mock'
import { POST_TYPE_LABELS } from '../constants/forum'
import type { PostType } from '../types'
import styles from './forum.module.css'

const { Title, Paragraph, Text } = Typography
const { Search } = Input

export default function ForumHome() {
  const navigate = useNavigate()
  const { demoMode, setDemoMode } = useDemoMode()
  const { courses, courseOfferingId, setCourseOfferingId, loading: courseLoading } =
    useForumCourse(demoMode)
  const [keyword, setKeyword] = useState('')
  const [postType, setPostType] = useState<PostType | undefined>()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['forum-posts', courseOfferingId, keyword, postType, demoMode],
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
          pagination: { page: 1, pageSize: 20, total: list.length, totalPages: 1 },
        }
      }
      return forumApi.getPosts({
        courseOfferingId,
        keyword: keyword || undefined,
        postType,
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
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
  const announcementList = announcements?.data ?? []

  const typeOptions = useMemo(
    () =>
      (Object.keys(POST_TYPE_LABELS) as PostType[]).map((k) => ({
        label: POST_TYPE_LABELS[k],
        value: k,
      })),
    []
  )

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
            <Text style={{ color: 'rgba(255,255,255,0.9)' }}>演示数据</Text>
            <Switch
              checked={demoMode}
              onChange={(v) => {
                setDemoMode(v)
                message.info(v ? '已开启演示模式，便于答辩截图' : '已切换为真实接口数据')
                void refetch()
              }}
            />
            {demoMode && (
              <Tag color="gold" className={styles.demoBadge}>
                DEMO
              </Tag>
            )}
          </Space>
        </Space>
      </div>

      <div className={styles.toolbar}>
        <CourseForumSelector
          courses={courses}
          value={courseOfferingId}
          onChange={setCourseOfferingId}
          loading={courseLoading}
        />
        <Space wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/forum/posts/new')}
          >
            发布帖子
          </Button>
          <Button icon={<SearchOutlined />} onClick={() => navigate('/forum/search')}>
            检索
          </Button>
        </Space>
      </div>

      {!courseOfferingId && !demoMode ? (
        <Empty description="请先选择课程，或开启演示模式">
          <Button
            type="primary"
            icon={<ExperimentOutlined />}
            onClick={() => setDemoMode(true)}
          >
            开启演示模式
          </Button>
        </Empty>
      ) : (
        <Spin spinning={isLoading}>
          <AnnouncementBanner
            announcements={announcementList}
            onOpen={(id) => navigate(`/forum/posts/${id}`)}
          />

          <Space wrap style={{ marginBottom: 16, width: '100%' }}>
            <Search
              placeholder="搜索帖子标题或内容"
              allowClear
              style={{ width: 280 }}
              onSearch={setKeyword}
            />
            <Select
              allowClear
              placeholder="帖子类型"
              style={{ width: 140 }}
              options={typeOptions}
              value={postType}
              onChange={setPostType}
            />
          </Space>

          {posts.length === 0 ? (
            <Empty description="暂无帖子">
              <Button type="primary" onClick={() => navigate('/forum/posts/new')}>
                发布第一条帖子
              </Button>
            </Empty>
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => navigate(`/forum/posts/${post.id}`)}
                />
              ))}
            </Space>
          )}
        </Spin>
      )}
    </div>
  )
}
