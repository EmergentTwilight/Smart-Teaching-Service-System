import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Card,
  Empty,
  Input,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { PostCard } from '../components/post-card'
import { CourseForumSelector } from '../components/course-forum-selector'
import { forumApi } from '../api/forum-api'
import { useDemoMode } from '../hooks/use-demo-mode'
import { useForumCourse } from '../hooks/use-forum-course'
import { DEMO_POSTS } from '../constants/demo-mock'
import styles from './forum.module.css'

const { Title, Paragraph, Text } = Typography
const { Search } = Input

export default function SearchResult() {
  const navigate = useNavigate()
  const { demoMode } = useDemoMode()
  const { courses, courseOfferingId, setCourseOfferingId, loading } = useForumCourse(demoMode)
  const [keyword, setKeyword] = useState('实验')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['forum-search', keyword, courseOfferingId, demoMode],
    enabled: keyword.length > 0,
    queryFn: async () => {
      if (demoMode) {
        const k = keyword.toLowerCase()
        const list = DEMO_POSTS.filter(
          (p) =>
            p.title.toLowerCase().includes(k) ||
            p.content.toLowerCase().includes(k)
        ).map((p) => ({
          ...p,
          summary: p.content.slice(0, 120),
        }))
        return {
          data: list,
          pagination: { page: 1, pageSize: 20, total: list.length, totalPages: 1 },
        }
      }
      return forumApi.searchPosts({
        keyword,
        courseOfferingId: courseOfferingId || undefined,
      })
    },
  })

  const results = data?.data ?? []

  return (
    <div className={styles.pageWrap}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/forum/posts')}>课程论坛</a> },
          { title: '帖子检索' },
        ]}
      />

      <div className={styles.searchHero}>
        <Title level={3} style={{ marginTop: 0 }}>
          全文检索
        </Title>
        <Paragraph type="secondary">
          在标题与正文中搜索关键词，支持按课程范围筛选（设计报告 D-5）
        </Paragraph>
        <Space wrap style={{ width: '100%', marginTop: 12 }}>
          <Search
            placeholder="输入关键词，如：实验、作业、公告"
            enterButton={<SearchOutlined />}
            size="large"
            defaultValue={keyword}
            style={{ maxWidth: 480, flex: 1 }}
            onSearch={(v) => {
              setKeyword(v.trim())
              void refetch()
            }}
          />
          <CourseForumSelector
            courses={courses}
            value={courseOfferingId}
            onChange={setCourseOfferingId}
            loading={loading}
          />
          {demoMode && <Tag color="purple">演示数据</Tag>}
        </Space>
      </div>

      <Spin spinning={isLoading}>
        {keyword ? (
          results.length > 0 ? (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Text type="secondary">共 {results.length} 条结果</Text>
              {results.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => navigate(`/forum/posts/${post.id}`)}
                />
              ))}
            </Space>
          ) : (
            <Empty description="未找到相关帖子" />
          )
        ) : (
          <Card>
            <Empty description="请输入关键词开始搜索" />
          </Card>
        )}
      </Spin>
    </div>
  )
}
