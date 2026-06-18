/**
 * 课程表格组件
 */
import React from 'react';
import { Button, Space, Table, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Course, CourseStatus, CourseType } from '../types/courses';
import { COURSE_STATUS_LABELS, COURSE_TYPE_LABELS } from '../types/courses';

interface CourseTableProps {
  data: Course[];
  loading?: boolean;
  onView: (record: Course) => void;
  onEdit: (record: Course) => void;
  onDelete: (record: Course) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const statusColors: Record<CourseStatus, string> = {
  ACTIVE: 'green',
  ARCHIVED: 'default',
};

const typeColors: Record<CourseType, string> = {
  REQUIRED: 'blue',
  ELECTIVE: 'purple',
  GENERAL: 'cyan',
};

const CourseTable: React.FC<CourseTableProps> = ({
  data,
  loading = false,
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}) => {
  const columns: ColumnsType<Course> = [
    { title: '课程代码', dataIndex: 'code', key: 'code', width: 120 },
    { title: '课程名称', dataIndex: 'name', key: 'name', width: 180, ellipsis: true },
    {
      title: '学分',
      dataIndex: 'credits',
      key: 'credits',
      width: 80,
      align: 'right',
      render: (value: number) => value.toFixed(1),
    },
    { title: '学时', dataIndex: 'hours', key: 'hours', width: 80, align: 'right', render: (value?: number | null) => value ?? '-' },
    {
      title: '类型',
      dataIndex: 'courseType',
      key: 'courseType',
      width: 100,
      render: (value: CourseType) => <Tag color={typeColors[value]}>{COURSE_TYPE_LABELS[value]}</Tag>,
    },
    { title: '类别', dataIndex: 'category', key: 'category', width: 120, render: (value?: string | null) => value || '-' },
    { title: '所属院系', dataIndex: 'departmentName', key: 'departmentName', width: 160, ellipsis: true, render: (value?: string | null) => value || '-' },
    { title: '负责人', dataIndex: 'teacherName', key: 'teacherName', width: 120, render: (value?: string | null) => value || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (value: CourseStatus) => <Tag color={statusColors[value]}>{COURSE_STATUS_LABELS[value]}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (value: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size={12}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onView(record)}>
            查看
          </Button>
          {canEdit && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
              编辑
            </Button>
          )}
          {canDelete && (
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(record)}>
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      pagination={false}
      scroll={{ x: 1360 }}
    />
  );
};

export default CourseTable;
