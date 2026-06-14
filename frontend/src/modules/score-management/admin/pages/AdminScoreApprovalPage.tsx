import {
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import {
  type ModificationLogItem,
  type PendingModificationRequest,
  type ScoreSnapshot,
  scoreManagementApi,
} from '../../api/score-management'

const { Text } = Typography

const PAGE_SIZE = 10

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatScore(value?: number | null) {
  return value === null || value === undefined ? '-' : value.toFixed(2).replace(/\.00$/, '')
}

function proposedValue(
  request: PendingModificationRequest['request'],
  field: keyof PendingModificationRequest['request']['proposedChanges']
) {
  const value = request.proposedChanges[field]
  return value === undefined ? '-' : formatScore(value)
}

function ScoreSnapshotDescriptions({ snapshot }: { snapshot: ScoreSnapshot }) {
  return (
    <Descriptions size="small" column={2} bordered>
      <Descriptions.Item label="平时">{formatScore(snapshot.usualScore)}</Descriptions.Item>
      <Descriptions.Item label="期中">{formatScore(snapshot.midtermScore)}</Descriptions.Item>
      <Descriptions.Item label="期末">{formatScore(snapshot.finalScore)}</Descriptions.Item>
      <Descriptions.Item label="总评">{formatScore(snapshot.totalScore)}</Descriptions.Item>
      <Descriptions.Item label="绩点">{formatScore(snapshot.gradePoint)}</Descriptions.Item>
      <Descriptions.Item label="等级">{snapshot.gradeLetter ?? '-'}</Descriptions.Item>
    </Descriptions>
  )
}

export default function AdminScoreApprovalPage() {
  const [items, setItems] = useState<PendingModificationRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [courseOfferingId, setCourseOfferingId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [activeRequest, setActiveRequest] = useState<PendingModificationRequest | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [logs, setLogs] = useState<ModificationLogItem[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [approveForm] = Form.useForm<{ comment?: string }>()
  const [rejectForm] = Form.useForm<{ reason: string }>()

  const filters = useMemo(
    () => ({
      courseOfferingId: courseOfferingId.trim() || undefined,
      teacherId: teacherId.trim() || undefined,
    }),
    [courseOfferingId, teacherId]
  )

  const loadRequests = async (targetPage = page) => {
    setLoading(true)
    try {
      const result = await scoreManagementApi.getPendingModificationRequests({
        page: targetPage,
        pageSize: PAGE_SIZE,
        ...filters,
      })
      setItems(result.items)
      setTotal(result.pagination.total)
      setPage(result.pagination.page)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '待审批申请加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRequests(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openLogs = async (record: PendingModificationRequest) => {
    setActiveRequest(record)
    setLogsOpen(true)
    setLogsLoading(true)
    try {
      const result = await scoreManagementApi.getModificationLogs(record.scoreId, {
        page: 1,
        pageSize: 20,
      })
      setLogs(result.items)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '修改日志加载失败')
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!activeRequest) return
    const values = await approveForm.validateFields()
    await scoreManagementApi.approveModificationRequest(activeRequest.scoreId, values.comment)
    message.success('审批已通过')
    setApproveOpen(false)
    setActiveRequest(null)
    approveForm.resetFields()
    await loadRequests(page)
  }

  const handleReject = async () => {
    if (!activeRequest) return
    const values = await rejectForm.validateFields()
    await scoreManagementApi.rejectModificationRequest(activeRequest.scoreId, values.reason)
    message.success('审批已驳回')
    setRejectOpen(false)
    setActiveRequest(null)
    rejectForm.resetFields()
    await loadRequests(page)
  }

  const columns: ColumnsType<PendingModificationRequest> = [
    {
      title: '学生',
      key: 'student',
      width: 150,
      render: (_, record) => record.student?.realName ?? record.studentId,
    },
    {
      title: '教师',
      key: 'teacher',
      width: 150,
      render: (_, record) => record.teacher?.realName ?? record.teacherId,
    },
    {
      title: '开课ID',
      dataIndex: 'courseOfferingId',
      ellipsis: true,
      width: 220,
    },
    {
      title: '拟修改',
      key: 'changes',
      width: 240,
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          <Tag>平时 {proposedValue(record.request, 'usualScore')}</Tag>
          <Tag>期中 {proposedValue(record.request, 'midtermScore')}</Tag>
          <Tag>期末 {proposedValue(record.request, 'finalScore')}</Tag>
        </Space>
      ),
    },
    {
      title: '申请理由',
      dataIndex: ['request', 'reason'],
      ellipsis: true,
    },
    {
      title: '申请时间',
      key: 'appliedAt',
      width: 190,
      render: (_, record) => formatDate(record.request.appliedAt),
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => {
              setActiveRequest(record)
              setApproveOpen(true)
            }}
          >
            通过
          </Button>
          <Button
            danger
            size="small"
            onClick={() => {
              setActiveRequest(record)
              setRejectOpen(true)
            }}
          >
            驳回
          </Button>
          <Button size="small" onClick={() => void openLogs(record)}>
            日志
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap>
        <Input
          placeholder="开课ID"
          value={courseOfferingId}
          onChange={(event) => setCourseOfferingId(event.target.value)}
          style={{ width: 260 }}
        />
        <Input
          placeholder="教师ID"
          value={teacherId}
          onChange={(event) => setTeacherId(event.target.value)}
          style={{ width: 260 }}
        />
        <Button
          type="primary"
          onClick={() => {
            void loadRequests(1)
          }}
        >
          查询
        </Button>
        <Button
          onClick={() => {
            setCourseOfferingId('')
            setTeacherId('')
            setTimeout(() => void loadRequests(1), 0)
          }}
        >
          重置
        </Button>
      </Space>

      <Table
        rowKey="scoreId"
        columns={columns}
        dataSource={items}
        loading={loading}
        scroll={{ x: 1180 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: (nextPage) => void loadRequests(nextPage),
        }}
      />

      <Modal
        title="通过改分申请"
        open={approveOpen}
        okText="通过"
        onOk={() => void handleApprove()}
        onCancel={() => {
          setApproveOpen(false)
          approveForm.resetFields()
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary">通过后将写回成绩、生成修改日志，并记录系统审计日志。</Text>
          <Form form={approveForm} layout="vertical">
            <Form.Item name="comment" label="审批备注">
              <Input.TextArea rows={3} maxLength={500} showCount />
            </Form.Item>
          </Form>
        </Space>
      </Modal>

      <Modal
        title="驳回改分申请"
        open={rejectOpen}
        okText="驳回"
        okButtonProps={{ danger: true }}
        onOk={() => void handleReject()}
        onCancel={() => {
          setRejectOpen(false)
          rejectForm.resetFields()
        }}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="驳回原因"
            rules={[{ required: true, message: '请填写驳回原因' }]}
          >
            <Input.TextArea rows={4} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="成绩修改日志"
        open={logsOpen}
        width={720}
        onClose={() => {
          setLogsOpen(false)
          setLogs([])
        }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Text type="secondary">成绩ID：{activeRequest?.scoreId ?? '-'}</Text>
          <Table
            rowKey="id"
            loading={logsLoading}
            dataSource={logs}
            pagination={false}
            expandable={{
              expandedRowRender: (record) => (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <Text strong>修改前</Text>
                    <ScoreSnapshotDescriptions snapshot={record.oldValue} />
                  </div>
                  <div>
                    <Text strong>修改后</Text>
                    <ScoreSnapshotDescriptions snapshot={record.newValue} />
                  </div>
                </Space>
              ),
            }}
            columns={[
              {
                title: '审批人',
                key: 'modifier',
                render: (_, record) => record.modifierRealName ?? record.modifierUsername ?? '-',
              },
              {
                title: '原因',
                dataIndex: 'reason',
                ellipsis: true,
              },
              {
                title: '时间',
                dataIndex: 'createdAt',
                render: (value: string) => formatDate(value),
              },
            ]}
          />
        </Space>
      </Drawer>
    </Space>
  )
}
