/**
 * 批量删除确认弹窗
 * UX 优化：居中显示、醒目的警告信息、清晰的视觉层级
 */
import React from 'react'
import { Modal, message, Typography, Space, Divider } from 'antd'
import { ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/modules/info-management/api/users'

const { Text, Title } = Typography

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
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
          <span>确认批量删除</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={isPending}
      okText="确认删除"
      cancelText="取消"
      okButtonProps={{ 
        danger: true, 
        size: 'large',
        icon: <DeleteOutlined />
      }}
      cancelButtonProps={{ size: 'large' }}
      centered
      width={480}
      maskClosable={false}
      styles={{
        body: { padding: '24px 24px 0' }
      }}
    >
      {/* 醒目的警告区域 */}
      <div 
        style={{ 
          background: '#fff2f0',
          border: '1px solid #ffccc7',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
          textAlign: 'center'
        }}
      >
        <DeleteOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 12 }} />
        <Title level={4} style={{ margin: 0, color: '#cf1322' }}>
          即将删除 {userIds.length} 个用户
        </Title>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* 详细说明 */}
      <div style={{ textAlign: 'center' }}>
        <Text type="secondary">
          删除后，这些用户的所有数据将被永久移除
        </Text>
        <br />
        <Text type="danger" strong style={{ fontSize: 15 }}>
          ⚠️ 此操作不可恢复，请谨慎确认！
        </Text>
      </div>
    </Modal>
  )
}

export default BatchDeleteModal
