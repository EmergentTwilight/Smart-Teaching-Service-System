/**
 * 修改密码弹窗
 * 管理员修改用户密码
 */
import React from 'react'
import { Modal, Form, Input, message } from 'antd'
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/modules/info-management/api/users'

interface ChangePasswordModalProps {
  open: boolean
  userId: string
  userName: string
  onCancel: () => void
  onSuccess: () => void
}

interface ChangePasswordForm {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  userId,
  userName,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: (values: ChangePasswordForm) =>
      usersApi.changePassword(userId, values.oldPassword, values.newPassword),
    onSuccess: () => {
      message.success('密码修改成功')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      form.resetFields()
      onSuccess()
    },
    onError: (error: unknown) => {
      const errorMessage = (error as any)?.response?.data?.message || '密码修改失败'
      message.error(errorMessage)
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      mutate(values)
    } catch (error) {
      // 表单验证失败
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title="修改密码"
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={isPending}
      okText="确定"
      cancelText="取消"
      destroyOnClose
    >
      <p style={{ marginBottom: 16, color: '#666' }}>
        为用户 <strong>{userName}</strong> 修改密码
      </p>

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
      >
        <Form.Item
          name="oldPassword"
          label="旧密码"
          rules={[
            { required: true, message: '请输入旧密码' },
            { min: 8, message: '密码至少8个字符' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
            placeholder="请输入旧密码"
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, message: '密码至少8个字符' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
            placeholder="请输入新密码"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认新密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('两次输入的密码不一致'))
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<CheckCircleOutlined style={{ color: '#9ca3af' }} />}
            placeholder="请再次输入新密码"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ChangePasswordModal
