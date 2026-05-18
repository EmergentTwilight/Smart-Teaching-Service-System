import { Button, Space, Table, Tag, type TableProps } from 'antd';
import { type FC } from 'react';
import type { AvailableOfferingItem } from '../types/course';

// TODO(C2, FR-C-08, FR-C-09, C3, FR-C-16, NFR-C-13): 课程列表渲染应与后端分页、筛选、可选状态、冲突提示保持一致
// - 该组件仅作为骨架承载展示，不执行业务校验；
// - 对应课程是否可选应以后端返回 eligibility.reasons 字段驱动，避免前端重复判定。
interface CourseOfferingTableProps {
  offerings: AvailableOfferingItem[];
  loading: boolean;
  onEnroll?: (offeringId: string) => void;
  onViewDetail?: (offeringId: string) => void;
}

const statusLabel: Record<AvailableOfferingItem['status'], string> = {
  planned: '未开课',
  open: '可选',
  closed: '已关闭',
  cancelled: '已取消',
};

export const CourseOfferingTable: FC<CourseOfferingTableProps> = ({
  offerings,
  loading,
  onEnroll,
  onViewDetail,
}) => {
  const columns: TableProps<AvailableOfferingItem>['columns'] = [
    { title: '课程代码', dataIndex: 'courseCode', key: 'courseCode' },
    { title: '课程名称', dataIndex: 'courseName', key: 'courseName' },
    { title: '教师', dataIndex: 'teacherName', key: 'teacherName' },
    { title: '学分', dataIndex: 'credits', key: 'credits' },
    {
      title: '容量',
      key: 'capacity',
      render: (_value: unknown, record: AvailableOfferingItem) => `${record.enrolledCount}/${record.capacity}`,
    },
    {
      title: '状态',
      key: 'status',
      render: (_value: unknown, record: AvailableOfferingItem) => <Tag color={record.status === 'open' ? 'green' : 'default'}>{statusLabel[record.status]}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_value: unknown, record: AvailableOfferingItem) => {
        return onEnroll ? (
          <Space direction="vertical" size="small">
            <Button
              size="small"
              type="primary"
              disabled={!record.eligibility.isAvailable}
              onClick={() => onEnroll(record.courseOfferingId)}
            >
              选课
            </Button>
            {record.eligibility.reasons.length ? <div style={{ color: '#faad14' }}>{record.eligibility.reasons[0]}</div> : null}
          </Space>
        ) : null;
      },
    },
  ];

  return (
    <Table<AvailableOfferingItem>
      rowKey="courseOfferingId"
      columns={columns}
      dataSource={offerings}
      loading={loading}
      pagination={false}
      onRow={(record) =>
        onViewDetail
          ? {
              onClick: () => onViewDetail(record.courseOfferingId),
            }
          : {}
      }
    />
  );
};
