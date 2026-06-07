import { useState } from 'react'
import { InboxOutlined } from '@ant-design/icons'
import { Upload, message } from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import { forumApi } from '../api/forum-api'
import { ALLOWED_ATTACHMENT_EXT, MAX_ATTACHMENT_SIZE } from '../constants/forum'
import type { UploadAttachmentResult } from '../types'
import { AttachmentList } from './attachment-list'
import styles from '../pages/forum.module.css'

const { Dragger } = Upload

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface AttachmentUploadProps {
  value?: UploadAttachmentResult[]
  onChange?: (files: UploadAttachmentResult[]) => void
  demoMode?: boolean
}

export function AttachmentUpload({ value = [], onChange, demoMode }: AttachmentUploadProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_ATTACHMENT_EXT.includes(ext)) {
      message.error('不支持的文件类型')
      return Upload.LIST_IGNORE
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      message.error('文件不能超过 10MB')
      return Upload.LIST_IGNORE
    }

    setUploading(true)
    try {
      if (demoMode) {
        const mock: UploadAttachmentResult = {
          id: `demo-upload-${Date.now()}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }
        onChange?.([...value, mock])
        message.success('演示模式：附件已添加')
        return false
      }

      const content = await fileToBase64(file)
      const res = await forumApi.uploadAttachment({
        fileName: file.name,
        fileType: file.type,
        content,
      })
      onChange?.([...value, res])
      message.success(`${file.name} 上传成功`)
    } catch {
      message.error('上传失败')
    } finally {
      setUploading(false)
    }
    return false
  }

  const handleRemove = async (id: string) => {
    if (!demoMode && !id.startsWith('demo-')) {
      try {
        await forumApi.deleteAttachment(id)
      } catch {
        message.error('删除附件失败')
        return
      }
    }
    onChange?.(value.filter((f) => f.id !== id))
  }

  return (
    <div>
      <div className={styles.uploadZone}>
        <Dragger
          multiple
          disabled={uploading}
          fileList={fileList}
          beforeUpload={(file) => void handleUpload(file as File)}
          onChange={({ fileList: fl }) => setFileList(fl)}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: '#6366f1', fontSize: 48 }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
          <p className="ant-upload-hint">
            支持图片、PDF、Office 文档，单文件 ≤ 10MB
          </p>
        </Dragger>
      </div>
      <AttachmentList files={value} onRemove={handleRemove} />
    </div>
  )
}
