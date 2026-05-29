import { Tag } from 'antd'
import { POST_TYPE_COLORS, POST_TYPE_LABELS } from '../constants/forum'
import type { PostType } from '../types'

interface PostTypeTagProps {
  type: PostType
}

export function PostTypeTag({ type }: PostTypeTagProps) {
  return (
    <Tag color={POST_TYPE_COLORS[type]} style={{ marginInlineEnd: 0 }}>
      {POST_TYPE_LABELS[type]}
    </Tag>
  )
}
