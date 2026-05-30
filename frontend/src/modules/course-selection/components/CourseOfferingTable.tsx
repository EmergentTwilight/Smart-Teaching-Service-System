import { Button, Popover, Space, Table, Tag, Tooltip, Typography, type TableProps } from 'antd';
import { type FC } from 'react';
import type { AvailableOfferingItem } from '../types/course';
import type { PaginationMeta } from '../types/common';
import { InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

const COURSE_TYPE_COLORS: Record<string, string> = {
  required: '#1890ff',
  elective: '#52c41a',
  general: '#faad14',
};

const COURSE_TYPE_LABELS: Record<string, string> = {
  required: '必修',
  elective: '选修',
  general: '公共课',
};

const STATUS_CONFIG: Record<AvailableOfferingItem['status'], { label: string; color: string }> = {
  planned: { label: '未开课', color: 'default' },
  open: { label: '可选', color: 'green' },
  closed: { label: '已关闭', color: 'default' },
  cancelled: { label: '已取消', color: 'red' },
};

interface CourseOfferingTableProps {
  offerings: AvailableOfferingItem[];
  loading: boolean;
  pagination?: PaginationMeta | null;
  onPageChange?: (page: number, pageSize: number) => void;
  onEnroll?: (offeringId: string) => void;
  onDrop?: (enrollmentInfo: { offeringId: string }) => void;
  onViewDetail?: (offeringId: string) => void;
  enrollLoading?: string | null;
}

/**
 * CourseOfferingTable - 课程开设列表表格
 *
 * 覆盖需求：FR-C-08, FR-C-09, FR-C-13, FR-C-16, NFR-C-13
 * - 展示后端返回的课程列表，包括课程代码、名称、教师、学分、容量
 * - 可选状态由后端 eligibility.is_available 驱动，不在前端重复判定
 * - 不可选原因通过 eligibility.reasons 展示，不使用前端自定义字段
 * - 支持分页，分页参数透传给后端
 */
export const CourseOfferingTable: FC<CourseOfferingTableProps> = ({
  offerings,
  loading,
  pagination,
  onPageChange,
  onEnroll,
  onDrop,
  onViewDetail,
  enrollLoading,
}) => {
  const columns: TableProps<AvailableOfferingItem>['columns'] = [
    {
      title: '课程代码',
      dataIndex: 'courseCode',
      key: 'courseCode',
      width: 100,
    },
    {
      title: '课程名称',
      dataIndex: 'courseName',
      key: 'courseName',
      width: 180,
    },
    {
      title: '类型',
      dataIndex: 'courseType',
      key: 'courseType',
      width: 70,
      render: (value: string) => (
        <Tag color={COURSE_TYPE_COLORS[value] ?? 'default'}>
          {COURSE_TYPE_LABELS[value] ?? value}
        </Tag>
      ),
    },
    {
      title: '教师',
      dataIndex: 'teacherName',
      key: 'teacherName',
      width: 100,
    },
    {
      title: '学分',
      dataIndex: 'credits',
      key: 'credits',
      width: 60,
      align: 'center',
    },
    {
      title: '容量',
      key: 'capacity',
      width: 110,
      render: (_value: unknown, record: AvailableOfferingItem) => {
        const ratio = record.capacity > 0 ? record.enrolledCount / record.capacity : 0;
        const color = ratio >= 1 ? '#ff4d4f' : ratio >= 0.8 ? '#faad14' : '#52c41a';
        return (
          <Tooltip title={`剩余 ${record.remainingCapacity} 个名额`}>
            <Text style={{ color }}>
              {record.enrolledCount}/{record.capacity}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_value: unknown, record: AvailableOfferingItem) => {
        const cfg = STATUS_CONFIG[record.status] ?? { label: record.status, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '可选性',
      key: 'eligibility',
      width: 180,
      render: (_value: unknown, record: AvailableOfferingItem) => {
        const { eligibility } = record;
        const isAvailable = eligibility.isAvailable;

        if (isAvailable && eligibility.reasons.length === 0) {
          return (
            <Tag color="success" icon={<InfoCircleOutlined />}>
              可选
            </Tag>
          );
        }

        if (isAvailable && eligibility.reasons.length > 0) {
          return (
            <Space size={4}>
              <Tag color="success">可选</Tag>
              <Popover
                title="提示信息"
                content={
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {eligibility.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                }
                trigger="hover"
              >
                <InfoCircleOutlined style={{ color: '#1890ff', cursor: 'pointer' }} />
              </Popover>
            </Space>
          );
        }

        // not available — show reasons
        return (
          <Popover
            title="不可选原因（来自后端 eligibility.reasons）"
            content={
              eligibility.reasons.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {eligibility.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <Text type="secondary">后端未返回具体原因</Text>
              )
            }
            trigger="hover"
          >
            <Space size={4}>
              <Tag color="error" icon={<WarningOutlined />}>
                不可选
              </Tag>
              {eligibility.reasons.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12, maxWidth: 120 }} ellipsis>
                  {eligibility.reasons[0]}
                </Text>
              )}
            </Space>
          </Popover>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_value: unknown, record: AvailableOfferingItem) => {
        const isBusy = enrollLoading === record.courseOfferingId;

        return (
          <Space direction="vertical" size={4}>
            {record.eligibility.isEnrolled ? (
              onDrop ? (
                <Button
                  size="small"
                  danger
                  loading={isBusy}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDrop({ offeringId: record.courseOfferingId });
                  }}
                >
                  退选
                </Button>
              ) : (
                <Tag color="blue">已选</Tag>
              )
            ) : onEnroll ? (
              <Button
                size="small"
                type="primary"
                disabled={!record.eligibility.isAvailable}
                loading={isBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  if (record.eligibility.isAvailable) {
                    onEnroll(record.courseOfferingId);
                  }
                }}
              >
                选课
              </Button>
            ) : null}
            {onViewDetail ? (
              <Button
                size="small"
                type="link"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetail(record.courseOfferingId);
                }}
              >
                详情
              </Button>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <Table<AvailableOfferingItem>
      rowKey="courseOfferingId"
      columns={columns}
      dataSource={offerings}
      loading={loading}
      pagination={
        pagination
          ? {
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              onChange: onPageChange,
            }
          : false
      }
      scroll={{ x: 960 }}
      size="middle"
      locale={{
        emptyText: '暂无可选课程数据。请检查筛选条件或确认当前处于选课阶段。',
      }}
      onRow={(record) =>
        onViewDetail
          ? {
              style: { cursor: 'pointer' },
              onClick: () => onViewDetail(record.courseOfferingId),
            }
          : {}
      }
    />
  );
};
