import { Alert, Space, Typography } from 'antd'
import { NotificationOutlined } from '@ant-design/icons'
import type { ForumPost } from '../types'

const { Text } = Typography

interface AnnouncementBannerProps {
  announcements: ForumPost[]
  onOpen?: (postId: string) => void
}

export function AnnouncementBanner({ announcements, onOpen }: AnnouncementBannerProps) {
  if (announcements.length === 0) return null

  const top = announcements[0]

  return (
    <Alert
      type="info"
      showIcon
      icon={<NotificationOutlined />}
      message={
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text strong>课程公告</Text>
          {announcements.slice(0, 3).map((item) => (
            <Text
              key={item.id}
              className="forum-announcement-link"
              onClick={() => onOpen?.(item.id)}
              style={{ cursor: onOpen ? 'pointer' : 'default' }}
            >
              {item.isPinned ? '📌 ' : ''}
              {item.title}
            </Text>
          ))}
        </Space>
      }
      description={
        top ? (
          <Text type="secondary" ellipsis>
            {top.content}
          </Text>
        ) : null
      }
      style={{
        marginBottom: 16,
        borderRadius: 12,
        border: '1px solid #c7d2fe',
        background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
      }}
    />
  )
}
