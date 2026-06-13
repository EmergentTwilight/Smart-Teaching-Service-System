import { Form, Input, InputNumber, Modal, Space, Typography, message } from 'antd';
import { useEffect } from 'react';
import { SCORE_LIMITS } from '../shared';
import type {
  ModificationRequestPayload,
  ProposedScoreChanges,
  TeacherScoreRow,
} from '../teacher/types';

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

const SCORE_FIELDS = ['usualScore', 'midtermScore', 'finalScore'] as const;

/**
 * 只挑出"相对原成绩确实发生变化、且非空"的分数字段，
 * 与 F2 后端 proposedChanges「至少一项」的校验对齐，避免把未改动的原值一并提交。
 */
function buildProposedChanges(values: FormValues, row: TeacherScoreRow): ProposedScoreChanges {
  const changes: ProposedScoreChanges = {};

  for (const field of SCORE_FIELDS) {
    const next = values[field];
    if (typeof next === 'number' && next !== row[field]) {
      changes[field] = next;
    }
  }

  return changes;
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
    if (!row) {
      return;
    }

    const values = await form.validateFields();
    const proposedChanges = buildProposedChanges(values, row);

    if (Object.keys(proposedChanges).length === 0) {
      message.warning('请至少修改一项分数后再提交申请');
      return;
    }

    await onSubmit({ proposedChanges, reason: values.reason });
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
          已提交或已确认的成绩不能直接修改，需提交改分申请，由管理员审批后生效。仅修改了的分数项会进入申请。
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
