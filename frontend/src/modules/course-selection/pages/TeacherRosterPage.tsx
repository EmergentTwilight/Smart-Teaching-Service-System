import { useState } from 'react';
import { Alert, Button, Card, Descriptions, Empty, Form, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { EnrollmentStatus, RosterPayload, RosterQuery } from '../types/enrollment';
import { rosterApi } from '../api/roster';
import { useQuery } from '@tanstack/react-query';

const { Text } = Typography;

type RosterStatus = EnrollmentStatus;

interface RosterFormValues {
  offeringId: string;
  keyword?: string;
  status?: RosterStatus;
}

type RequestError = Error & {
  status?: number;
};

/**
 * TODO(C4, FR-C-27, FR-C-28, NFR-C-06, NFR-C-08):
 * - 教师仅可查看/导出本人任课课程的名单；
 * - 导出内容应来自 Enrollment 实体查询，不能使用前端缓存计算；
 * - 列表/导出失败须返回明确错误并可重试。
 */
const TeacherRosterPage: React.FC = () => {
  const [form] = Form.useForm<RosterFormValues>();
  const [offeringId, setOfferingId] = useState('');
  const [query, setQuery] = useState<RosterQuery>({
    status: 'enrolled',
    page: 1,
    pageSize: 50,
  });
  const [isExporting, setIsExporting] = useState(false);

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

    setOfferingId(values.offeringId.trim());
    setQuery({
      keyword: values.keyword?.trim() || undefined,
      status: values.status || 'enrolled',
      page: 1,
      pageSize: query.pageSize || 50,
    });
  };

  const handleReset = () => {
    form.resetFields();
    setOfferingId('');
    setQuery({
      status: 'enrolled',
      page: 1,
      pageSize: 50,
    });
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setQuery((prev) => ({
      ...prev,
      page,
      pageSize,
    }));
  };

  const handleExport = async () => {
    if (!offeringId) {
      message.warning('请先查询课程开设');
      return;
    }

    try {
      setIsExporting(true);
      const { blob, fileName } = await rosterApi.exportOfferingRoster(offeringId, {
        status: query.status,
        format: 'xlsx',
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);

      message.success('名单导出已开始下载');
    } catch (error) {
      message.error('导出失败，请稍后重试。');
    } finally {
      setIsExporting(false);
    }
  };

  const students = rosterQuery.data?.students || [];
  const offering = rosterQuery.data?.offering;
  const pagination = rosterQuery.data?.pagination;
  const isForbidden = (rosterQuery.error as RequestError | null)?.status === 403;
  const rosterError = rosterQuery.isError
    ? isForbidden
      ? '当前账号无权查看该课程的学生名单。'
      : '请核对课程开设 ID 或稍后重试。'
    : null;

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
          <Form.Item name="keyword" style={{ minWidth: 220 }}>
            <Input placeholder="按学号/姓名/专业/班级筛选" allowClear />
          </Form.Item>
          <Form.Item name="status" initialValue="enrolled">
            <Select style={{ width: 180 }}>
              <Select.Option value="enrolled">仅已选</Select.Option>
              <Select.Option value="dropped">已退选</Select.Option>
              <Select.Option value="withdrawn">已撤销</Select.Option>
            </Select>
          </Form.Item>
          <Space>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={rosterQuery.isLoading}>
                查询
              </Button>
            </Form.Item>
            <Form.Item>
              <Button onClick={handleReset} disabled={rosterQuery.isLoading}>重置</Button>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card
        title="课程名单"
        extra={
          <Button onClick={handleExport} loading={isExporting} disabled={!offeringId || rosterQuery.isLoading}>
            导出名单
          </Button>
        }
      >
        {rosterQuery.isError ? (
          <Alert
            message={isForbidden ? '无权查看该课程名单' : '名单加载失败'}
            description={rosterError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {offering ? (
          <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="课程名称">{offering.courseName}</Descriptions.Item>
            <Descriptions.Item label="任课教师">{offering.teacherName}</Descriptions.Item>
            <Descriptions.Item label="课程开设 ID">{offering.offeringId}</Descriptions.Item>
          </Descriptions>
        ) : null}

        {rosterQuery.isLoading ? (
          <Text type="secondary">加载中...</Text>
        ) : students.length === 0 ? (
          <Empty description="暂无名单数据" />
        ) : (
          <Table<RosterPayload['students'][number]>
            rowKey="studentNumber"
            pagination={
              pagination
                ? {
                    current: pagination.page,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['20', '50', '100'],
                    onChange: handlePageChange,
                  }
                : false
            }
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
                render: (status: EnrollmentStatus) => (
                  <Tag color={status === 'enrolled' ? 'green' : status === 'dropped' ? 'orange' : 'default'}>
                    {status}
                  </Tag>
                ),
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
