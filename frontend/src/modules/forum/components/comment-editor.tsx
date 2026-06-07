import { useState } from 'react'
import { Button, Input, Typography } from 'antd'
import styles from '../pages/forum.module.css'

const { Text } = Typography
const { TextArea } = Input

interface CommentEditorProps {
  onSubmit: (content: string, parentId?: string) => Promise<void>
  submitting?: boolean
  replyToId?: string
  onCancelReply?: () => void
}

export function CommentEditor({
  onSubmit,
  submitting,
  replyToId,
  onCancelReply,
}: CommentEditorProps) {
  const [content, setContent] = useState('')

  const handleSubmit = async () => {
    if (!content.trim()) return
    await onSubmit(content.trim(), replyToId)
    setContent('')
  }

  return (
    <div className={styles.commentComposer}>
      {replyToId && (
        <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
          正在回复评论 ·{' '}
          <Button type="link" size="small" onClick={onCancelReply}>
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
  )
}
