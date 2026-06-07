import { DeleteOutlined, DownloadOutlined, FileOutlined } from '@ant-design/icons'
import { Button, List, Space, Typography } from 'antd'
import type { ForumAttachment, UploadAttachmentResult } from '../types'

const { Text } = Typography

type AttachmentItem = ForumAttachment | UploadAttachmentResult

function formatSize(size: number | string) {
  return `${Math.round(Number(size) / 1024)} KB`
}

function getDownloadUrl(att: AttachmentItem): string | undefined {
  if ('fileUrl' in att && att.fileUrl) return att.fileUrl
  if ('filePath' in att && att.filePath) {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(
      /\/api\/v1$/,
      ''
    )
    return `${base}${att.filePath.startsWith('/') ? '' : '/'}${att.filePath}`
  }
  return undefined
}

interface AttachmentListProps {
  files: AttachmentItem[]
  onRemove?: (id: string) => void
  readonly?: boolean
}

export function AttachmentList({ files, onRemove, readonly }: AttachmentListProps) {
  if (files.length === 0) return null

  return (
    <List
      size="small"
      style={{ marginTop: 12 }}
      dataSource={files}
      renderItem={(att) => {
        const url = getDownloadUrl(att)
        return (
          <List.Item
            actions={
              readonly
                ? url
                  ? [
                      <Button
                        key="dl"
                        type="link"
                        size="small"
                        icon={<DownloadOutlined />}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        下载
                      </Button>,
                    ]
                  : []
                : [
                    ...(url
                      ? [
                          <Button
                            key="dl"
                            type="link"
                            size="small"
                            icon={<DownloadOutlined />}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                          />,
                        ]
                      : []),
                    ...(onRemove
                      ? [
                          <Button
                            key="rm"
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => onRemove(att.id)}
                          />,
                        ]
                      : []),
                  ]
            }
          >
            <Space>
              <FileOutlined style={{ color: '#6366f1' }} />
              <Text>{att.fileName}</Text>
              <Text type="secondary">({formatSize(att.fileSize)})</Text>
            </Space>
          </List.Item>
        )
      }}
    />
  )
}
