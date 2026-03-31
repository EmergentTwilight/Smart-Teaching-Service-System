/**
 * 重置密码确认弹窗
 * 支持自动生成和手动设置两种模式
 */
import React, { useState } from 'react'
import { Modal, message, Input, Space, Radio } from 'antd'
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
  const [mode, setMode] = useState<'random' | 'custom'>('random')
  const [randomPassword, setRandomPassword] = useState(() => generateRandomPassword())
  const [customPassword, setCustomPassword] = useState('')
  const queryClient = useQueryClient()

  const password = mode === 'random' ? randomPassword : customPassword

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersApi.resetPassword(userId, password),
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
    setRandomPassword(generateRandomPassword())
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(password)
    message.success('已复制到剪贴板')
  }

  const isValidPassword = () => {
    if (mode === 'random') return true
    // 自定义密码验证：至少8位，包含大小写字母和数字
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password)
    )
  }

  return (
    <Modal
      title="重置密码"
      open={open}
      onCancel={onCancel}
      onOk={() => mutate()}
      confirmLoading={isPending}
      okButtonProps={{ disabled: !isValidPassword() }}
      okText="确定"
      cancelText="取消"
    >
      <p>
        确定要重置用户 <strong>{userName}</strong> 的密码吗？
      </p>

      <Radio.Group
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        style={{ marginBottom: 16 }}
      >
        <Radio value="random">自动生成</Radio>
        <Radio value="custom">手动设置</Radio>
      </Radio.Group>

      {mode === 'random' ? (
        <>
          <p style={{ color: '#999', marginBottom: 8 }}>新密码将生成如下：</p>
          <Space>
            <Input.Password
              value={randomPassword}
              readOnly
              style={{ width: 200 }}
              visibilityToggle={false}
            />
            <a onClick={handleCopy}>
              <CopyOutlined /> 复制
            </a>
            <a onClick={handleRegenerate}>重新生成</a>
          </Space>
        </>
      ) : (
        <>
          <p style={{ color: '#999', marginBottom: 8 }}>请输入新密码：</p>
          <Input.Password
            value={customPassword}
            onChange={(e) => setCustomPassword(e.target.value)}
            placeholder="至少8位，需包含大小写字母和数字"
            style={{ width: '100%' }}
          />
          {!isValidPassword() && customPassword && (
            <p style={{ color: '#ff4d4f', marginTop: 8, fontSize: 12 }}>
              密码至少8位，需包含大写字母、小写字母和数字
            </p>
          )}
        </>
      )}
    </Modal>
  )
}

export default ResetPasswordModal
