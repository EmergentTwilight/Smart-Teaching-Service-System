import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { TimetableGrid } from '../components/TimetableGrid';
import { enrollmentsApi } from '../api/enrollments';
import { useMyEnrollments } from '../hooks/useMyEnrollments';
import { extractErrorMessage } from '@/shared/utils/error';
import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * StudentTimetablePage - 我的课表页面
 *
 * 覆盖需求：FR-C-25, FR-C-26, FR-C-29, FR-C-07
 * - 基于 /timetable/me 返回渲染课表（FR-C-25）
 * - 结果与 /enrollments/me 统一按学生身份与权限过滤（FR-C-26）
 * - 支持学期筛选，不越权访问他人课表
 * - 展示 missing_schedule_items（FR-C-25）
 * - 打印样式由前端实现，不改变后端数据（FR-C-25）
 */
const StudentTimetablePage: React.FC = () => {
  const [semesterId, setSemesterId] = useState<string>('');

  const enrollmentsQuery = useMyEnrollments({ page: 1, pageSize: 100 });
  const timetableQuery = useQuery({
    queryKey: ['course-selection', 'timetable', 'me', semesterId || 'all'],
    queryFn: () =>
      enrollmentsApi.getMyTimetable({
        semesterId: semesterId || undefined,
      }),
    enabled: true,
  });

  const timetable = timetableQuery.data ?? null;
  const slots = timetable?.items ?? [];
  const missingItems = timetable?.missingScheduleItems ?? [];
  const hasSelection = (enrollmentsQuery.data?.items ?? []).length > 0;

  const timetableError = timetableQuery.isError
    ? extractErrorMessage(timetableQuery.error, '课表查询失败')
    : null;

  const handleSearch = () => {
    timetableQuery.refetch();
  };

  const handleReset = () => {
    setSemesterId('');
    // Use invalidate + refetch so queryKey changes trigger re-fetch
    setTimeout(() => timetableQuery.refetch(), 0);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          我的课表
        </Title>
        <Text type="secondary">
          查看您本学期已选课程的课表安排。
        </Text>
      </div>

      {/* ---- Filter bar ---- */}
      <Card style={{ marginBottom: 16 }}>
        <Form layout="inline">
          <Form.Item label="学期 ID">
            <Input
              placeholder="输入学期 ID 过滤（可选）"
              value={semesterId}
              onChange={(event) => setSemesterId(event.target.value)}
              style={{ width: 280 }}
              allowClear
              onPressEnter={handleSearch}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSearch} loading={timetableQuery.isFetching}>
                查询课表
              </Button>
              <Button onClick={handleReset}>重置</Button>
              <Button icon={<ReloadOutlined />} onClick={() => timetableQuery.refetch()}>
                刷新
              </Button>
              {slots.length > 0 ? (
                <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                  打印课表
                </Button>
              ) : null}
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* ---- Summary info ---- */}
      {timetable && !timetableQuery.isLoading ? (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Descriptions size="small" column={4}>
            <Descriptions.Item label="学期">{timetable.semester.name}</Descriptions.Item>
            <Descriptions.Item label="排课条目">{slots.length}</Descriptions.Item>
            <Descriptions.Item label="缺失排课">{missingItems.length}</Descriptions.Item>
            <Descriptions.Item label="可打印">
              <Tag color={timetable.printable ? 'green' : 'default'}>
                {timetable.printable ? '是' : '否'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ) : null}

      {/* ---- Timetable grid ---- */}
      {timetableError ? (
        <Alert
          type="error"
          message="课表查询失败"
          description={timetableError}
          showIcon
          action={
            <Button size="small" onClick={() => timetableQuery.refetch()}>
              重试
            </Button>
          }
        />
      ) : timetableQuery.isLoading && !timetable ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin tip="加载课表..." />
        </div>
      ) : (
        <TimetableGrid
          slots={slots}
          semesterName={timetable?.semester.name}
          missingScheduleItems={missingItems}
        />
      )}

      {/* ---- Enrollment summary ---- */}
      <Card title="选课概况" style={{ marginTop: 16 }}>
        {enrollmentsQuery.isLoading ? (
          <Text type="secondary">加载中...</Text>
        ) : !hasSelection ? (
          <Empty description="当前无选课记录，课表暂时为空。请先完成课程选择。" />
        ) : (
          <>
            {enrollmentsQuery.data?.summary ? (
              <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
                <Descriptions.Item label="已选课程">
                  {enrollmentsQuery.data.summary.enrolledCount} 门
                </Descriptions.Item>
                <Descriptions.Item label="已选学分">
                  {enrollmentsQuery.data.summary.enrolledCredits} 学分
                </Descriptions.Item>
              </Descriptions>
            ) : null}
            <Text type="secondary">
              当前查询到 {slots.length} 条课表记录
              {missingItems.length > 0
                ? `，${missingItems.length} 门课程暂无排课信息`
                : ''}。
            </Text>
          </>
        )}
      </Card>
    </div>
  );
};

export default StudentTimetablePage;
