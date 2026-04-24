// ConstraintRuleTable.tsx
/**
 * 约束规则表格组件
 * 展示所有约束规则，支持分页、搜索、新增、编辑、删除
 */
import React, { useEffect, useState } from 'react';
import { Card, Table, Form, Input, Select, Button, Space, Tag, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { rulesApi } from '../api/constraint';
import type { SchedulingRule, RuleQueryParams } from '../types/constraint';
import { ConstraintRuleEditDrawer } from './constraint-rule-edit-drawer';

const { Text } = Typography;
const { Option } = Select;

const TARGET_TYPE_MAP: Record<string, string> = {
  teacher: '教师',
  course: '课程',
};

const DAY_MAP: Record<number, string> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
};

interface ConstraintRuleTableProps {
  onRuleCountChange?: (count: number) => void;
}

export const ConstraintRuleTable: React.FC<ConstraintRuleTableProps> = ({
  onRuleCountChange,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SchedulingRule[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 抽屉状态
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchRules = async (values: RuleQueryParams = {}) => {
    setLoading(true);
    try {
      const res = await rulesApi.getList({
        ...values,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      setData(res.items);
      setTotal(res.pagination.total);
      onRuleCountChange?.(res.pagination.total);
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  // 监听筛选条件变化，自动搜索
  const autoSearch = () => {
    const values = form.getFieldsValue();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchRules(values);
  };

  useEffect(() => {
    const values = form.getFieldsValue();
    fetchRules(values);
  }, [pagination.page, pagination.pageSize]);

  const handleDelete = async (id: string) => {
    try {
      await rulesApi.delete(id);
      autoSearch();
    } catch {
      
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      return;
    }
    try {
      await rulesApi.batchDelete(selectedRowKeys as string[]);
      setSelectedRowKeys([]);
      autoSearch();
    } catch {
      
    }
  };

  const openDrawer = (id?: string) => {
    setEditingId(id || null);
    setDrawerVisible(true);
  };

  const columns = [
    {
      title: '目标类型',
      dataIndex: 'targetType',
      key: 'targetType',
      width: 80,
      render: (val: string) => TARGET_TYPE_MAP[val] || val,
    },
    {
      title: '目标 ID',
      dataIndex: 'targetId',
      key: 'targetId',
      width: 140,
      render: (val: string, record: SchedulingRule) =>
        record.targetName ? `${record.targetName} (${val})` : val,
    },
    {
  title: '时间约束',
  key: 'rules',
  render: (_: any, record: SchedulingRule) => {
    const { hardConstraints, softConstraints } = record.rules || {};
    const hardSlots = hardConstraints?.unavailableTimeSlots || [];
    const softSlots = softConstraints?.preferredTimeSlots || [];

    // 格式化单个时间槽为 Tag
    const formatSlotTag = (slot: { dayOfWeek: number; startPeriod: number; endPeriod: number }, color: string) => (
    <Tag color={color}>
      {color === 'red' ? '× ' : ''}{DAY_MAP[slot.dayOfWeek]} 第{slot.startPeriod}-{slot.endPeriod}节
    </Tag>
  );

    return (
      <div style={{ maxWidth: 350 }}>
        {hardSlots.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            {hardSlots.map((slot, idx) => (
              <span key={idx}>{formatSlotTag(slot, 'red')}</span>
            ))}
          </div>
        )}
        {softSlots.length > 0 && (
          <div>
            {softSlots.map((slot, idx) => (
              <span key={idx}>{formatSlotTag(slot, 'blue')}</span>
            ))}
          </div>
        )}
        {hardSlots.length === 0 && softSlots.length === 0 && (
          <Text type="secondary">未配置</Text>
        )}
      </div>
    );
  },
},
    {
      title: '教室/教学楼',
      key: 'roomAndBuilding',
      render: (_: any, record: SchedulingRule) => {
        const hardRoom = record.rules?.hardConstraints?.requiredRoomType;
        const softBuilding = record.rules?.softConstraints?.preferredBuilding;
        return (
          <Space>
            {hardRoom && <Tag color="red">{hardRoom}</Tag>}
            {softBuilding && <Tag color="blue">{softBuilding}</Tag>}
            {!hardRoom && !softBuilding && <Text type="secondary">-</Text>}
          </Space>
        );
      },
    },
    {
      title: '连续排课',
      key: 'continuousPeriods',
      render: (_: any, record: SchedulingRule) =>
        record.rules?.softConstraints?.continuousPeriods === true
          ? <Tag color="green">是</Tag>
          : record.rules?.softConstraints?.continuousPeriods === false
            ? <Tag color="default">否</Tag>
            : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: SchedulingRule) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openDrawer(record.id)}>
            编辑
          </Button>
          <Popconfirm title="确定删除此规则？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 合并：筛选 + 操作按钮 + 统计信息 在同一行 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Form form={form} onValuesChange={autoSearch} style={{ flex: 1 }}>
  <Space wrap>
    <Form.Item name="keyword" label="关键字" noStyle>
      <Input placeholder="目标ID或名称" allowClear style={{ width: 180 }} />
    </Form.Item>
    <Form.Item name="targetType" label="目标类型" noStyle>
      <Select placeholder="全部" allowClear style={{ width: 120 }}>
        <Option value="">不限</Option>
        <Option value="teacher">教师</Option>
        <Option value="course">课程</Option>
      </Select>
    </Form.Item>
    <Form.Item name="ruleType" label="约束强度" noStyle>
      <Select placeholder="全部" allowClear style={{ width: 120 }}>
        <Option value="">不限</Option>
        <Option value="hard">硬约束</Option>
        <Option value="soft">软约束</Option>
      </Select>
    </Form.Item>
  </Space>
</Form>

          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
              新增规则
            </Button>
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={`确定删除选中的 ${selectedRowKeys.length} 条规则？`}
                onConfirm={handleBatchDelete}
              >
                <Button danger icon={<DeleteOutlined />}>
                  批量删除 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => setPagination({ page, pageSize }),
          }}
          scroll={{ x: 900 }}
        />
      </Card>

      <ConstraintRuleEditDrawer
        visible={drawerVisible}
        ruleId={editingId}
        onClose={() => setDrawerVisible(false)}
        onSuccess={() => {
          setDrawerVisible(false);
          autoSearch();
        }}
      />
    </div>
  );
};
