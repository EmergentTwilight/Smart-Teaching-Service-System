import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Card,
  Empty,
  Popconfirm,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PushpinOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { AttachmentList } from '../components/attachment-list'
import { CommentList } from '../components/comment-list'
import { PostTypeTag } from '../components/post-type-tag'
import { forumApi } from '../api/forum-api'
import { useDemoMode } from '../hooks/use-demo-mode'
import { useForumPermissions } from '../hooks/use-forum-permissions'
import { getDemoComments, getDemoPostById } from '../constants/demo-mock'
import styles from './forum.module.css'

const { Title, Paragraph, Text } = Typography

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const perms = useForumPermissions()
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

  const pinMutation = useMutation({
    mutationFn: (pinned: boolean) => forumApi.togglePin(post!.id, pinned),
    onSuccess: () => {
      message.success('置顶状态已更新')
      void queryClient.invalidateQueries({ queryKey: ['forum-post', postId] })
    },
    onError: () => message.error('操作失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => forumApi.deletePost(post!.id),
    onSuccess: () => {
      message.success('帖子已删除')
      navigate('/forum/posts')
    },
    onError: () => message.error('删除失败'),
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

  const handleHideComment = async (commentId: string) => {
    if (demoMode) {
      message.success('演示模式：评论已模拟隐藏')
      return
    }
    try {
      await forumApi.hideComment(commentId)
      message.success('评论已隐藏')
      await refetchComments()
    } catch {
      message.error('隐藏失败')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (demoMode) {
      message.success('演示模式：评论已模拟删除')
      return
    }
    try {
      await forumApi.deleteComment(commentId)
      message.success('评论已删除')
      await refetchComments()
    } catch {
      message.error('删除失败')
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
  const canEdit = perms.canEditPost(post.author.id)
  const canPin = perms.canPinPost && !demoMode

  return (
    <div className={styles.pageWrap}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/forum/posts')}>课程论坛</a> },
          { title: '帖子详情' },
        ]}
      />

      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/forum/posts')}>
          返回列表
        </Button>
        {canEdit && (
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/forum/posts/${post.id}/edit`)}
          >
            编辑
          </Button>
        )}
        {canPin && (
          <Space>
            <Text type="secondary">置顶</Text>
            <Switch
              checked={post.isPinned}
              loading={pinMutation.isPending}
              onChange={(v) => pinMutation.mutate(v)}
            />
          </Space>
        )}
        {canEdit && !demoMode && (
          <Popconfirm title="确定删除此帖子？" onConfirm={() => deleteMutation.mutate()}>
            <Button danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>
              删除
            </Button>
          </Popconfirm>
        )}
      </Space>

      <Card className={styles.detailCard}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space wrap>
            <PostTypeTag type={post.postType} />
            {post.isPinned && (
              <Tag color="gold" icon={<PushpinOutlined />}>
                置顶
              </Tag>
            )}
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
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                附件
              </Text>
              <AttachmentList files={attachments} readonly />
            </div>
          )}
        </Space>
      </Card>

      <Card className={styles.detailCard}>
        <CommentList
          comments={comments}
          onSubmit={handleComment}
          onDelete={handleDeleteComment}
          onHide={handleHideComment}
          canDelete={perms.canDeleteOwnComment}
          canHide={perms.canModerateComments}
          submitting={submitting}
        />
      </Card>
    </div>
  )
}
