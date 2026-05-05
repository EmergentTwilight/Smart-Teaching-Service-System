/**
 * 教室列表页面
 * 提供资源的筛选、展示和新建/编辑入口
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Form, Input, Select, Button, Space, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { classroomsApi } from '../api/classrooms';
import type { ClassroomWithId, PagedClassroomListResponse, ClassroomQueryInput } from '../types/classroom';
import { ClassroomEdit } from './classroom-edit';

const { Option } = Select;

// 状态标签映射字典
const STATUS_MAP: Record<string, { color: string; text: string }> = {
  AVAILABLE: { color: 'success', text: '可用' },
  MAINTENANCE: { color: 'warning', text: '维护中' },
  UNAVAILABLE: { color: 'error', text: '不可用' },
};

// 教室类型映射字典
const ROOM_TYPE_MAP: Record<string, string> = {
  LECTURE: '普通教室',
  LAB: '实验室',
  COMPUTER: '机房',
  MULTIMEDIA: '多媒体教室',
};

export const ClassroomList: React.FC = () => {
  const [form] = Form.useForm<ClassroomQueryInput>();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PagedClassroomListResponse>();
  const [total, setTotal] = useState(0);
  
  // 分页状态 
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  
  // 抽屉状态
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchClassrooms = useCallback( async (values: ClassroomQueryInput) => {
    setLoading(true);
    try {
      const res = await classroomsApi.getList({
        ...values,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      setData(res);
      setTotal(res.total);
    } catch {
      // message.error('获取教室列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    const values = form.getFieldsValue();
    fetchClassrooms(values);
  }, [form, fetchClassrooms]);

  const handleSearch = (values: ClassroomQueryInput) => {
    setPagination({ ...pagination, page: 1 }); // 重置到第一页
    fetchClassrooms(values);
  };

  const handleReset = () => {
    form.resetFields();
    const values = form.getFieldsValue();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchClassrooms(values);
  };

  const openDrawer = (id?: string) => {
    setEditingId(id || null);
    setDrawerVisible(true);
  };

  const campusOptions = Array.from(
    new Set((data?.items || []).map((item) => item.classroom.campus).filter(Boolean))
  );

  const columns: TableColumnsType<ClassroomWithId> = [
    { 
      title: '教室号', 
      key: 'roomNumber',
      render: (_, record) => record.classroom.roomNumber
    },
    { 
      title: '教学楼', 
      key: 'building',
      render: (_, record) => record.classroom.building
    },
    { 
      title: '校区', 
      key: 'campus',
      render: (_, record) => record.classroom.campus
    },
    { 
      title: '类型', 
      key: 'roomType',
      render: (_, record) => {
        const type = record.classroom.roomType;
        return ROOM_TYPE_MAP[type] || type;
      }
    },
    { 
      title: '容量 (人)', 
      key: 'capacity',
      render: (_, record) => record.classroom.capacity 
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        const status = record.classroom?.status;
        return (
          <Tag color={STATUS_MAP[status]?.color || 'default'}>
            {STATUS_MAP[status]?.text || status || '-'}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => openDrawer(record.id)}>编辑</Button>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="keyword" label="关键字">
            <Input placeholder="教室号或教学楼" allowClear />
          </Form.Item>
          <Form.Item name="campus" label="校区">
            <Select placeholder="请选择" allowClear style={{ width: 120 }}>
              {campusOptions.map((campus) => (
                <Option key={campus} value={campus}>{campus}</Option>
              ))}
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
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            新增教室
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={data?.items}
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
