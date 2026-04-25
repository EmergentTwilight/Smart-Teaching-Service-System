// frontend/src/modules/course-arrangement/pages/ConstraintRuleEditDrawer.tsx
import React, { useEffect, useState } from 'react';
import { Drawer, Form, Input, Select, Button, Space, Spin, Switch, InputNumber, Typography, Divider, Card, FormInstance } from 'antd';
import { rulesApi } from '../api/rule.js';
import { SetSchedulingRuleInput } from '../types/rule.js'

const { Option } = Select;
const { Text } = Typography;

interface ConstraintRuleEditDrawerProps {
  visible: boolean;
  ruleId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const defaultTimeSlot = { dayOfWeek: 1, startPeriod: 1, endPeriod: 2 };

const TimeSlotList: React.FC<{
  name: string[];
  form: FormInstance<SetSchedulingRuleInput>;
}> = ({ name }) => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
        {fields.length === 0 && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            暂无时间段配置
          </Text>
        )}
        {fields.map(({ key, name: fieldName }) => (
          <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
            <Form.Item {...{ name: [fieldName, 'dayOfWeek'] }} rules={[{ required: true, message: '请选择星期' }]} noStyle>
              <Select placeholder="星期" style={{ width: 100 }}>
                {[1,2,3,4,5,6,7].map(day => (
                  <Option key={day} value={day}>周{day}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item {...{ name: [fieldName, 'startPeriod'] }} rules={[{ required: true, message: '开始节次' }]} noStyle>
              <InputNumber min={1} max={13} placeholder="开始" style={{ width: 80 }} />
            </Form.Item>
            <span>~</span>
            <Form.Item {...{ name: [fieldName, 'endPeriod'] }} rules={[{ required: true, message: '结束节次' }]} noStyle>
              <InputNumber min={1} max={13} placeholder="结束" style={{ width: 80 }} />
            </Form.Item>
            <Button type="dashed" danger onClick={() => remove(fieldName)}>删除</Button>
          </Space>
        ))}
        <Button type="dashed" onClick={() => add(defaultTimeSlot)} block>+ 添加时间段</Button>
      </div>
    )}
  </Form.List>
);

export const ConstraintRuleEditDrawer: React.FC<ConstraintRuleEditDrawerProps> = ({
  visible, ruleId, onClose, onSuccess
}) => {
  const [form] = Form.useForm<SetSchedulingRuleInput>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!ruleId;

  useEffect(() => {
    if (visible && isEdit) {
      setLoading(true);
      rulesApi.getById({ id: ruleId! }).then(res => {
        form.setFieldsValue({
          targetType: res.targetType,
          targetId: res.targetId,
          rules: res.rules,
        });
      }).catch(() => {})
      .finally(() => setLoading(false));
    } else if (visible) {
      form.resetFields();
      form.setFieldsValue({
        targetType: 'teacher',
        rules: {
          hardConstraints: { unavailableTimeSlots: [] },
          softConstraints: { preferredTimeSlots: [], continuousPeriods: true },
        },
      });
    }
  }, [visible, ruleId]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await rulesApi.save({
        targetType: values.targetType,
        targetId: values.targetId,
        rules: values.rules,
      });
      onSuccess();
    } catch  {
      // ...
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={isEdit ? '编辑约束规则' : '新增约束规则'}
      width={600}
      onClose={onClose}
      open={visible}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSubmit} loading={submitting}>保存</Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          <Space style={{ display: 'flex', width: '100%' }}>
            <Form.Item name="targetType" label="目标类型" rules={[{ required: true }]}>
  <Select>
    <Option value="teacher">教师</Option>
    <Option value="course">课程</Option>
  </Select>
</Form.Item>
<Form.Item name="targetId" label="目标 ID" rules={[{ required: true }]}>
  <Input placeholder="工号或课程ID" />
</Form.Item>
          </Space>

          <Divider>硬约束配置</Divider>
          <Card size="small" style={{ background: '#fff1f0' }}>
            <Text strong style={{ color: '#cf1322' }}>不可用时间段</Text>
            <TimeSlotList name={['rules', 'hardConstraints', 'unavailableTimeSlots']} form={form} />
            <Form.Item name={['rules', 'hardConstraints', 'requiredRoomType']} label="必须的教室类型">
              <Select allowClear placeholder="不限制">
                <Option value="lecture">普通教室</Option>
                <Option value="lab">实验室</Option>
                <Option value="computer">机房</Option>
                <Option value="multimedia">多媒体教室</Option>
              </Select>
            </Form.Item>
          </Card>

          <Divider>软约束配置</Divider>
          <Card size="small" style={{ background: '#e6f7ff' }}>
            <Text strong style={{ color: '#1890ff' }}>偏好时间段</Text>
            <TimeSlotList name={['rules', 'softConstraints', 'preferredTimeSlots']} form={form} />
            <Form.Item name={['rules', 'softConstraints', 'continuousPeriods']} label="连续排课偏好" valuePropName="checked">
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
            <Form.Item name={['rules', 'softConstraints', 'preferredBuilding']} label="推荐教学楼">
              <Input placeholder="例如：A教学楼" />
            </Form.Item>
          </Card>
        </Form>
      </Spin>
    </Drawer>
  );
};
