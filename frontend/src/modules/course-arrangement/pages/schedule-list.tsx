/**
 * 排课列表页面
 * 用于展示所有排课记录，支持按学期、课程、教室筛选 
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Form, Select, Button, Space, Popconfirm } from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { schedulesApi } from '../api/schedules';
import type { GetSchedulesInput, Schedule } from '../types/schedule';
import { ScheduleEdit } from './schedule-edit';

const { Option } = Select;

const DAY_OF_WEEK_MAP: Record<number, string> = {
  1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日'
};

export const ScheduleList: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Schedule[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchSchedules = useCallback( async (values: GetSchedulesInput) => {
    setLoading(true);
    try {
      const res = await schedulesApi.getList({
        ...values,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      setData(res.items);
      setTotal(res.total);
    } catch {
      // message.error('获取排课列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchSchedules(form.getFieldsValue());
  }, [form, fetchSchedules]);

  const handleSearch = (values: GetSchedulesInput) => {
    setPagination({ ...pagination, page: 1 });
    fetchSchedules(values);
  };

  const handleReset = () => {
    form.resetFields();
    const values = form.getFieldsValue();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchSchedules(values);
  };

  const handleDelete = async (id: string) => {
    try {
      await schedulesApi.delete({id});
      // message.success('删除成功');
      fetchSchedules(form.getFieldsValue());
    } catch {
      // message.error('删除失败');
    }
  };

  const openDrawer = (id?: string) => {
    setEditingId(id || null);
    setDrawerVisible(true);
  };

  const columns: TableColumnsType<Schedule> = [
    {
      title: '课程开设',
      key: 'courseOffering',
      render: (_, record) => {
        const courseName = record.courseName;
        const courseCode = record.schedule.courseOfferingId;
        return courseCode ? `${courseName} (${courseCode})` : courseName;
      }
    },
    { 
      title: '上课教室', 
      key: 'classroom',
      render: (_, record) => 
        `${record.classroom.classroom.building}-${record.classroom.classroom.roomNumber}`
    },
    { 
      title: '星期', 
      key: 'dayOfWeek',
      render: (_, record) => DAY_OF_WEEK_MAP[record.schedule.dayOfWeek] || '未知'
    },
    { 
      title: '周次', 
      key: 'weeks',
      render: (_, record) => `第 ${record.schedule.startWeek} - ${record.schedule.endWeek} 周`
    },
    { 
      title: '节次', 
      key: 'periods',
      render: (_, record) => `第 ${record.schedule.startPeriod} - ${record.schedule.endPeriod} 节`
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openDrawer(record.id)}>编辑</Button>
          <Popconfirm title="确定要删除这条排课记录吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="dayOfWeek" label="星期">
            <Select placeholder="全部" allowClear style={{ width: 120 }}>
              {Object.entries(DAY_OF_WEEK_MAP).map(([key, val]) => (
                <Option key={key} value={Number(key)}>{val}</Option>
              ))}
            </Select>
          </Form.Item>
          {/* 这里可以继续接入从课程开设接口(A/C组)拉取的下拉列表进行筛选 */}
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
            手动排课
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

      <ScheduleEdit 
        visible={drawerVisible} 
        id={editingId} 
        onClose={() => setDrawerVisible(false)}
        onSuccess={() => {
          setDrawerVisible(false);
          fetchSchedules(form.getFieldsValue());
        }}
      />
    </div>
  );
};

export default ScheduleList;
