/**
 * 批量修改弹窗
 */
import React, { useState, useMemo } from 'react'
import { Modal, Radio, Space, Select, message, Divider } from 'antd'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
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
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [roleIds, setRoleIds] = useState<string[]>([])
  const queryClient = useQueryClient()

  // 获取角色列表
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.getRoles(),
  })

  // 角色选项（从 API 获取）
  const roleOptions = useMemo(() => {
    return (rolesData || []).map((role) => ({
      label: role.name,
      value: role.id,
    }))
  }, [rolesData])

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersApi.batchUpdateStatus(userIds, status, roleIds.length > 0 ? roleIds : undefined),
    onSuccess: () => {
      message.success(`已批量修改 ${userIds.length} 个用户`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onSuccess()
    },
    onError: () => {
      message.error('批量修改失败')
    },
  })

  const handleOk = () => {
    if (!status && roleIds.length === 0) {
      message.warning('请至少选择一项要修改的内容')
      return
    }
    mutate()
  }

  return (
    <Modal
      title={`批量修改 (${userIds.length} 个用户)`}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={isPending}
      okText="确定"
      cancelText="取消"
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>修改状态：</div>
        <Radio.Group value={status} onChange={(e) => setStatus(e.target.value)}>
          <Space direction="vertical">
            <Radio value={undefined}>不修改</Radio>
            <Radio value="ACTIVE">正常</Radio>
            <Radio value="INACTIVE">禁用</Radio>
            <Radio value="BANNED">封禁</Radio>
          </Space>
        </Radio.Group>
      </div>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>修改角色：</div>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="选择要分配的角色（不选择则不修改）"
          value={roleIds}
          onChange={setRoleIds}
          options={roleOptions}
        />
      </div>
    </Modal>
  )
}

export default BatchStatusModal
