import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { NotificationOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { CourseForumSelector } from '../components/course-forum-selector'
import { forumApi } from '../api/forum-api'
import { useForumCourse } from '../hooks/use-forum-course'
import { useForumPermissions } from '../hooks/use-forum-permissions'
import type { ForumPost } from '../types'
import styles from './forum.module.css'

const { Title, Paragraph } = Typography
const { TextArea } = Input

export default function AnnouncementList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const perms = useForumPermissions()
  const { courses, courseOfferingId, setCourseOfferingId, loading: courseLoading } =
    useForumCourse(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ForumPost | null>(null)
  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['forum-announcements-list', courseOfferingId],
    enabled: !!courseOfferingId,
    queryFn: () => forumApi.getAnnouncements({ courseOfferingId, pageSize: 50 }),
  })

  const saveMutation = useMutation({
    mutationFn: async (values: { title: string; content: string; isPinned?: boolean }) => {
      if (editing) {
        return forumApi.updateAnnouncement(editing.id, values)
      }
      return forumApi.createAnnouncement({
        courseOfferingId: courseOfferingId!,
        ...values,
      })
    },
    onSuccess: () => {
      message.success(editing ? '公告已更新' : '公告已发布')
      setModalOpen(false)
      setEditing(null)
      form.resetFields()
      void queryClient.invalidateQueries({ queryKey: ['forum-announcements-list'] })
      void queryClient.invalidateQueries({ queryKey: ['forum-announcements'] })
    },
    onError: () => message.error('操作失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => forumApi.deleteAnnouncement(id),
    onSuccess: () => {
      message.success('公告已删除')
      void queryClient.invalidateQueries({ queryKey: ['forum-announcements-list'] })
    },
    onError: () => message.error('删除失败'),
  })

  const announcements = data?.data ?? []

  const columns: ColumnsType<ForumPost> = [
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (t, r) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/forum/posts/${r.id}`)}>
          {t}
        </Button>
      ),
    },
    {
      title: '置顶',
      dataIndex: 'isPinned',
      width: 80,
      render: (v) => (v ? <Tag color="gold">是</Tag> : '—'),
    },
    {
      title: '发布时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 160,
      render: (_, r) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setEditing(r)
              form.setFieldsValue({
                title: r.title,
                content: r.content,
                isPinned: r.isPinned,
              })
              setModalOpen(true)
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => deleteMutation.mutate(r.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (!perms.canManageAnnouncements) {
    return (
      <div className={styles.pageWrap}>
        <Empty description="仅教师或管理员可管理公告" />
      </div>
    )
  }

  return (
    <div className={styles.pageWrap}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/forum/posts')}>课程论坛</a> },
          { title: '公告管理' },
        ]}
      />

      <div className={styles.hero} style={{ marginBottom: 20 }}>
        <Title level={3} className={styles.heroTitle}>
          <NotificationOutlined /> 课程公告管理
        </Title>
        <Paragraph className={styles.heroSub}>发布与维护课程公告，支持置顶展示</Paragraph>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <CourseForumSelector
            courses={courses}
            value={courseOfferingId}
            onChange={setCourseOfferingId}
            loading={courseLoading}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!courseOfferingId}
            onClick={() => {
              setEditing(null)
              form.resetFields()
              setModalOpen(true)
            }}
          >
            发布公告
          </Button>
        </Space>

        {!courseOfferingId ? (
          <Empty description="请先选择课程" />
        ) : (
          <Spin spinning={isLoading}>
            <Table rowKey="id" columns={columns} dataSource={announcements} pagination={false} />
          </Spin>
        )}
      </Card>

      <Modal
        title={editing ? '编辑公告' : '发布公告'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input maxLength={200} showCount />
          </Form.Item>
          <Form.Item name="content" label="正文" rules={[{ required: true }]}>
            <TextArea rows={6} showCount maxLength={10000} />
          </Form.Item>
          <Form.Item name="isPinned" label="置顶" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
