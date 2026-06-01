import { useState } from 'react';
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Select, Space, Table, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useSelectionPeriods, useUpsertSelectionPeriod } from '../hooks/useSelectionPeriod';
import { SelectionPeriodStatusTag } from '../components/SelectionPeriodStatusTag';
import type { SelectionPeriodItem, SelectionPhase } from '../types/period';

const { Text } = Typography;

const PHASE_OPTIONS = [
  { label: '初选', value: 'first_round' },
  { label: '补退选', value: 'second_round' },
  { label: '调整期', value: 'adjustment' },
];

interface PeriodFormValues {
  semesterId: string;
  phase: SelectionPhase;
  startTime: Dayjs;
  endTime: Dayjs;
  maxCredits?: number;
  isActive?: boolean;
}

type SubmitFeedback =
  | {
      type: 'success' | 'error';
      message: string;
    }
  | null;

/**
 * TODO(C5, FR-C-30, FR-C-31, FR-C-32, NFR-C-14, NFR-C-01):
 * - 教务页面仅做配置入口，生效与时序校验由后端服务完成；
 * - 页面仅显示结果与状态，不在前端重复判定角色以外规则；
 * - 变更后应回写查询缓存供学生端看到最新可选状态。
 * - 待完成 SelectionPeriod 后端实现后做创建/更新/列表联调整体验证。
 */
const AdminSelectionPeriodPage: React.FC = () => {
  const periodsQuery = useSelectionPeriods();
  const { create, update } = useUpsertSelectionPeriod();
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [submitFeedback, setSubmitFeedback] = useState<SubmitFeedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm<PeriodFormValues>();

  const items = periodsQuery.data?.items || [];
  const tableData = items.map((item) => ({
    key: item.id,
    ...item,
  }));

  const columns = [
    {
      title: '学期',
      dataIndex: ['semester', 'name'],
      key: 'semester',
      render: (_: string, record: SelectionPeriodItem) => record.semester.name || record.semester.id,
    },
    {
      title: '阶段',
      dataIndex: 'phase',
      key: 'phase',
      render: (phase: SelectionPeriodItem['phase']) => {
        const text = PHASE_OPTIONS.find((option) => option.value === phase)?.label || phase;
        return <Text>{text}</Text>;
      },
    },
    { title: '开始', dataIndex: 'startTime', key: 'startTime' },
    { title: '结束', dataIndex: 'endTime', key: 'endTime' },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (_: boolean, record: SelectionPeriodItem) => (
        <SelectionPeriodStatusTag
          isActive={record.isActive}
          startTime={record.startTime}
          endTime={record.endTime}
          serverStatus={record.serverStatus}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: SelectionPeriodItem) => (
        <Button size="small" onClick={() => loadPeriodForEdit(record)}>
          编辑
        </Button>
      ),
    },
  ];

  const loadPeriodForEdit = (record: SelectionPeriodItem) => {
    setEditingPeriodId(record.id);
    form.setFieldsValue({
      semesterId: record.semester.id,
      phase: record.phase,
      startTime: dayjs(record.startTime),
      endTime: dayjs(record.endTime),
      maxCredits: record.maxCredits,
      isActive: record.isActive,
    });
  };

  const resetForm = () => {
    setEditingPeriodId(null);
    setSubmitFeedback(null);
    form.resetFields();
  };

  const handleSubmitError = (fallbackMessage: string) => {
    setSubmitFeedback({
      type: 'error',
      message: fallbackMessage,
    });
  };

  const handleSubmit = async (values: PeriodFormValues) => {
    setSubmitFeedback(null);

    const payload = {
      phase: values.phase,
      startTime: values.startTime.toISOString(),
      endTime: values.endTime.toISOString(),
      maxCredits: values.maxCredits,
      isActive: Boolean(values.isActive),
    };

    setIsSubmitting(true);

    try {
      if (editingPeriodId) {
        await update.mutateAsync({ periodId: editingPeriodId, payload });
      } else {
        await create.mutateAsync({
          ...payload,
          semesterId: values.semesterId,
        });
      }

      setSubmitFeedback({
        type: 'success',
        message: editingPeriodId ? '阶段配置已更新' : '阶段配置已创建',
      });

      form.resetFields();
      setEditingPeriodId(null);
    } catch {
      handleSubmitError(editingPeriodId ? '更新阶段配置失败，请重试' : '创建阶段配置失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 24 }}>
          选课阶段管理
        </Text>
        <Text type="secondary">教务仅配置阶段与并发控制范围，选课核心校验仍由服务端事务执行。</Text>
      </div>

      <Card title={editingPeriodId ? '更新阶段配置' : '新建阶段配置'} style={{ marginBottom: 16 }}>
        {submitFeedback ? (
          <Alert
            message={submitFeedback.message}
            type={submitFeedback.type}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Form form={form} layout="vertical" initialValues={{ isActive: true }} onFinish={handleSubmit}>
          <Form.Item
            name="semesterId"
            label="学期ID"
            rules={[{ required: true, message: '请填写学期ID' }]}
          >
            <Input placeholder="在课程安排中获取的学期 UUID" />
          </Form.Item>
          <Form.Item
            name="phase"
            label="阶段类型"
            rules={[{ required: true, message: '请选择阶段' }]}
          >
            <Select options={PHASE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="startTime"
            label="开始时间"
            rules={[{ required: true, message: '请选择开始时间' }]}
          >
            <DatePicker showTime />
          </Form.Item>
          <Form.Item
            name="endTime"
            label="结束时间"
            rules={[{ required: true, message: '请选择结束时间' }]}
          >
            <DatePicker showTime />
          </Form.Item>
          <Form.Item name="maxCredits" label="该阶段最大学分">
            <InputNumber min={0} precision={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="isActive"
            label="是否启用"
            rules={[{ required: true, message: '请选择是否启用' }]}
          >
            <Select
              options={[
                { value: true, label: '启用' },
                { value: false, label: '停用' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isSubmitting}>
                {editingPeriodId ? '更新阶段' : '创建阶段'}
              </Button>
              <Button onClick={resetForm} disabled={isSubmitting}>重置表单</Button>
            </Space>
          </Form.Item>
        </Form>
        <Text type="secondary">
          当前页面仅负责表单提交与状态展示；阶段时序、重叠和权限语义仍以后端校验为准。
        </Text>
      </Card>

      <Card title="阶段列表">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={tableData}
          loading={periodsQuery.isLoading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default AdminSelectionPeriodPage;
