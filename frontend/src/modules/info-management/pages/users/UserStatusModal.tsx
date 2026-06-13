import React, { useEffect } from 'react'
import { Form, Input, Modal, Radio, message } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/modules/info-management/api/users'

interface UserStatusModalProps {
  open: boolean
  userId: string
  userName: string
  currentStatus?: string
  onCancel: () => void
  onSuccess: () => void
}

const UserStatusModal: React.FC<UserStatusModalProps> = ({
  open,
  userId,
  userName,
  currentStatus,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm<{ status: string; reason?: string }>()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open) {
      return
    }
    form.setFieldsValue({
      status: currentStatus,
      reason: undefined,
    })
  }, [currentStatus, form, open])

  const { mutate, isPending } = useMutation({
    mutationFn: (values: { status: string; reason?: string }) =>
      usersApi.updateStatus(userId, values.status, values.reason?.trim() || undefined),
    onSuccess: () => {
      message.success('用户状态已更新')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onSuccess()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '状态更新失败')
    },
  })

  const handleOk = async () => {
    const values = await form.validateFields()
    mutate(values)
  }

  return (
    <Modal
      title={`修改用户状态 - ${userName}`}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={isPending}
      okText="确定"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="status"
          label="目标状态"
          rules={[{ required: true, message: '请选择目标状态' }]}
        >
          <Radio.Group>
            <Radio value="ACTIVE">正常</Radio>
            <Radio value="INACTIVE">禁用</Radio>
            <Radio value="BANNED">封禁</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="reason"
          label="修改原因"
          extra="建议填写原因，便于系统日志审计追踪"
          rules={[{ max: 200, message: '原因不能超过 200 个字符' }]}
        >
          <Input.TextArea rows={4} placeholder="请输入状态修改原因（可选）" maxLength={200} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default UserStatusModal
