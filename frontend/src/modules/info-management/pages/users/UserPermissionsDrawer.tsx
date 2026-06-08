/**
 * 用户权限查看抽屉
 */
import React from 'react'
import { Drawer, List, Tag, Spin, Empty } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/modules/info-management/api/users'

interface UserPermissionsDrawerProps {
  open: boolean
  userId: string
  userName: string
  onClose: () => void
}

const UserPermissionsDrawer: React.FC<UserPermissionsDrawerProps> = ({
  open,
  userId,
  userName,
  onClose,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: () => usersApi.getPermissions(userId),
    enabled: open,
  })
  const permissions = data?.permissions || []

  return (
    <Drawer
      title={`${userName} 的权限`}
      placement="right"
      width={400}
      onClose={onClose}
      open={open}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : permissions.length > 0 ? (
        <List
          dataSource={permissions}
          renderItem={(permission) => (
            <List.Item>
              <Tag color="blue">{permission}</Tag>
            </List.Item>
          )}
        />
      ) : (
        <Empty description="暂无权限" />
      )}
    </Drawer>
  )
}

export default UserPermissionsDrawer
