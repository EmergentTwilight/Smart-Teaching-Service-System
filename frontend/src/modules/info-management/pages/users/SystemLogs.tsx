/**
 * 系统日志页面
 * 显示用户操作日志，支持筛选（用户、操作类型、时间范围)
 */
import React, { useState, useCallback } from 'react'
import {
  Table,
  Card,
  Space,
  Button,
  Select,
  DatePicker,
  Tag,
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/modules/info-management/api/users'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

const SystemLogs: React.FC = () => {
  const [params, setParams] = useState({
    page: 1,
    pageSize: 20,
    userId: undefined as string | undefined,
    action: undefined as string | undefined,
    resourceType: undefined as string | undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['systemLogs', params],
    queryFn: () => usersApi.getLogs(params),
  })

  // 处理日期范围变化
  const handleDateRangeChange = useCallback(
    (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
      if (dates && dates[0] && dates[1]) {
        setParams((prev) => ({
          ...prev,
          startDate: dates[0]!.format('YYYY-MM-DD'),
          endDate: dates[1]!.format('YYYY-MM-DD'),
          page: 1,
        }))
      } else {
        setParams((prev) => ({
          ...prev,
          startDate: undefined,
          endDate: undefined,
          page: 1,
        }))
      }
    },
    []
  )

  // 处理操作类型变化
  const handleActionChange = useCallback((value: string | undefined) => {
    setParams((prev) => ({ ...prev, action: value, page: 1 }))
  }, [])

  // 处理资源类型变化
  const handleResourceTypeChange = useCallback((value: string | undefined) => {
    setParams((prev) => ({ ...prev, resourceType: value, page: 1 }))
  }, [])

  // 重置筛选
  const handleReset = useCallback(() => {
    setParams({
      page: 1,
      pageSize: 20,
      userId: undefined,
      action: undefined,
      resourceType: undefined,
      startDate: undefined,
      endDate: undefined,
    })
  }, [])

  // 表格列定义
  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => {
        const colorMap: Record<string, string> = {
          CREATE: 'green',
          UPDATE: 'blue',
          DELETE: 'red',
          LOGIN: 'cyan',
          LOGOUT: 'orange',
          VIEW: 'default',
        }
        return <Tag color={colorMap[action] || 'default'}>{action}</Tag>
      },
    },
    {
      title: '资源类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 120,
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
    },
    {
      title: 'IP 地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
    },
  ]

  const logs = data?.items || []
  const total = data?.pagination?.total || 0

  return (
    <div>
      <Card title="系统日志">
        <Space size="middle" style={{ marginBottom: 16 }}>
          <Select
            placeholder="操作类型"
            allowClear
            style={{ width: 120 }}
            value={params.action}
            onChange={handleActionChange}
            options={[
              { label: '创建', value: 'create' },
              { label: '更新', value: 'update' },
              { label: '删除', value: 'delete' },
              { label: '登录', value: 'login' },
              { label: '登出', value: 'logout' },
              { label: '查看', value: 'view' },
            ]}
          />
          <Select
            placeholder="资源类型"
            allowClear
            style={{ width: 120 }}
            value={params.resourceType}
            onChange={handleResourceTypeChange}
            options={[
              { label: '用户', value: 'user' },
              { label: '课程', value: 'course' },
              { label: '角色', value: 'role' },
              { label: '权限', value: 'permission' },
            ]}
          />
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            onChange={handleDateRangeChange}
            value={
              params.startDate && params.endDate
                ? [dayjs(params.startDate), dayjs(params.endDate)]
                : null
            }
          />
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button onClick={() => refetch()}>刷新</Button>
        </Space>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={isLoading}
          pagination={{
            total,
            pageSize: params.pageSize,
            current: params.page,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['20', '50', '100'],
            onChange: (page, pageSize) =>
              setParams((prev) => ({ ...prev, page, pageSize })),
          }}
        />
      </Card>
    </div>
  )
}

export default SystemLogs
