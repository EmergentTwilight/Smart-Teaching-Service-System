/**
 * 角色分配弹窗
 */
import React, { useState, useEffect } from 'react'
import { Modal, Transfer, Tag, Space, message } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/modules/info-management/api/users'

// 可用角色列表（根据实际项目配置)
const AVAILABLE_ROLES = [
  { key: 'admin', title: '管理员' },
  { key: 'teacher', title: '教师' },
  { key: 'student', title: '学生' },
  { key: 'super_admin', title: '超级管理员' },
]

interface RoleAssignModalProps {
  open: boolean
  userId: string
  currentRoles: string[]
  onCancel: () => void
  onSuccess: () => void
}

const RoleAssignModal: React.FC<RoleAssignModalProps> = ({
  open,
  userId,
  currentRoles,
  onCancel,
  onSuccess,
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(currentRoles)
  const queryClient = useQueryClient()

  useEffect(() => {
    setSelectedRoles(currentRoles)
  }, [currentRoles])

  const { mutate, isPending } = useMutation({
    mutationFn: async (newRoles: string[]) => {
      // 计算需要添加和删除的角色
      const toAdd = newRoles.filter((r) => !currentRoles.includes(r))
      const toRemove = currentRoles.filter((r) => !newRoles.includes(r))

      console.log('Role assignment:', { userId, toAdd, toRemove, currentRoles, newRoles })

      // 先添加新角色
      if (toAdd.length > 0) {
        await usersApi.assignRoles(userId, toAdd)
      }
      // 并行删除旧角色
      if (toRemove.length > 0) {
        await Promise.all(toRemove.map(roleId => usersApi.revokeRole(userId, roleId)))
      }
    },
    onSuccess: () => {
      message.success('角色分配成功')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onSuccess()
    },
    onError: (error) => {
      console.error('Role assignment error:', error)
      message.error('角色分配失败')
    },
  })

  return (
    <Modal
      title="分配角色"
      open={open}
      onCancel={onCancel}
      onOk={() => mutate(selectedRoles)}
      confirmLoading={isPending}
      okText="确定"
      cancelText="取消"
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>当前角色：</span>
        {currentRoles.length > 0 ? (
          <Space>
            {currentRoles.map((role) => (
              <Tag key={role} color="blue">
                {AVAILABLE_ROLES.find((r) => r.key === role)?.title || role}
              </Tag>
            ))}
          </Space>
        ) : (
          <Tag>无角色</Tag>
        )}
      </div>

      <Transfer
        dataSource={AVAILABLE_ROLES}
        titles={['可选角色', '已选角色']}
        targetKeys={selectedRoles}
        onChange={(keys) => setSelectedRoles(keys as string[])}
        render={(item) => item.title}
        listStyle={{
          width: 250,
          height: 300,
        }}
        showSearch
      />
    </Modal>
  )
}

export default RoleAssignModal
