import { useState } from 'react';
import { Button, Card, Empty, Form, Input, Table, Typography, message } from 'antd';
import type { EnrollmentStatus } from '../types/enrollment';
import type { RosterPayload } from '../types/enrollment';
import { rosterApi } from '../api/roster';
import { extractErrorMessage } from '@/shared/utils/error';
import { useQuery } from '@tanstack/react-query';

const { Text } = Typography;

type RosterStatus = EnrollmentStatus;

interface RosterFormValues {
  offeringId: string;
  semesterId?: string;
  status?: RosterStatus;
}

/**
 * TODO(C4, FR-C-27, FR-C-28, NFR-C-06, NFR-C-08):
 * - 教师仅可查看/导出本人任课课程的名单；
 * - 导出内容应来自 Enrollment 实体查询，不能使用前端缓存计算；
 * - 列表/导出失败须返回明确错误并可重试。
 */
const TeacherRosterPage: React.FC = () => {
  const [form] = Form.useForm<RosterFormValues>();
  const [offeringId, setOfferingId] = useState('');
  const [query, setQuery] = useState<{ semesterId?: string; status?: RosterStatus }>({});

  const rosterQuery = useQuery({
    queryKey: ['course-selection', 'roster', offeringId, query],
    queryFn: () => rosterApi.getOfferingRoster(offeringId, query),
    enabled: Boolean(offeringId),
  });

  const handleSearch = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) {
      return;
    }

    setOfferingId(values.offeringId);
    setQuery({
      semesterId: values.semesterId || undefined,
      status: values.status || undefined,
    });
  };

  const handleExport = async () => {
    if (!offeringId) {
      message.warning('请先查询课程开设');
      return;
    }

    try {
      const result = await rosterApi.exportOfferingRoster(offeringId, {
        status: query.status,
        format: 'xlsx',
      });
      message.success(`${result.fileName}：${result.message}`);
    } catch (error) {
      message.error(extractErrorMessage(error, '导出失败，请重试'));
    }
  };

  const students = rosterQuery.data?.students || [];

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2>课程名单</h2>
        <Text type="secondary">教师端查看与导出本人课程学生名单（仅前端展示，不替代服务端筛选）</Text>
      </div>

      <Card title="查询条件" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item
            name="offeringId"
            rules={[{ required: true, message: '请填写课程开设ID' }]}
            style={{ minWidth: 280 }}
          >
            <Input placeholder="课程开设ID（UUID）" />
          </Form.Item>
          <Form.Item name="semesterId">
            <Input placeholder="按学期筛选（可选）" />
          </Form.Item>
          <Form.Item name="status">
            <Input placeholder="筛选状态：enrolled/dropped/withdrawn" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={rosterQuery.isLoading}>
              查询
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="课程名单"
        extra={
          <Button onClick={handleExport} disabled={!offeringId || rosterQuery.isLoading}>
            导出名单
          </Button>
        }
      >
        {rosterQuery.isLoading ? (
          <Text type="secondary">加载中...</Text>
        ) : rosterQuery.isError ? (
          <Text type="danger">名单加载失败：{extractErrorMessage(rosterQuery.error, '请核对课程开设ID或稍后重试')}</Text>
        ) : students.length === 0 ? (
          <Empty description="暂无名单数据" />
        ) : (
          <Table<RosterPayload['students'][number]>
            rowKey="studentNumber"
            pagination={false}
            dataSource={students}
            columns={[
              { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber' },
              { title: '姓名', dataIndex: 'studentName', key: 'studentName' },
              { title: '学院班级', dataIndex: 'className', key: 'className' },
              { title: '专业', dataIndex: 'majorName', key: 'majorName' },
              {
                title: '状态',
                dataIndex: 'enrollmentStatus',
                key: 'enrollmentStatus',
              },
              { title: '选课时间', dataIndex: 'enrolledAt', key: 'enrolledAt' },
            ]}
          />
        )}
      </Card>
    </div>
  );
};

export default TeacherRosterPage;
