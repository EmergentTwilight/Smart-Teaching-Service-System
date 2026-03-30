/**
 * 批量删除确认弹窗
 */
import React from 'react'
import { Modal, message } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/modules/info-management/api/users'

interface BatchDeleteModalProps {
  open: boolean
  userIds: string[]
  onCancel: () => void
  onSuccess: () => void
}

const BatchDeleteModal: React.FC<BatchDeleteModalProps> = ({
  open,
  userIds,
  onCancel,
  onSuccess,
}) => {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => Promise.all(userIds.map(id => usersApi.delete(id))),
    onSuccess: () => {
      message.success(`已删除 ${userIds.length} 个用户`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onSuccess()
    },
    onError: () => {
      message.error('批量删除失败')
    },
  })

  const handleOk = () => {
    mutate()
  }

  return (
    <Modal
      title="确认批量删除"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={isPending}
      okText="确定删除"
      cancelText="取消"
      okButtonProps={{ danger: true }}
    >
      <p>确定要删除选中的 <strong>{userIds.length}</strong> 个用户吗？</p>
      <p style={{ color: '#ff4d4f' }}>此操作不可恢复！</p>
    </Modal>
  )
}

export default BatchDeleteModal
