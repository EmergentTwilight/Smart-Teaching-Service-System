import { useState } from 'react'
import { Avatar, Button, List, Popconfirm, Space, Typography } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ForumComment } from '../types'
import { CommentEditor } from './comment-editor'
import styles from '../pages/forum.module.css'

const { Text } = Typography

interface CommentListProps {
  comments: ForumComment[]
  onSubmit?: (content: string, parentId?: string) => Promise<void>
  onDelete?: (commentId: string) => Promise<void>
  onHide?: (commentId: string) => Promise<void>
  canDelete?: (authorId: string) => boolean
  canHide?: boolean
  submitting?: boolean
}

function CommentNode({
  comment,
  onReply,
  onDelete,
  onHide,
  canDelete,
  canHide,
}: {
  comment: ForumComment
  onReply: (id: string) => void
  onDelete?: (id: string) => void
  onHide?: (id: string) => void
  canDelete?: (authorId: string) => boolean
  canHide?: boolean
}) {
  const name = comment.author.realName || comment.author.username
  const showDelete = onDelete && canDelete?.(comment.author.id)
  const showHide = onHide && canHide

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
              <Space>
                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onReply(comment.id)}>
                  回复
                </Button>
                {showDelete && (
                  <Popconfirm title="确定删除这条评论？" onConfirm={() => void onDelete(comment.id)}>
                    <Button type="link" size="small" danger style={{ padding: 0 }}>
                      删除
                    </Button>
                  </Popconfirm>
                )}
                {showHide && (
                  <Popconfirm title="隐藏此评论？（管理员操作）" onConfirm={() => void onHide(comment.id)}>
                    <Button type="link" size="small" style={{ padding: 0, color: '#d97706' }}>
                      隐藏
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </Space>
          }
        />
      </List.Item>
      {comment.children?.length > 0 && (
        <div className={styles.commentChildren}>
          {comment.children.map((child) => (
            <CommentNode
              key={child.id}
              comment={child}
              onReply={onReply}
              onDelete={onDelete}
              onHide={onHide}
              canDelete={canDelete}
              canHide={canHide}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CommentList({
  comments,
  onSubmit,
  onDelete,
  onHide,
  canDelete,
  canHide,
  submitting,
}: CommentListProps) {
  const [replyTo, setReplyTo] = useState<string | undefined>()

  const handleSubmit = async (content: string, parentId?: string) => {
    if (!onSubmit) return
    await onSubmit(content, parentId)
    setReplyTo(undefined)
  }

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.children?.length ?? 0),
    0
  )

  return (
    <div className={styles.commentSection}>
      <Text strong style={{ fontSize: 16 }}>
        讨论区 ({totalCount})
      </Text>

      {onSubmit && (
        <CommentEditor
          onSubmit={handleSubmit}
          submitting={submitting}
          replyToId={replyTo}
          onCancelReply={() => setReplyTo(undefined)}
        />
      )}

      <List
        dataSource={comments}
        locale={{ emptyText: '暂无评论，来抢沙发吧' }}
        renderItem={(item) => (
          <CommentNode
            key={item.id}
            comment={item}
            onReply={(id) => setReplyTo(id)}
            onDelete={onDelete}
            onHide={onHide}
            canDelete={canDelete}
            canHide={canHide}
          />
        )}
      />
    </div>
  )
}
