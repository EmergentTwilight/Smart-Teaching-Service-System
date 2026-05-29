import { Card, Space, Typography } from 'antd'
import {
  CommentOutlined,
  EyeOutlined,
  PushpinFilled,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { PostTypeTag } from './post-type-tag'
import type { ForumPost } from '../types'
import styles from '../pages/forum.module.css'

const { Text, Paragraph } = Typography

interface PostCardProps {
  post: ForumPost
  onClick?: () => void
}

export function PostCard({ post, onClick }: PostCardProps) {
  const authorName = post.author.realName || post.author.username
  const courseLabel = `${post.courseOffering.course.code} ${post.courseOffering.course.name}`

  return (
    <Card
      className={`${styles.postCard} ${post.isPinned ? styles.postCardPinned : ''}`}
      hoverable
      onClick={onClick}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Space wrap size={[8, 4]}>
          {post.isPinned && (
            <PushpinFilled style={{ color: '#f59e0b' }} title="置顶" />
          )}
          <PostTypeTag type={post.postType} />
          {post.isAnnouncement && (
            <Text type="warning" style={{ fontSize: 12 }}>
              课程公告
            </Text>
          )}
        </Space>
        <Text strong className={styles.postTitle}>
          {post.title}
        </Text>
        <Paragraph
          type="secondary"
          ellipsis={{ rows: 2 }}
          style={{ marginBottom: 0 }}
        >
          {post.summary || post.content}
        </Paragraph>
        <Space split={<Text type="secondary">·</Text>} wrap size={[4, 4]}>
          <Text type="secondary">{authorName}</Text>
          <Text type="secondary">{courseLabel}</Text>
          <Text type="secondary">
            <EyeOutlined /> {post.viewCount}
          </Text>
          <Text type="secondary">
            <CommentOutlined /> {post.commentCount}
          </Text>
          <Text type="secondary">{dayjs(post.createdAt).format('MM-DD HH:mm')}</Text>
        </Space>
      </Space>
    </Card>
  )
}
