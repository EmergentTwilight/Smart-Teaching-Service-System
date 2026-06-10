import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { AttachmentUpload } from '../components/attachment-upload'
import { forumApi } from '../api/forum-api'
import { useDemoMode } from '../hooks/use-demo-mode'
import { useForumCourse } from '../hooks/use-forum-course'
import { POST_TYPE_LABELS } from '../constants/forum'
import type { PostType, UploadAttachmentResult } from '../types'
import styles from './forum.module.css'

const { Title, Paragraph } = Typography
const { TextArea } = Input

export default function PostEditor() {
  const navigate = useNavigate()
  const { postId } = useParams<{ postId: string }>()
  const location = useLocation()
  const isEdit = !!postId && location.pathname.endsWith('/edit')
  const [form] = Form.useForm()
  const { demoMode } = useDemoMode()
  const { courses, courseOfferingId, setCourseOfferingId } = useForumCourse(demoMode)
  const [uploaded, setUploaded] = useState<UploadAttachmentResult[]>([])
  const [submitting, setSubmitting] = useState(false)

  const { data: existingPost, isLoading } = useQuery({
    queryKey: ['forum-post-edit', postId],
    enabled: isEdit && !!postId && !demoMode,
    queryFn: () => forumApi.getPost(postId!),
  })

  useEffect(() => {
    if (existingPost) {
      form.setFieldsValue({
        title: existingPost.title,
        content: existingPost.content,
        postType: existingPost.postType,
      })
      setCourseOfferingId(existingPost.courseOffering.id)
      setUploaded(
        (existingPost.attachments ?? []).map((a) => ({
          id: a.id,
          fileName: a.fileName,
          fileSize: Number(a.fileSize),
          fileType: a.fileType,
          fileUrl: a.fileUrl,
        }))
      )
    }
  }, [existingPost, form, setCourseOfferingId])

  const onFinish = async (values: { title: string; content: string; postType: PostType }) => {
    const coId = courseOfferingId
    if (!coId && !isEdit) {
      message.warning('请选择课程')
      return
    }

    setSubmitting(true)
    try {
      if (demoMode) {
        message.success(isEdit ? '演示模式：帖子已模拟更新' : '演示模式：帖子已模拟发布')
        navigate('/forum/posts')
        return
      }

      if (isEdit && postId) {
        await forumApi.updatePost(postId, {
          title: values.title,
          content: values.content,
        })
        message.success('更新成功')
      } else {
        await forumApi.createPost({
          courseOfferingId: coId,
          title: values.title,
          content: values.content,
          postType: values.postType,
          attachmentIds: uploaded.map((a) => a.id),
        })
        message.success('发布成功')
      }
      navigate('/forum/posts')
    } catch {
      message.error(isEdit ? '更新失败' : '发布失败，请确认已选课')
    } finally {
      setSubmitting(false)
    }
  }

  const typeOptions = (Object.keys(POST_TYPE_LABELS) as PostType[])
    .filter((k) => k !== 'ANNOUNCEMENT')
    .map((k) => ({
      label: POST_TYPE_LABELS[k],
      value: k,
    }))

  if (isEdit && isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
  }

  return (
    <div className={styles.pageWrap}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/forum/posts')}>课程论坛</a> },
          { title: isEdit ? '编辑帖子' : '发布帖子' },
        ]}
      />

      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 12 }}
      >
        返回
      </Button>

      <Card
        className={styles.editorCard}
        title={<Title level={4}>{isEdit ? '编辑帖子' : '发布新帖'}</Title>}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ postType: 'DISCUSSION' }}
          onFinish={(v) => void onFinish(v)}
        >
          {!isEdit && (
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
          )}

          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入帖子标题" maxLength={200} showCount />
          </Form.Item>

          {!isEdit && (
            <Form.Item name="postType" label="类型" rules={[{ required: true }]}>
              <Select options={typeOptions} />
            </Form.Item>
          )}

          <Form.Item name="content" label="正文" rules={[{ required: true, message: '请输入正文' }]}>
            <TextArea rows={8} placeholder="分享你的想法、问题或资料…" showCount maxLength={10000} />
          </Form.Item>

          {!isEdit && (
            <Form.Item label="附件上传">
              <AttachmentUpload value={uploaded} onChange={setUploaded} demoMode={demoMode} />
            </Form.Item>
          )}

          {demoMode && (
            <Paragraph type="secondary">演示模式下不会写入数据库。</Paragraph>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {isEdit ? '保存' : '发布'}
              </Button>
              <Button onClick={() => navigate('/forum/posts')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
