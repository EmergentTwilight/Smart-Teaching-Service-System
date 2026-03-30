/**
 * 批量导入用户组件
 * 支持 Excel/CSV 文件上传和批量创建用户
 */
import React, { useState, useCallback } from 'react'
import {
  Modal,
  Upload,
  Button,
  Table,
  Alert,
  message,
  Typography,
  Space,
  Steps,
  Result,
} from 'antd'
import {
  UploadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { useMutation } from '@tanstack/react-query'
import { usersApi } from '@/modules/info-management/api/users'
import { MAX_FILE_SIZE } from '@/shared/constants/user'

const { Text } = Typography

interface BatchImportModalProps {
  open: boolean
  onCancel: () => void
  onSuccess: () => void
}

interface ParsedUser {
  username: string
  realName: string
  email: string
  phone?: string
  roles?: string[]
  valid: boolean
  error?: string
}

const BatchImportModal: React.FC<BatchImportModalProps> = ({
  open,
  onCancel,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([])
  const [importResult, setImportResult] = useState<{
    success: number
    failed: number
  } | null>(null)

  const { mutate: batchCreate, isPending } = useMutation({
    mutationFn: (users: Array<Partial<ParsedUser>>) =>
      usersApi.batchCreate(
        users.map((u) => ({
          username: u.username!,
          realName: u.realName!,
          email: u.email!,
          phone: u.phone,
          roles: u.roles || ['student'],
        }))
      ),
    onSuccess: (result) => {
      setImportResult(result)
      setCurrentStep(2)
    },
    onError: () => {
      message.error('批量导入失败')
    },
  })

  // 解析 Excel/CSV 文件
  const parseFile = useCallback(async (file: File): Promise<ParsedUser[]> => {
    return new Promise((resolve) => {
      // 文件大小限制
      if (file.size > MAX_FILE_SIZE) {
        message.error('文件大小不能超过 5MB')
        resolve([])
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          // 简单解析 CSV
          const text = data as string
          const lines = text.split('\n').filter((line) => line.trim())
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

          const users: ParsedUser[] = []
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim())
            const user: ParsedUser = {
              username: values[headers.indexOf('username')] || '',
              realName: values[headers.indexOf('realname') || headers.indexOf('real_name')] || '',
              email: values[headers.indexOf('email')] || '',
              phone: values[headers.indexOf('phone')],
              roles: values[headers.indexOf('roles')]?.split(';').map((r) => r.trim()),
              valid: true,
            }

            // 验证
            if (!user.username) {
              user.valid = false
              user.error = '用户名不能为空'
            } else if (!user.email) {
              user.valid = false
              user.error = '邮箱不能为空'
            } else if (!user.realName) {
              user.valid = false
              user.error = '姓名不能为空'
            }

            users.push(user)
          }
          resolve(users)
        } catch (error) {
          console.error('CSV 解析失败:', error)
          message.error('文件解析失败，请检查文件格式')
          resolve([])
        }
      }
      reader.readAsText(file)
    })
  }, [])

  // 处理文件上传
  const handleUpload = useCallback(async (file: File) => {
    const users = await parseFile(file)
    setParsedUsers(users)
    setCurrentStep(1)
    return false // 阻止自动上传
  }, [parseFile])

  // 开始导入
  const handleImport = useCallback(() => {
    const validUsers = parsedUsers.filter((u) => u.valid)
    if (validUsers.length === 0) {
      message.warning('没有有效的用户数据可导入')
      return
    }
    batchCreate(validUsers)
  }, [parsedUsers, batchCreate])

  // 下载模板
  const handleDownloadTemplate = useCallback(() => {
    const template = 'username,realName,email,phone,roles\nzhangsan,张三,zhangsan@example.com,13800138000,student\nlisi,李四,lisi@example.com,,teacher'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // 重置状态
  const handleReset = () => {
    setCurrentStep(0)
    setFileList([])
    setParsedUsers([])
    setImportResult(null)
  }

  // 关闭弹窗
  const handleCancel = () => {
    handleReset()
    onCancel()
  }

  // 完成并关闭
  const handleFinish = () => {
    handleReset()
    onSuccess()
  }

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'realName',
      key: 'realName',
      width: 100,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      width: 120,
      render: (roles: string[]) => roles?.join(', '),
    },
    {
      title: '状态',
      key: 'valid',
      width: 120,
      render: (_: unknown, record: ParsedUser) =>
        record.valid ? (
          <Text type="success">有效</Text>
        ) : (
          <Text type="danger">{record.error || '无效'}</Text>
        ),
    },
  ]

  const validCount = parsedUsers.filter((u) => u.valid).length
  const invalidCount = parsedUsers.length - validCount

  return (
    <Modal
      title="批量导入用户"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Steps
        current={currentStep}
        items={[
          { title: '上传文件' },
          { title: '预览确认' },
          { title: '导入完成' },
        ]}
        style={{ marginBottom: 24 }}
      />

      {currentStep === 0 && (
        <div>
          <Alert
            message="请上传 CSV 格式的用户数据文件"
            description={
              <div>
                <p>文件格式要求：</p>
                <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                  <li>第一行为表头：username, realName, email, phone, roles</li>
                  <li>roles 多个角色用分号分隔，如：student;teacher</li>
                </ul>
              </div>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              下载模板
            </Button>
            <Upload
              accept=".csv"
              fileList={fileList}
              beforeUpload={handleUpload}
              onRemove={() => setFileList([])}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Space>
        </div>
      )}

      {currentStep === 1 && (
        <div>
          <Alert
            message={`共 ${parsedUsers.length} 条数据，其中 ${validCount} 条有效，${invalidCount} 条无效`}
            type={invalidCount > 0 ? 'warning' : 'success'}
            style={{ marginBottom: 16 }}
          />
          <Table
            columns={columns}
            dataSource={parsedUsers}
            rowKey={(record) => record.username}
            pagination={false}
            scroll={{ y: 300 }}
            style={{ marginBottom: 16 }}
          />
          <Space>
            <Button onClick={() => setCurrentStep(0)}>重新上传</Button>
            <Button
              type="primary"
              onClick={handleImport}
              disabled={validCount === 0}
              loading={isPending}
            >
              开始导入 ({validCount} 条)
            </Button>
          </Space>
        </div>
      )}

      {currentStep === 2 && (
        <Result
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="导入完成"
          subTitle={
            importResult
              ? `成功导入 ${importResult.success} 个用户，失败 ${importResult.failed} 个`
              : '导入完成'
          }
          extra={
            <Space>
              <Button onClick={handleReset}>继续导入</Button>
              <Button type="primary" onClick={handleFinish}>
                完成
              </Button>
            </Space>
          }
        />
      )}
    </Modal>
  )
}

export default BatchImportModal
