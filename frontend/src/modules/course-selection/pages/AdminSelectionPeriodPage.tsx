import { useState } from 'react';
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { extractErrorMessage } from '@/shared/utils/error';
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
  allowDrop?: boolean;
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
 */
const AdminSelectionPeriodPage: React.FC = () => {
  const periodsQuery = useSelectionPeriods();
  const { create, update } = useUpsertSelectionPeriod();
  const [editingPeriod, setEditingPeriod] = useState<SelectionPeriodItem | null>(null);
  const [createFeedback, setCreateFeedback] = useState<SubmitFeedback>(null);
  const [editFeedback, setEditFeedback] = useState<SubmitFeedback>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [createForm] = Form.useForm<PeriodFormValues>();
  const [editForm] = Form.useForm<PeriodFormValues>();

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
      title: '允许退课',
      dataIndex: 'allowDrop',
      key: 'allowDrop',
      render: (allowDrop: boolean) => <Text>{allowDrop ? '允许' : '不允许'}</Text>,
    },
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
    setEditingPeriod(record);
    setEditFeedback(null);
    editForm.setFieldsValue({
      semesterId: record.semester.id,
      phase: record.phase,
      startTime: dayjs(record.startTime),
      endTime: dayjs(record.endTime),
      maxCredits: record.maxCredits,
      allowDrop: record.allowDrop,
      isActive: record.isActive,
    });
  };

  const buildPeriodPayload = (values: PeriodFormValues) => ({
    phase: values.phase,
    startTime: values.startTime.toISOString(),
    endTime: values.endTime.toISOString(),
    maxCredits: values.maxCredits,
    allowDrop: Boolean(values.allowDrop),
    isActive: Boolean(values.isActive),
  });

  const resetCreateForm = () => {
    setCreateFeedback(null);
    createForm.resetFields();
  };

  const closeEditModal = () => {
    if (isUpdating) {
      return;
    }

    setEditingPeriod(null);
    setEditFeedback(null);
    editForm.resetFields();
  };

  const handleCreate = async (values: PeriodFormValues) => {
    setCreateFeedback(null);
    setIsCreating(true);

    try {
      await create.mutateAsync({
        ...buildPeriodPayload(values),
        semesterId: values.semesterId,
      });

      setCreateFeedback({
        type: 'success',
        message: '阶段配置已创建',
      });

      createForm.resetFields();
    } catch (error) {
      setCreateFeedback({
        type: 'error',
        message: extractErrorMessage(error, '创建阶段配置失败，请重试'),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (values: PeriodFormValues) => {
    if (!editingPeriod) {
      return;
    }

    setEditFeedback(null);
    setIsUpdating(true);

    try {
      await update.mutateAsync({ periodId: editingPeriod.id, payload: buildPeriodPayload(values) });

      setCreateFeedback({
        type: 'success',
        message: '阶段配置已更新',
      });

      setEditingPeriod(null);
      editForm.resetFields();
    } catch (error) {
      setEditFeedback({
        type: 'error',
        message: extractErrorMessage(error, '更新阶段配置失败，请重试'),
      });
    } finally {
      setIsUpdating(false);
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

      <Card title="新建阶段配置" style={{ marginBottom: 16 }}>
        {createFeedback ? (
          <Alert
            message={createFeedback.message}
            type={createFeedback.type}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ allowDrop: false, isActive: true }}
          onFinish={handleCreate}
        >
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
            name="allowDrop"
            label="是否允许退课"
            rules={[{ required: true, message: '请选择是否允许退课' }]}
          >
            <Select
              options={[
                { value: true, label: '允许' },
                { value: false, label: '不允许' },
              ]}
            />
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
              <Button type="primary" htmlType="submit" loading={isCreating}>
                创建阶段
              </Button>
              <Button onClick={resetCreateForm} disabled={isCreating}>重置表单</Button>
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

      <Modal
        title="编辑阶段配置"
        open={Boolean(editingPeriod)}
        onCancel={closeEditModal}
        footer={null}
        destroyOnClose
        forceRender
        width="100vw"
        style={{ top: 0, maxWidth: '100vw', paddingBottom: 0 }}
        styles={{
          body: { height: 'calc(100vh - 120px)', overflowY: 'auto', paddingTop: 16 },
          content: { minHeight: '100vh', borderRadius: 0 },
        }}
      >
        {editFeedback ? (
          <Alert
            message={editFeedback.message}
            type={editFeedback.type}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Form
          form={editForm}
          layout="vertical"
          initialValues={{ allowDrop: false, isActive: true }}
          onFinish={handleUpdate}
        >
          <Form.Item
            name="semesterId"
            label="学期ID"
            rules={[{ required: true, message: '请填写学期ID' }]}
          >
            <Input disabled />
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
            name="allowDrop"
            label="是否允许退课"
            rules={[{ required: true, message: '请选择是否允许退课' }]}
          >
            <Select
              options={[
                { value: true, label: '允许' },
                { value: false, label: '不允许' },
              ]}
            />
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
              <Button type="primary" htmlType="submit" loading={isUpdating}>
                更新阶段
              </Button>
              <Button onClick={closeEditModal} disabled={isUpdating}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
        <Text type="secondary">
          编辑提交后仍以后端校验权限、阶段时序和业务规则。
        </Text>
      </Modal>
    </div>
  );
};

export default AdminSelectionPeriodPage;
