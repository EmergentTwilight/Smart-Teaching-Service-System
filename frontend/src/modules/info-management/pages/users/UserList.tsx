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
  Alert,
  Modal,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TableProps } from 'antd/es/table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type UserQueryParams } from '@/modules/info-management/api/users'
import type { UserDetail, UserFormData } from '@/shared/types'
import { USER_STATUS_CONFIG, USER_ROLE_LABELS } from '@/shared/constants/user'
import { useAuthStore } from '@/shared/stores/authStore'
import dayjs from 'dayjs'
import UserForm from './UserForm'
import BatchImportModal from './BatchImportModal'
import BatchStatusModal from './BatchStatusModal'
import BatchDeleteModal from './BatchDeleteModal'
import RoleAssignModal from './RoleAssignModal'
import UserPermissionsDrawer from './UserPermissionsDrawer'
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
  const queryClient = useQueryClient()
  const loggedInUser = useAuthStore((state) => state.user)

  // 表单状态
  const [formOpen, setFormOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserDetail | null>(null)

  // 多选状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // 弹窗状态
  const [batchImportOpen, setBatchImportOpen] = useState(false)
  const [batchStatusOpen, setBatchStatusOpen] = useState(false)
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)
  const [roleAssignOpen, setRoleAssignOpen] = useState(false)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [operatingUser, setOperatingUser] = useState<UserDetail | null>(null)
  
  // 删除确认弹窗状态
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserDetail | null>(null)

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

  // 获取角色列表
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.getRoles(),
  })

  // 角色列表（从 API 获取）
  const availableRoles = rolesData || []

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
  const rowSelection = useMemo<TableProps<UserDetail>['rowSelection']>(
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
  const handleEdit = useCallback((user: UserDetail) => {
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
  const handleOpenDeleteModal = useCallback((user: UserDetail) => {
    setUserToDelete(user)
    setDeleteModalOpen(true)
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

  // 角色筛选
  const handleFilterRoleChange = useCallback((value: string | undefined) => {
    setParams((prev) => ({ ...prev, role: value, page: 1 }))
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

  // 检查是否有管理员权限（用于显示操作列）
  const isAdmin = useMemo(() => {
    const roles = loggedInUser?.roles || []
    return roles.includes('admin') || roles.includes('super_admin')
  }, [loggedInUser?.roles])

  // 检查是否是超级管理员
  const isSuperAdmin = useMemo(() => {
    const roles = loggedInUser?.roles || []
    return roles.includes('super_admin')
  }, [loggedInUser?.roles])

  const columns = useMemo<ColumnsType<UserDetail>>(
    () => {
      const baseColumns: ColumnsType<UserDetail> = [
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
          title: '手机号',
          dataIndex: 'phone',
          key: 'phone',
          width: 130,
          render: (phone: string) => phone || '-',
        },
        {
          title: '性别',
          dataIndex: 'gender',
          key: 'gender',
          width: 80,
          render: (gender: string) => {
            if (!gender) return '-'
            const genderMap: Record<string, string> = {
              MALE: '男',
              FEMALE: '女',
              OTHER: '其他',
            }
            return genderMap[gender] || gender
          },
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
                    {USER_ROLE_LABELS[role] || role}
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
          width: 90,
          render: (status: string) => {
            const config = USER_STATUS_CONFIG[status] || { color: 'default', text: status }
            return <Tag color={config.color}>{config.text}</Tag>
          },
        },
        {
          title: '最后登录',
          dataIndex: 'lastLoginAt',
          key: 'lastLoginAt',
          width: 150,
          render: (date: string) =>
            date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '从未登录',
        },
        {
          title: '创建时间',
          dataIndex: 'createdAt',
          key: 'createdAt',
          width: 150,
          render: (date: string) =>
            date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
        },
      ]

      // 只有管理员才显示操作列
      if (isAdmin) {
        baseColumns.push({
          title: '操作',
          key: 'action',
          width: 120,
          fixed: 'right',
          render: (_, record) => (
            <Space size={16}>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              {isSuperAdmin && (
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleOpenDeleteModal(record)}
                >
                  删除
                </Button>
              )}
            </Space>
          ),
        })
      }

      return baseColumns
    },
    [isAdmin, isSuperAdmin, handleEdit, handleOpenDeleteModal]
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
                  批量修改
                </Button>
                {isSuperAdmin && (
                  <Button
                    size="small"
                    danger
                    onClick={() => setBatchDeleteOpen(true)}
                  >
                    批量删除
                  </Button>
                )}
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
                style={{ width: 120, height: 40 }}
                value={params.status}
                onChange={handleFilterStatusChange}
                options={[
                  { label: '正常', value: 'ACTIVE' },
                  { label: '禁用', value: 'INACTIVE' },
                  { label: '封禁', value: 'BANNED' },
                ]}
              />
              <Select
                placeholder="角色筛选"
                allowClear
                style={{ width: 120, height: 40 }}
                value={params.role}
                onChange={handleFilterRoleChange}
                options={
                  isSuperAdmin
                    ? [
                        { label: '学生', value: 'student' },
                        { label: '教师', value: 'teacher' },
                        { label: '管理员', value: 'admin' },
                        { label: '超级管理员', value: 'super_admin' },
                      ]
                    : [
                        { label: '学生', value: 'student' },
                        { label: '教师', value: 'teacher' },
                        { label: '管理员', value: 'admin' },
                      ]
                }
              />
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              {isSuperAdmin && (
                <Button icon={<UploadOutlined />} onClick={() => setBatchImportOpen(true)}>
                  批量导入
                </Button>
              )}
              {isSuperAdmin && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  新增用户
                </Button>
              )}
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
        roles={availableRoles}
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

      {/* 批量修改 */}
      <BatchStatusModal
        open={batchStatusOpen}
        userIds={selectedRowKeys as string[]}
        onCancel={() => setBatchStatusOpen(false)}
        onSuccess={() => {
          setBatchStatusOpen(false)
          clearSelection()
        }}
      />

      {/* 批量删除 */}
      <BatchDeleteModal
        open={batchDeleteOpen}
        userIds={selectedRowKeys as string[]}
        onCancel={() => setBatchDeleteOpen(false)}
        onSuccess={() => {
          setBatchDeleteOpen(false)
          clearSelection()
        }}
      />

      {/* 角色分配 */}
      <RoleAssignModal
        open={roleAssignOpen}
        userId={operatingUser?.id || ''}
        currentRoles={(operatingUser?.roles || []) as string[]}
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
