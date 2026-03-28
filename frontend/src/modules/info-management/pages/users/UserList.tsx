/**
 * 用户列表页面
 * 显示用户列表，支持新增、编辑、删除、搜索、分页操作
 */
import React, { useState, useCallback } from 'react'
import { Table, Button, Space, Tag, Popconfirm, message, Input, Select, Card, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type UserQueryParams } from '@/modules/info-management/api/users'
import type { User, UserFormData } from '@/shared/types'
import dayjs from 'dayjs'
import UserForm from './UserForm'

const { Search } = Input

const UserList: React.FC = () => {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  
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

  const handleCreate = () => {
    setCurrentUser(null)
    setFormOpen(true)
  }

  const handleEdit = (user: User) => {
    setCurrentUser(user)
    setFormOpen(true)
  }

  const handleSubmit = async (values: UserFormData) => {
    if (currentUser) {
      await usersApi.update(currentUser.id, values)
    } else {
      await usersApi.create(values)
    }
    // UserForm 会处理成功消息和关闭对话框
    // 只需要刷新列表
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  // 搜索处理
  const handleSearch = useCallback((value: string) => {
    setParams(prev => ({ ...prev, keyword: value, page: 1 }))
  }, [])

  // 状态筛选
  const handleStatusChange = useCallback((value: string | undefined) => {
    setParams(prev => ({ ...prev, status: value, page: 1 }))
  }, [])

  // 分页变化
  const handleTableChange = useCallback((pagination: { current?: number; pageSize?: number }) => {
    setParams(prev => ({
      ...prev,
      page: pagination.current,
      pageSize: pagination.pageSize,
    }))
  }, [])

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

  const columns: ColumnsType<User> = [
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
      width: 120,
      render: (roles: string[]) => (
        <Space>
          {roles?.map((role) => (
            <Tag key={role} color="blue">
              {role}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? '正常' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此用户吗？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const users = data?.items || []
  const pagination = data?.pagination

  return (
    <div>
      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Space size="middle" wrap>
              <Search
                placeholder="搜索用户名、姓名、邮箱"
                allowClear
                onSearch={handleSearch}
                style={{ width: 280 }}
                defaultValue={params.keyword}
              />
              <Select
                placeholder="状态筛选"
                allowClear
                style={{ width: 120 }}
                value={params.status}
                onChange={handleStatusChange}
                options={[
                  { label: '正常', value: 'ACTIVE' },
                  { label: '禁用', value: 'INACTIVE' },
                  { label: '封禁', value: 'BANNED' },
                ]}
              />
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新增用户
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={isLoading}
          onChange={handleTableChange}
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

      <UserForm
        open={formOpen}
        user={currentUser}
        onSubmit={handleSubmit}
        onCancel={() => {
          setFormOpen(false)
          setCurrentUser(null)
        }}
      />
    </div>
  )
}

export default UserList
