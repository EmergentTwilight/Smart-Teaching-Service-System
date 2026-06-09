import { Form, Input, InputNumber, Modal, Space, Typography } from 'antd';
import { useEffect } from 'react';
import { SCORE_LIMITS } from '../shared';
import type { ModificationRequestPayload, TeacherScoreRow } from '../teacher/types';

interface ModificationRequestModalProps {
  open: boolean;
  row: TeacherScoreRow | null;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: ModificationRequestPayload) => Promise<void>;
}

interface FormValues {
  usualScore: number | null;
  midtermScore: number | null;
  finalScore: number | null;
  reason: string;
}

export function ModificationRequestModal({
  open,
  row,
  loading = false,
  onCancel,
  onSubmit,
}: ModificationRequestModalProps) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open || !row) {
      return;
    }

    form.setFieldsValue({
      usualScore: row.usualScore,
      midtermScore: row.midtermScore,
      finalScore: row.finalScore,
      reason: '',
    });
  }, [form, open, row]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      title="提交成绩修改申请"
      okText="提交申请"
      cancelText="取消"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnHidden
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          已提交或已确认的成绩不能直接改分，需要通过申请流程处理。当前页面只先打通前端表单和请求结构。
        </Typography.Text>

        <Form<FormValues> layout="vertical" form={form}>
          <Form.Item label="平时成绩" name="usualScore">
            <InputNumber
              min={SCORE_LIMITS.MIN}
              max={SCORE_LIMITS.MAX}
              style={{ width: '100%' }}
              placeholder="可留空"
            />
          </Form.Item>

          <Form.Item label="期中成绩" name="midtermScore">
            <InputNumber
              min={SCORE_LIMITS.MIN}
              max={SCORE_LIMITS.MAX}
              style={{ width: '100%' }}
              placeholder="可留空"
            />
          </Form.Item>

          <Form.Item label="期末成绩" name="finalScore">
            <InputNumber
              min={SCORE_LIMITS.MIN}
              max={SCORE_LIMITS.MAX}
              style={{ width: '100%' }}
              placeholder="可留空"
            />
          </Form.Item>

          <Form.Item
            label="申请理由"
            name="reason"
            rules={[{ required: true, message: '请填写申请理由' }]}
          >
            <Input.TextArea rows={4} maxLength={300} placeholder="请说明改分原因" />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}
