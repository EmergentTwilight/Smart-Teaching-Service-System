import { Button, Card, Form, Input, message, Typography } from 'antd';
import { useUpsertSelectionPeriod } from '../hooks/useSelectionPeriod';
import { useMemo } from 'react';
import { extractErrorMessage } from '@/shared/utils/error';

const { TextArea } = Input;
const { Text } = Typography;

interface ManualEnrollmentFormValues {
  studentId: string;
  courseOfferingId: string;
  reason: string;
}

/**
 * TODO(C5, FR-C-33, FR-C-34, NFR-C-04, NFR-C-12):
 * - 页面仅提供教务手动加课入口；后端必须仍走统一事务链路，默认执行容量/重复/冲突/学分/阶段/先修检查；
 * - 任何成功/失败以服务端返回为准，不在前端伪装落库。
 */
const AdminManualEnrollmentPage: React.FC = () => {
  const [form] = Form.useForm<ManualEnrollmentFormValues>();
  const { manualEnroll } = useUpsertSelectionPeriod();

  const submitButtonDisabled = useMemo(
    () => manualEnroll.isPending,
    [manualEnroll.isPending]
  );

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) {
      return;
    }

    manualEnroll.mutate(values, {
      onSuccess: () => {
        message.success('已提交手动加课请求，服务端将返回结果');
        form.resetFields();
      },
      onError: (error) => {
        message.error(extractErrorMessage(error, '手动加课提交失败，请重试'));
      },
    });
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2>手动加课</h2>
        <Text type="secondary">仅教务/管理员入口，前端不做“绕过规则”操作。</Text>
      </div>

      <Card title="发起手动加课">
        <Form<ManualEnrollmentFormValues>
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ reason: '' }}
        >
          <Form.Item
            name="studentId"
            label="学生ID"
            rules={[{ required: true, message: '请填写学生ID' }]}
          >
            <Input placeholder="学生 userId / 学号对应的主键UUID" />
          </Form.Item>

          <Form.Item
            name="courseOfferingId"
            label="课程开设ID"
            rules={[{ required: true, message: '请填写课程开设ID' }]}
          >
            <Input placeholder="目标课程开设 UUID" />
          </Form.Item>

          <Form.Item
            name="reason"
            label="加课原因"
            rules={[
              { required: true, message: '请填写操作原因' },
              { max: 500, message: '原因长度不能超过500字符' },
            ]}
          >
            <TextArea rows={4} placeholder="请输入具体原因，作为审计字段保留" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitButtonDisabled} disabled={submitButtonDisabled}>
              提交手动加课
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AdminManualEnrollmentPage;
