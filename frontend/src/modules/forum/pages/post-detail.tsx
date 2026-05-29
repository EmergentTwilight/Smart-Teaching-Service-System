import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Card,
  Empty,
  List,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  EyeOutlined,
  PaperClipOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { CommentList } from '../components/comment-list'
import { PostTypeTag } from '../components/post-type-tag'
import { forumApi } from '../api/forum-api'
import { useDemoMode } from '../hooks/use-demo-mode'
import { getDemoComments, getDemoPostById } from '../constants/demo-mock'
import styles from './forum.module.css'

const { Title, Paragraph, Text } = Typography

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { demoMode } = useDemoMode()
  const [submitting, setSubmitting] = useState(false)

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['forum-post', postId, demoMode],
    enabled: !!postId,
    queryFn: async () => {
      if (demoMode && postId) {
        const found = getDemoPostById(postId)
        if (!found) throw new Error('帖子不存在')
        return found
      }
      return forumApi.getPost(postId!)
    },
  })

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['forum-comments', postId, demoMode],
    enabled: !!postId,
    queryFn: async () => {
      if (demoMode && postId) return getDemoComments(postId)
      return forumApi.getComments(postId!)
    },
  })

  const handleComment = async (content: string, parentId?: string) => {
    if (demoMode) {
      message.success('演示模式：评论已模拟提交')
      return
    }
    setSubmitting(true)
    try {
      await forumApi.createComment(postId!, { content, parentId })
      message.success('评论成功')
      await refetchComments()
      void queryClient.invalidateQueries({ queryKey: ['forum-post', postId] })
    } catch {
      message.error('评论失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.pageWrap}>
        <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className={styles.pageWrap}>
        <Button type="link" onClick={() => navigate('/forum/posts')}>
          返回论坛
        </Button>
        <Empty description="帖子不存在或无权查看" />
      </div>
    )
  }

  const authorName = post.author.realName || post.author.username
  const attachments = post.attachments ?? []

  return (
    <div className={styles.pageWrap}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/forum/posts')}>课程论坛</a> },
          { title: '帖子详情' },
        ]}
      />

      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/forum/posts')}
        style={{ marginBottom: 12 }}
      >
        返回列表
      </Button>

      <Card className={styles.detailCard}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space wrap>
            <PostTypeTag type={post.postType} />
            {post.isPinned && <Tag color="gold">置顶</Tag>}
            {demoMode && <Tag color="purple">演示数据</Tag>}
          </Space>
          <Title level={3} style={{ margin: 0 }}>
            {post.title}
          </Title>
          <Space wrap split={<Text type="secondary">·</Text>}>
            <Text type="secondary">{authorName}</Text>
            <Text type="secondary">
              {post.courseOffering.course.code} {post.courseOffering.course.name}
            </Text>
            <Text type="secondary">
              <EyeOutlined /> {post.viewCount} 浏览
            </Text>
            <Text type="secondary">{dayjs(post.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
          </Space>
          <Paragraph className={styles.detailContent}>{post.content}</Paragraph>

          {attachments.length > 0 && (
            <div>
              <Text strong>
                <PaperClipOutlined /> 附件
              </Text>
              <List
                size="small"
                dataSource={attachments}
                renderItem={(att) => (
                  <List.Item>
                    <Text>{att.fileName}</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({Math.round(Number(att.fileSize) / 1024)} KB)
                    </Text>
                  </List.Item>
                )}
              />
            </div>
          )}
        </Space>
      </Card>

      <Card className={styles.detailCard}>
        <CommentList
          comments={comments}
          onSubmit={handleComment}
          submitting={submitting}
        />
      </Card>
    </div>
  )
}
