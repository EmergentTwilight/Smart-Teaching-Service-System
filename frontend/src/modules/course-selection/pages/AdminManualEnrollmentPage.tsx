import { useState } from 'react';
import { Alert, Button, Card, Descriptions, Form, Input, Tag, Typography } from 'antd';
import { useUpsertSelectionPeriod } from '../hooks/useSelectionPeriod';
import type { ManualEnrollmentResult } from '../types/period';
import { extractErrorMessage } from '@/shared/utils/error';

const { TextArea } = Input;
const { Text } = Typography;

interface ManualEnrollmentFormValues {
  studentId: string;
  courseOfferingId: string;
  reason: string;
}

type SubmitFeedback =
  | {
      type: 'success' | 'error';
      message: string;
    }
  | null;

/**
 * TODO(C5, FR-C-33, FR-C-34, NFR-C-04, NFR-C-12):
 * - 页面仅提供教务手动加课入口；后端必须仍走统一事务链路，默认执行容量/重复/冲突/学分/阶段/先修检查；
 * - 任何成功/失败以服务端返回为准，不在前端伪装落库。
 * - 待手动加课后端实现后做成功/失败联调整体验证。
 */
const AdminManualEnrollmentPage: React.FC = () => {
  const [form] = Form.useForm<ManualEnrollmentFormValues>();
  const { manualEnroll } = useUpsertSelectionPeriod();
  const [submitFeedback, setSubmitFeedback] = useState<SubmitFeedback>(null);
  const [lastResult, setLastResult] = useState<ManualEnrollmentResult | null>(null);

  const submitButtonDisabled = manualEnroll.isPending;

  const handleSubmitError = (error: unknown) => {
    setLastResult(null);
    setSubmitFeedback({
      type: 'error',
      message: extractErrorMessage(error, '手动加课提交失败，请重试'),
    });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) {
      return;
    }

    setSubmitFeedback(null);
    setLastResult(null);

    manualEnroll.mutate(
      {
        studentId: values.studentId.trim(),
        courseOfferingId: values.courseOfferingId.trim(),
        reason: values.reason.trim(),
      },
      {
        onSuccess: (result) => {
          setLastResult(result);
          setSubmitFeedback({
            type: 'success',
            message: '手动加课成功。',
          });
          form.resetFields();
        },
        onError: (error) => {
          handleSubmitError(error);
        },
      }
    );
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2>手动加课</h2>
        <Text type="secondary">当前页面作为教务加课入口，实际权限以后端教务授权校验为准。</Text>
      </div>

      <Card title="发起手动加课">
        {submitFeedback ? (
          <Alert
            message={submitFeedback.message}
            type={submitFeedback.type}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}
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
              { required: true, whitespace: true, message: '请填写操作原因' },
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

        {lastResult ? (
          <Card title="最近一次处理结果" size="small" style={{ marginTop: 16 }}>
            <Descriptions size="small" column={1} colon={false}>
              <Descriptions.Item label="Enrollment ID">{lastResult.enrollment.id}</Descriptions.Item>
              <Descriptions.Item label="学生 ID">{lastResult.enrollment.studentId}</Descriptions.Item>
              <Descriptions.Item label="课程开设 ID">{lastResult.enrollment.courseOfferingId}</Descriptions.Item>
              <Descriptions.Item label="选课状态">
                <Tag color={lastResult.enrollment.status === 'enrolled' ? 'green' : 'default'}>
                  {lastResult.enrollment.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="加课时间">{lastResult.enrollment.enrolledAt}</Descriptions.Item>
              <Descriptions.Item label="课程容量">{lastResult.courseOffering.capacity}</Descriptions.Item>
              <Descriptions.Item label="已选人数">{lastResult.courseOffering.enrolledCount}</Descriptions.Item>
              <Descriptions.Item label="剩余容量">{lastResult.courseOffering.remainingCapacity}</Descriptions.Item>
              <Descriptions.Item label="审计日志">
                <Tag color={lastResult.audit.logged ? 'green' : 'default'}>
                  {lastResult.audit.logged ? '已记录' : '未记录'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="审计动作">{lastResult.audit.action}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : null}
      </Card>
    </div>
  );
};

export default AdminManualEnrollmentPage;
