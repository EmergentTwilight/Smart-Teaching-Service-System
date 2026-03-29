/**
 * 批量修改状态弹窗
 */
import React, { useState } from 'react'
import { Modal, Radio, Space, message } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/modules/info-management/api/users'

interface BatchStatusModalProps {
  open: boolean
  userIds: string[]
  onCancel: () => void
  onSuccess: () => void
}

const BatchStatusModal: React.FC<BatchStatusModalProps> = ({
  open,
  userIds,
  onCancel,
  onSuccess,
}) => {
  const [status, setStatus] = useState<string>('ACTIVE')
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersApi.batchUpdateStatus(userIds, status),
    onSuccess: () => {
      message.success(`已批量修改 ${userIds.length} 个用户的状态`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onSuccess()
    },
    onError: () => {
      message.error('批量修改状态失败')
    },
  })

  return (
    <Modal
      title={`批量修改状态 (${userIds.length} 个用户)`}
      open={open}
      onCancel={onCancel}
      onOk={() => mutate()}
      confirmLoading={isPending}
      okText="确定"
      cancelText="取消"
    >
      <div style={{ marginBottom: 16 }}>
        请选择要修改的状态：
      </div>
      <Radio.Group value={status} onChange={(e) => setStatus(e.target.value)}>
        <Space direction="vertical">
          <Radio value="ACTIVE">正常</Radio>
          <Radio value="INACTIVE">禁用</Radio>
          <Radio value="BANNED">封禁</Radio>
        </Space>
      </Radio.Group>
    </Modal>
  )
}

export default BatchStatusModal
