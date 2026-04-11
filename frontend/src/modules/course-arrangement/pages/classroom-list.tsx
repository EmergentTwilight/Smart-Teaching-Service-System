/**
 * 教室列表页面
 * 提供资源的筛选、展示和新建/编辑入口 [cite: 102]
 */
import React, { useEffect, useState } from 'react';
import { Card, Table, Form, Input, Select, Button, Space, Tag, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { classroomsApi } from '../api/classrooms';
import type { Classroom, ClassroomQueryParams } from '../types/classroom';
import { ClassroomEdit } from './classroom-edit';

const { Option } = Select;

// 状态标签映射字典
const STATUS_MAP: Record<string, { color: string; text: string }> = {
  available: { color: 'success', text: '可用' },
  maintenance: { color: 'warning', text: '维护中' },
  unavailable: { color: 'error', text: '不可用' },
};

// 教室类型映射字典
const ROOM_TYPE_MAP: Record<string, string> = {
  lecture: '普通教室',
  lab: '实验室',
  computer: '机房',
  multimedia: '多媒体教室',
};

export const ClassroomList: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Classroom[]>([]);
  const [total, setTotal] = useState(0);
  
  // 分页状态 [cite: 120-124]
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  
  // 抽屉状态
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchClassrooms = async (values: ClassroomQueryParams = {}) => {
    setLoading(true);
    try {
      const res = await classroomsApi.getList({
        ...values,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      setData(res.items);
      setTotal(res.pagination.total);
    } catch {
      message.error('获取教室列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const values = form.getFieldsValue();
    fetchClassrooms(values);
  }, [pagination.page, pagination.pageSize]);

  const handleSearch = (values: any) => {
    setPagination({ ...pagination, page: 1 }); // 重置到第一页
    fetchClassrooms(values);
  };

  const openDrawer = (id?: string) => {
    setEditingId(id || null);
    setDrawerVisible(true);
  };

  const columns = [
    { title: '教室号', dataIndex: 'roomNumber', key: 'roomNumber' },
    { title: '教学楼', dataIndex: 'building', key: 'building' },
    { title: '校区', dataIndex: 'campus', key: 'campus' },
    { 
      title: '类型', 
      dataIndex: 'roomType', 
      key: 'roomType',
      render: (type: string) => ROOM_TYPE_MAP[type] || type
    },
    { title: '容量 (人)', dataIndex: 'capacity', key: 'capacity' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_MAP[status]?.color || 'default'}>
          {STATUS_MAP[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Classroom) => (
        <Button type="link" onClick={() => openDrawer(record.id)}>编辑</Button>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="keyword" label="关键字">
            <Input placeholder="教室号或教学楼" allowClear />
          </Form.Item>
          <Form.Item name="campus" label="校区">
            <Select placeholder="请选择" allowClear style={{ width: 120 }}>
              <Option value="主校区">主校区</Option>
              <Option value="东校区">东校区</Option>
            </Select>
          </Form.Item>
          <Form.Item name="roomType" label="类型">
            <Select placeholder="请选择" allowClear style={{ width: 150 }}>
              {Object.entries(ROOM_TYPE_MAP).map(([key, val]) => (
                <Option key={key} value={key}>{val}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button>
              <Button onClick={() => form.resetFields()}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false}>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            新增教室
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: total,
            onChange: (page, pageSize) => setPagination({ page, pageSize }),
          }}
        />
      </Card>

      {/* 教室编辑/新增抽屉 */}
      <ClassroomEdit 
        visible={drawerVisible} 
        id={editingId} 
        onClose={() => setDrawerVisible(false)}
        onSuccess={() => {
          setDrawerVisible(false);
          fetchClassrooms(form.getFieldsValue());
        }}
      />
    </div>
  );
};

export default ClassroomList;