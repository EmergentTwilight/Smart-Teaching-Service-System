import { Button, Space, Table, Tag, type ColumnsType } from 'antd';
import { type FC } from 'react';
import type { CourseOfferingItem } from '../types/course';

// TODO(C2, FR-C-08, FR-C-09, C3, FR-C-16, NFR-C-13): 课程列表渲染应与后端分页、筛选、可选状态、冲突提示保持一致
// - 该组件仅作为骨架承载展示，不执行业务校验；
// - 对应课程是否可选应以后端返回 isAvailable、reason 字段驱动，避免前端重复判定。
interface CourseOfferingTableProps {
  offerings: CourseOfferingItem[];
  loading: boolean;
  onEnroll?: (offeringId: string) => void;
  onViewDetail?: (offeringId: string) => void;
}

const statusLabel: Record<CourseOfferingItem['offeringStatus'], string> = {
  PLANNED: '未开课',
  OPEN: '可选',
  CLOSED: '已关闭',
  CANCELLED: '已取消',
};

export const CourseOfferingTable: FC<CourseOfferingTableProps> = ({
  offerings,
  loading,
  onEnroll,
  onViewDetail,
}) => {
  const columns: ColumnsType<CourseOfferingItem> = [
    { title: '课程代码', dataIndex: 'courseCode', key: 'courseCode' },
    { title: '课程名称', dataIndex: 'courseName', key: 'courseName' },
    { title: '教师', dataIndex: 'teacherName', key: 'teacherName' },
    { title: '学分', dataIndex: 'credits', key: 'credits' },
    {
      title: '容量',
      key: 'capacity',
      render: (_, record) => `${record.enrolledCount}/${record.capacity}`,
    },
    {
      title: '状态',
      key: 'offeringStatus',
      render: (_, record) => <Tag color={record.offeringStatus === 'OPEN' ? 'green' : 'default'}>{statusLabel[record.offeringStatus]}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        return onEnroll ? (
          <Space direction="vertical" size="small">
            <Button
              size="small"
              type="primary"
              disabled={!record.isAvailable}
              onClick={() => onEnroll(record.id)}
            >
              选课
            </Button>
            {record.hasConflictHint ? <div style={{ color: '#faad14' }}>{record.hasConflictHint}</div> : null}
          </Space>
        ) : null;
      },
    },
  ];

  return (
    <Table<CourseOfferingItem>
      rowKey="id"
      columns={columns}
      dataSource={offerings}
      loading={loading}
      pagination={false}
      onRow={(record) =>
        onViewDetail
          ? {
              onClick: () => onViewDetail(record.id),
            }
          : {}
      }
    />
  );
};
