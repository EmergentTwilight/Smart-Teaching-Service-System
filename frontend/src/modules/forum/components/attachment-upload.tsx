import { useEffect, useRef, useState } from 'react'
import { InboxOutlined } from '@ant-design/icons'
import { Upload, message } from 'antd'
import { forumApi } from '../api/forum-api'
import { ALLOWED_ATTACHMENT_EXT, MAX_ATTACHMENT_SIZE } from '../constants/forum'
import type { UploadAttachmentResult } from '../types'
import { AttachmentList } from './attachment-list'
import styles from '../pages/forum.module.css'

const { Dragger } = Upload

type LocalAttachment = UploadAttachmentResult & {
  uploadStatus?: 'uploading' | 'error'
}

type UploadErrorLike = {
  code?: unknown
  message?: unknown
  response?: {
    status?: number
    data?: {
      message?: unknown
      error?: unknown
    }
  }
}

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function getUploadErrorMessage(error: unknown): string {
  const err = error as UploadErrorLike
  const status = err.response?.status
  const apiMessage = getString(err.response?.data?.message) || getString(err.response?.data?.error)

  if (apiMessage) return apiMessage
  if (status === 413) return '文件太大，请确认文件不超过 10MB'
  if (err.code === 'ECONNABORTED') return '上传超时，请稍后重试'
  if (error instanceof Error && error.message) return error.message
  if (typeof status === 'number') return `上传失败（HTTP ${status}）`

  return '上传失败'
}

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
  const latestValueRef = useRef(value)
  const [pendingFiles, setPendingFiles] = useState<LocalAttachment[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    latestValueRef.current = value
  }, [value])

  const getFileExt = (fileName: string) => {
    const dotIndex = fileName.lastIndexOf('.')
    return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : ''
  }

  const validateFile = (file: File) => {
    const ext = getFileExt(file.name)

    if (!ALLOWED_ATTACHMENT_EXT.includes(ext)) {
      message.error('不支持的文件类型')
      return false
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      message.error('文件不能超过 10MB')
      return false
    }

    return true
  }

  const handleUpload = async (file: File) => {
    if (!validateFile(file)) return

    const pendingId = `pending-${Date.now()}-${file.name}`
    const ext = getFileExt(file.name)
    const normalizedFileType = MIME_BY_EXT[ext] || file.type
    const pendingFile: LocalAttachment = {
      id: pendingId,
      fileName: file.name,
      fileSize: file.size,
      fileType: normalizedFileType,
      uploadStatus: 'uploading',
    }

    setPendingFiles((files) => [...files, pendingFile])
    setUploading(true)

    try {
      if (demoMode) {
        const mock: UploadAttachmentResult = {
          id: `demo-upload-${Date.now()}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: normalizedFileType,
        }
        const nextFiles = [...latestValueRef.current, mock]
        latestValueRef.current = nextFiles
        setPendingFiles((files) => files.filter((item) => item.id !== pendingId))
        onChange?.(nextFiles)
        message.success('演示模式：附件已添加')
        return
      }

      const content = await fileToBase64(file)
      const uploaded = await forumApi.uploadAttachment({
        fileName: file.name,
        fileType: normalizedFileType,
        content,
      })

      const nextFiles = [...latestValueRef.current, uploaded]
      latestValueRef.current = nextFiles
      setPendingFiles((files) => files.filter((item) => item.id !== pendingId))
      onChange?.(nextFiles)
      message.success(`${file.name} 上传成功`)
    } catch (error) {
      const errorMessage = getUploadErrorMessage(error)
      console.error('Attachment upload failed:', error)
      setPendingFiles((files) =>
        files.map((item) =>
          item.id === pendingId
            ? { ...item, fileName: `${file.name}（${errorMessage}）`, uploadStatus: 'error' }
            : item
        )
      )
      message.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (id.startsWith('pending-')) {
      setPendingFiles((files) => files.filter((file) => file.id !== id))
      return
    }

    if (!demoMode && !id.startsWith('demo-')) {
      try {
        await forumApi.deleteAttachment(id)
      } catch {
        message.error('删除附件失败')
        return
      }
    }

    const nextFiles = latestValueRef.current.filter((file) => file.id !== id)
    latestValueRef.current = nextFiles
    onChange?.(nextFiles)
  }

  const visibleFiles = [...value, ...pendingFiles]

  return (
    <div>
      <div className={styles.uploadZone}>
        <Dragger
          multiple
          disabled={uploading}
          fileList={[]}
          beforeUpload={(file) => {
            void handleUpload(file as File)
            return Upload.LIST_IGNORE
          }}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: '#6366f1', fontSize: 48 }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
          <p className="ant-upload-hint">支持图片、PDF、Office 文档，单文件不超过 10MB</p>
        </Dragger>
      </div>
      <AttachmentList files={visibleFiles} onRemove={handleRemove} />
    </div>
  )
}
