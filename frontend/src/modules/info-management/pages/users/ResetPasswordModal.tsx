/**
 * 重置密码确认弹窗
 */
import React, { useState } from 'react'
import { Modal, message, Input, Space } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/modules/info-management/api/users'
import { generateRandomPassword } from '@/shared/utils/password'

interface ResetPasswordModalProps {
  open: boolean
  userId: string
  userName: string
  onCancel: () => void
  onSuccess: () => void
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  open,
  userId,
  userName,
  onCancel,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState(() => generateRandomPassword())
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersApi.resetPassword(userId, newPassword),
    onSuccess: () => {
      message.success('密码已重置')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onSuccess()
    },
    onError: () => {
      message.error('重置密码失败')
    },
  })

  const handleRegenerate = () => {
    setNewPassword(generateRandomPassword())
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(newPassword)
    message.success('已复制到剪贴板')
  }

  return (
    <Modal
      title="重置密码"
      open={open}
      onCancel={onCancel}
      onOk={() => mutate()}
      confirmLoading={isPending}
      okText="确定"
      cancelText="取消"
    >
      <p>确定要重置用户 <strong>{userName}</strong> 的密码吗？</p>
      <p style={{ color: '#999', marginBottom: 16 }}>新密码将生成如下，请告知用户：</p>
      <Space>
        <Input.Password 
          value={newPassword} 
          readOnly 
          style={{ width: 200 }}
          visibilityToggle={false}
        />
        <a onClick={handleCopy}>
          <CopyOutlined /> 复制
        </a>
        <a onClick={handleRegenerate}>
          重新生成
        </a>
      </Space>
    </Modal>
  )
}

export default ResetPasswordModal
