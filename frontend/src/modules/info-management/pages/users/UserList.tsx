/**
 * 用户列表页面
 * 显示用户列表，支持新增、编辑、删除、搜索、分页、批量操作、状态管理、角色分配、权限查看
 */
import React, { useState, useCallback, useMemo, useRef } from 'react'
import {
  Table,
  Button,
  Space,
  Tag,
  message,
  Input,
  Select,
  Card,
  Row,
  Col,
  Dropdown,
  Alert,
  Modal,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  KeyOutlined,
  SafetyOutlined,
  UserOutlined,
  FileTextOutlined,
  UploadOutlined,
  DownOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TableProps } from 'antd/es/table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { usersApi, type UserQueryParams } from '@/modules/info-management/api/users'
import type { User, UserFormData } from '@/shared/types'
import { USER_STATUS_CONFIG } from '@/shared/constants/user'
import dayjs from 'dayjs'
import UserForm from './UserForm'
import BatchImportModal from './BatchImportModal'
import BatchStatusModal from './BatchStatusModal'
import RoleAssignModal from './RoleAssignModal'
import UserPermissionsDrawer from './UserPermissionsDrawer'
import ResetPasswordModal from './ResetPasswordModal'
import ChangePasswordModal from './ChangePasswordModal'

const { Search } = Input

/** 简单防抖函数 */
function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), wait)
  }
}

const UserList: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 表单状态
  const [formOpen, setFormOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // 多选状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // 弹窗状态
  const [batchImportOpen, setBatchImportOpen] = useState(false)
  const [batchStatusOpen, setBatchStatusOpen] = useState(false)
  const [roleAssignOpen, setRoleAssignOpen] = useState(false)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [operatingUser, setOperatingUser] = useState<User | null>(null)
  
  // 删除确认弹窗状态
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  // 搜索和分页状态
  const [params, setParams] = useState<UserQueryParams>({
    page: 1,
    pageSize: 10,
    keyword: '',
    status: undefined,
    role: undefined,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.getList(params),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => {
      message.error('删除失败')
    },
  })

  // 表格多选配置
  const rowSelection = useMemo<TableProps<User>['rowSelection']>(
    () => ({
      selectedRowKeys,
      onChange: (keys) => setSelectedRowKeys(keys),
    }),
    [selectedRowKeys]
  )

  // 清空选择
  const clearSelection = useCallback(() => {
    setSelectedRowKeys([])
  }, [])

  // 处理创建
  const handleCreate = useCallback(() => {
    setCurrentUser(null)
    setFormOpen(true)
  }, [])

  // 处理编辑
  const handleEdit = useCallback((user: User) => {
    setCurrentUser(user)
    setFormOpen(true)
  }, [])

  // 处理表单提交
  const handleSubmit = async (values: UserFormData) => {
    if (currentUser) {
      await usersApi.update(currentUser.id, values)
    } else {
      await usersApi.create(values)
    }
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  // 打开删除确认弹窗
  const handleOpenDeleteModal = useCallback((user: User) => {
    setUserToDelete(user)
    setDeleteModalOpen(true)
  }, [])

  // 打开角色分配
  const handleOpenRoleAssign = useCallback((user: User) => {
    setOperatingUser(user)
    setRoleAssignOpen(true)
  }, [])

  // 打开权限查看
  const handleOpenPermissions = useCallback((user: User) => {
    setOperatingUser(user)
    setPermissionsOpen(true)
  }, [])

  // 打开重置密码
  const handleOpenResetPassword = useCallback((user: User) => {
    setOperatingUser(user)
    setResetPasswordOpen(true)
  }, [])

  // 打开修改密码
  const handleOpenChangePassword = useCallback((user: User) => {
    setOperatingUser(user)
    setChangePasswordOpen(true)
  }, [])

  // 搜索处理（防抖）
  const debouncedSearchRef = useRef(
    debounce((value: string) => {
      setParams((prev) => ({ ...prev, keyword: value, page: 1 }))
    }, 300)
  )

  const handleSearch = useCallback((value: string) => {
    debouncedSearchRef.current(value)
  }, [])

  // 状态筛选
  const handleFilterStatusChange = useCallback((value: string | undefined) => {
    setParams((prev) => ({ ...prev, status: value, page: 1 }))
  }, [])

  // 分页变化
  const handleTableChange = useCallback(
    (pagination: { current?: number; pageSize?: number }) => {
      setParams((prev) => ({
        ...prev,
        page: pagination.current,
        pageSize: pagination.pageSize,
      }))
    },
    []
  )

  // 重置搜索
  const handleReset = useCallback(() => {
    setParams({
      page: 1,
      pageSize: 10,
      keyword: '',
      status: undefined,
      role: undefined,
    })
  }, [])

  const columns = useMemo<ColumnsType<User>>(
    () => [
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
        width: 180,
      },
      {
        title: '角色',
        dataIndex: 'roles',
        key: 'roles',
        width: 150,
        render: (roles: string[]) => {
          if (!roles || roles.length === 0) {
            return <span style={{ color: '#999' }}>未分配</span>
          }
          return (
            <Space size={4} wrap>
              {roles.map((role) => (
                <Tag key={role} color="blue">
                  {role}
                </Tag>
              ))}
            </Space>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => {
          const config = USER_STATUS_CONFIG[status] || { color: 'default', text: status }
          return <Tag color={config.color}>{config.text}</Tag>
        },
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (date: string) =>
          date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
      },
      {
        title: '操作',
        key: 'action',
        width: 200,
        fixed: 'right',
        render: (_, record) => (
          <Space size={0}>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'roles',
                    icon: <UserOutlined />,
                    label: '分配角色',
                    onClick: () => handleOpenRoleAssign(record),
                  },
                  {
                    key: 'permissions',
                    icon: <SafetyOutlined />,
                    label: '查看权限',
                    onClick: () => handleOpenPermissions(record),
                  },
                  {
                    key: 'resetPwd',
                    icon: <KeyOutlined />,
                    label: '重置密码',
                    onClick: () => handleOpenResetPassword(record),
                  },
                  {
                    key: 'changePwd',
                    icon: <KeyOutlined />,
                    label: '修改密码',
                    onClick: () => handleOpenChangePassword(record),
                  },
                  { type: 'divider' },
                  {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    label: '删除用户',
                    danger: true,
                    onClick: () => handleOpenDeleteModal(record),
                  },
                ],
              }}
            >
              <Button type="link" size="small">
                更多 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        ),
      },
    ],
    [handleEdit, handleOpenRoleAssign, handleOpenPermissions, handleOpenResetPassword, handleOpenChangePassword, handleOpenDeleteModal]
  )

  const users = data?.items || []
  const pagination = data?.pagination

  return (
    <div>
      <Card>
        {/* 批量操作栏 */}
        {selectedRowKeys.length > 0 && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              <Space>
                <span>已选择 {selectedRowKeys.length} 个用户</span>
                <Button
                  size="small"
                  onClick={() => setBatchStatusOpen(true)}
                >
                  批量修改状态
                </Button>
                <Button size="small" onClick={clearSelection}>
                  取消选择
                </Button>
              </Space>
            }
          />
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Space size="middle" wrap>
              <Search
                placeholder="搜索用户名、姓名、邮箱"
                allowClear
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: 280 }}
                defaultValue={params.keyword}
              />
              <Select
                placeholder="状态筛选"
                allowClear
                style={{ width: 120 }}
                value={params.status}
                onChange={handleFilterStatusChange}
                options={[
                  { label: '正常', value: 'ACTIVE' },
                  { label: '禁用', value: 'INACTIVE' },
                  { label: '封禁', value: 'BANNED' },
                ]}
              />
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
              <Button
                icon={<FileTextOutlined />}
                onClick={() => navigate('/users/logs')}
              >
                系统日志
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<UploadOutlined />} onClick={() => setBatchImportOpen(true)}>
                批量导入
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新增用户
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={isLoading}
          rowSelection={rowSelection}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          pagination={{
            total: pagination?.total || 0,
            pageSize: params.pageSize,
            current: params.page,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>

      {/* 编辑用户表单 */}
      <UserForm
        open={formOpen}
        user={currentUser}
        onSubmit={handleSubmit}
        onCancel={() => {
          setFormOpen(false)
          setCurrentUser(null)
        }}
      />

      {/* 批量导入 */}
      <BatchImportModal
        open={batchImportOpen}
        onCancel={() => setBatchImportOpen(false)}
        onSuccess={() => {
          setBatchImportOpen(false)
          queryClient.invalidateQueries({ queryKey: ['users'] })
        }}
      />

      {/* 批量修改状态 */}
      <BatchStatusModal
        open={batchStatusOpen}
        userIds={selectedRowKeys as string[]}
        onCancel={() => setBatchStatusOpen(false)}
        onSuccess={() => {
          setBatchStatusOpen(false)
          clearSelection()
        }}
      />

      {/* 角色分配 */}
      <RoleAssignModal
        open={roleAssignOpen}
        userId={operatingUser?.id || ''}
        currentRoles={operatingUser?.roles || []}
        onCancel={() => {
          setRoleAssignOpen(false)
          setOperatingUser(null)
        }}
        onSuccess={() => {
          setRoleAssignOpen(false)
          setOperatingUser(null)
        }}
      />

      {/* 权限查看 */}
      <UserPermissionsDrawer
        open={permissionsOpen}
        userId={operatingUser?.id || ''}
        userName={operatingUser?.realName || operatingUser?.username || ''}
        onClose={() => {
          setPermissionsOpen(false)
          setOperatingUser(null)
        }}
      />

      {/* 重置密码 */}
      <ResetPasswordModal
        open={resetPasswordOpen}
        userId={operatingUser?.id || ''}
        userName={operatingUser?.realName || operatingUser?.username || ''}
        onCancel={() => {
          setResetPasswordOpen(false)
          setOperatingUser(null)
        }}
        onSuccess={() => {
          setResetPasswordOpen(false)
          setOperatingUser(null)
        }}
      />

      {/* 修改密码 */}
      <ChangePasswordModal
        open={changePasswordOpen}
        userId={operatingUser?.id || ''}
        userName={operatingUser?.realName || operatingUser?.username || ''}
        onCancel={() => {
          setChangePasswordOpen(false)
          setOperatingUser(null)
        }}
        onSuccess={() => {
          setChangePasswordOpen(false)
          setOperatingUser(null)
        }}
      />

      {/* 删除确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onOk={() => {
          if (userToDelete) {
            deleteMutation.mutate(userToDelete.id)
            setDeleteModalOpen(false)
          }
        }}
        okText="确定"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
      >
        <p>确定要删除用户 <strong>{userToDelete?.username}</strong> 吗？此操作不可恢复。</p>
      </Modal>
    </div>
  )
}

export default UserList
