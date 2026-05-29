import { useState } from 'react'
import { Avatar, Button, Input, List, Space, Typography } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ForumComment } from '../types'
import styles from '../pages/forum.module.css'

const { Text } = Typography
const { TextArea } = Input

interface CommentListProps {
  comments: ForumComment[]
  onSubmit?: (content: string, parentId?: string) => Promise<void>
  submitting?: boolean
}

function CommentNode({
  comment,
  onReply,
}: {
  comment: ForumComment
  onReply: (id: string) => void
}) {
  const name = comment.author.realName || comment.author.username

  return (
    <div className={comment.depth > 0 ? styles.commentReply : undefined}>
      <List.Item style={{ padding: '12px 0', border: 'none' }}>
        <List.Item.Meta
          avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />}
          title={
            <Space>
              <Text strong>{name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm')}
              </Text>
            </Space>
          }
          description={
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text>{comment.content}</Text>
              <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onReply(comment.id)}>
                回复
              </Button>
            </Space>
          }
        />
      </List.Item>
      {comment.children?.length > 0 && (
        <div className={styles.commentChildren}>
          {comment.children.map((child) => (
            <CommentNode key={child.id} comment={child} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  )
}

export function CommentList({ comments, onSubmit, submitting }: CommentListProps) {
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<string | undefined>()

  const handleSubmit = async () => {
    if (!content.trim() || !onSubmit) return
    await onSubmit(content.trim(), replyTo)
    setContent('')
    setReplyTo(undefined)
  }

  return (
    <div className={styles.commentSection}>
      <Text strong style={{ fontSize: 16 }}>
        讨论区 ({comments.length})
      </Text>

      {onSubmit && (
        <div className={styles.commentComposer}>
          {replyTo && (
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
              正在回复评论 ·{' '}
              <Button type="link" size="small" onClick={() => setReplyTo(undefined)}>
                取消
              </Button>
            </Text>
          )}
          <TextArea
            rows={3}
            placeholder="写下你的看法…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            showCount
          />
          <Button
            type="primary"
            style={{ marginTop: 12 }}
            loading={submitting}
            onClick={() => void handleSubmit()}
          >
            发表评论
          </Button>
        </div>
      )}

      <List
        dataSource={comments}
        locale={{ emptyText: '暂无评论，来抢沙发吧' }}
        renderItem={(item) => (
          <CommentNode
            key={item.id}
            comment={item}
            onReply={(id) => {
              setReplyTo(id)
            }}
          />
        )}
      />
    </div>
  )
}
