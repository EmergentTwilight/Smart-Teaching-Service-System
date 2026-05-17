import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  FileOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { forumApi } from '../api/forum-api'
import { useDemoMode } from '../hooks/use-demo-mode'
import { useForumCourse } from '../hooks/use-forum-course'
import { ALLOWED_ATTACHMENT_EXT, MAX_ATTACHMENT_SIZE, POST_TYPE_LABELS } from '../constants/forum'
import type { PostType, UploadAttachmentResult } from '../types'
import styles from './forum.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { Dragger } = Upload

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PostEditor() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { demoMode } = useDemoMode()
  const { courses, courseOfferingId, setCourseOfferingId } = useForumCourse(demoMode)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploaded, setUploaded] = useState<UploadAttachmentResult[]>([])
  const [submitting, setSubmitting] = useState(false)

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

    if (demoMode) {
      const mock: UploadAttachmentResult = {
        id: `demo-upload-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      }
      setUploaded((prev) => [...prev, mock])
      message.success('演示模式：附件已添加')
      return false
    }

    try {
      const content = await fileToBase64(file)
      const res = await forumApi.uploadAttachment({
        fileName: file.name,
        fileType: file.type,
        content,
      })
      setUploaded((prev) => [...prev, res])
      message.success(`${file.name} 上传成功`)
    } catch {
      message.error('上传失败')
    }
    return false
  }

  const onFinish = async (values: {
    title: string
    content: string
    postType: PostType
  }) => {
    const coId = courseOfferingId
    if (!coId) {
      message.warning('请选择课程')
      return
    }

    setSubmitting(true)
    try {
      if (demoMode) {
        message.success('演示模式：帖子已模拟发布')
        navigate('/forum/posts')
        return
      }
      await forumApi.createPost({
        courseOfferingId: coId,
        title: values.title,
        content: values.content,
        postType: values.postType,
        attachmentIds: uploaded.map((a) => a.id),
      })
      message.success('发布成功')
      navigate('/forum/posts')
    } catch {
      message.error('发布失败，请确认已选课或联系管理员')
    } finally {
      setSubmitting(false)
    }
  }

  const typeOptions = (Object.keys(POST_TYPE_LABELS) as PostType[]).map((k) => ({
    label: POST_TYPE_LABELS[k],
    value: k,
  }))

  return (
    <div className={styles.pageWrap}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/forum/posts')}>课程论坛</a> },
          { title: '发布帖子' },
        ]}
      />

      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/forum/posts')}
        style={{ marginBottom: 12 }}
      >
        返回
      </Button>

      <Card className={styles.editorCard} title={<Title level={4}>发布新帖</Title>}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ postType: 'DISCUSSION' }}
          onFinish={(v) => void onFinish(v)}
        >
          <Form.Item label="所属课程" required>
            <Select
              value={courseOfferingId || undefined}
              onChange={setCourseOfferingId}
              placeholder="选择课程"
              options={courses.map((c) => ({
                value: c.courseOfferingId,
                label: `${c.courseCode} · ${c.courseName}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入帖子标题" maxLength={200} showCount />
          </Form.Item>

          <Form.Item
            name="postType"
            label="类型"
            rules={[{ required: true }]}
          >
            <Select options={typeOptions} />
          </Form.Item>

          <Form.Item
            name="content"
            label="正文"
            rules={[{ required: true, message: '请输入正文' }]}
          >
            <TextArea rows={8} placeholder="分享你的想法、问题或资料…" showCount maxLength={10000} />
          </Form.Item>

          <Form.Item label="附件上传（Base64）">
            <div className={styles.uploadZone}>
              <Dragger
                multiple
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
                  支持图片、PDF、Word、Excel，单文件 ≤ 10MB，最多可先传多个再发布
                </p>
              </Dragger>
            </div>

            {uploaded.length > 0 && (
              <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
                <Text strong>
                  <CloudUploadOutlined /> 已上传附件
                </Text>
                {uploaded.map((f) => (
                  <Tag key={f.id} icon={<FileOutlined />} color="processing">
                    {f.fileName} ({Math.round(f.fileSize / 1024)} KB)
                  </Tag>
                ))}
              </Space>
            )}
          </Form.Item>

          {demoMode && (
            <Paragraph type="secondary">
              当前为演示模式，发布与上传不会写入数据库，适合答辩截图。
            </Paragraph>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                发布
              </Button>
              <Button onClick={() => navigate('/forum/posts')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
