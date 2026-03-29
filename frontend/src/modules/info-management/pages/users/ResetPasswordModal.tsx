/**
 * 重置密码确认弹窗
 */
import React from 'react'
import { Modal, message } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/modules/info-management/api/users'

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
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersApi.resetPassword(userId),
    onSuccess: () => {
      message.success('密码已重置为默认密码')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onSuccess()
    },
    onError: () => {
      message.error('重置密码失败')
    },
  })

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
      <p style={{ color: '#999' }}>密码将被重置为默认密码，用户需要使用新密码登录。</p>
    </Modal>
  )
}

export default ResetPasswordModal
