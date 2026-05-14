import { useState } from 'react';
import { Alert, Button, Card, Empty, Form, Input, Space, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { TimetableGrid } from '../components/TimetableGrid';
import { enrollmentsApi } from '../api/enrollments';
import { useMyEnrollments } from '../hooks/useMyEnrollments';

const { Title, Text } = Typography;

/**
 * TODO(C4, FR-C-25, FR-C-26, FR-C-29, FR-C-07):
 * - 课表页应基于 /timetable/me 返回值渲染，前端不得自行推导课程时间；
 * - 结果应与 /enrollments/me 统一按学生身份与权限过滤；
 * - 支持学期筛选，但不能越权访问他人课表。
 */
const StudentTimetablePage: React.FC = () => {
  const [semesterId, setSemesterId] = useState<string>('');

  const enrollmentsQuery = useMyEnrollments({ page: 1, pageSize: 100 });
  const timetableQuery = useQuery({
    queryKey: ['course-selection', 'timetable', semesterId || 'all'],
    queryFn: () =>
      enrollmentsApi.getMyTimetable({
        semesterId: semesterId || undefined,
      }),
  });

  const timetable = timetableQuery.data;
  const slots = timetable?.slots || [];
  const hasSelection = (enrollmentsQuery.data?.items || []).length > 0;

  const handleSearch = () => {
    timetableQuery.refetch();
  };

  const handleReset = () => {
    setSemesterId('');
    timetableQuery.refetch();
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          我的课表
        </Title>
        <Text type="secondary">基于后端生成结果展示，不从本地推断课程时间。</Text>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Form layout="inline">
          <Form.Item label="学期ID">
            <Input
              placeholder="按学期过滤（可选）"
              value={semesterId}
              onChange={(event) => setSemesterId(event.target.value)}
              style={{ width: 240 }}
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSearch}>
                查询课表
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="课表结果">
        {timetableQuery.isError ? (
          <Alert
            type="error"
            message="课表查询失败"
            description="请检查学期条件后重试，或联系管理员确认排课与权限状态。"
          />
        ) : timetableQuery.isLoading ? (
          <Text type="secondary">查询中...</Text>
        ) : (
          <TimetableGrid slots={slots} semesterName={timetable?.semesterName} />
        )}
      </Card>

      <Card title="辅助信息" style={{ marginTop: 16 }}>
        {!hasSelection ? (
          <Empty description="当前无选课记录，课表暂时为空。请先完成课程选择。" />
        ) : (
          <Text>当前查询到 {slots.length} 条课表记录。</Text>
        )}
      </Card>
    </div>
  );
};

export default StudentTimetablePage;
