/**
 * 角色分配弹窗
 */
import React, { useState, useEffect, useMemo } from 'react'
import { Modal, Transfer, Tag, Space, message } from 'antd'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { usersApi } from '@/modules/info-management/api/users'
import { useAuthStore } from '@/shared/stores/authStore'
import { extractErrorMessage } from '@/shared/utils/error'

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
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const queryClient = useQueryClient()
  const loggedInUser = useAuthStore((state) => state.user)

  // 检查当前用户是否是超级管理员
  const isSuperAdmin = useMemo(() => {
    return loggedInUser?.roles?.includes('super_admin') ?? false
  }, [loggedInUser?.roles])

  // 获取角色列表
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.getRoles(),
  })

  // 转换为 Transfer 组件所需的格式
  // 如果不是超级管理员，过滤掉 super_admin 角色
  const availableRoles = useMemo(() => {
    let roles = (rolesData || []).map((role) => ({
      key: role.id,
      title: role.name,
      code: role.code,
    }))
    
    // 非 super_admin 不能分配 super_admin 角色
    if (!isSuperAdmin) {
      roles = roles.filter((role) => role.code !== 'super_admin')
    }
    
    return roles
  }, [rolesData, isSuperAdmin])

  useEffect(() => {
    const currentRoleIds = currentRoles
      .map((roleCode) => availableRoles.find((role) => role.code === roleCode)?.key)
      .filter((roleId): roleId is string => Boolean(roleId))

    if (!isSuperAdmin) {
      setSelectedRoles(
        currentRoleIds.filter(
          (roleId) => availableRoles.find((role) => role.key === roleId)?.code !== 'super_admin'
        )
      )
      return
    }

    setSelectedRoles(currentRoleIds)
  }, [availableRoles, currentRoles, isSuperAdmin])

  const { mutate, isPending } = useMutation({
    mutationFn: async (newRoles: string[]) => {
      await usersApi.assignRoles(userId, newRoles)
    },
    onSuccess: () => {
      message.success('角色分配成功')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onSuccess()
    },
    onError: (error: unknown) => {
      message.error(extractErrorMessage(error, '角色分配失败'))
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
                {availableRoles.find((r) => r.code === role)?.title || role}
              </Tag>
            ))}
          </Space>
        ) : (
          <Tag>无角色</Tag>
        )}
      </div>

      <Transfer
        dataSource={availableRoles}
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
