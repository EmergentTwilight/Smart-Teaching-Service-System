/**
 * 专业表格组件
 * 展示专业列表，支持查看、编辑、删除操作
 */
import React from 'react';
import { Button, Space, Table } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { DegreeType, Major } from '../types/majors';
import { DEGREE_TYPE_LABELS } from '../types/majors';

interface MajorTableProps {
  data: Major[];
  loading?: boolean;
  onView: (record: Major) => void;
  onEdit: (record: Major) => void;
  onDelete: (record: Major) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const MajorTable: React.FC<MajorTableProps> = ({
  data,
  loading = false,
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}) => {
  const columns: ColumnsType<Major> = [
    {
      title: '专业代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (value: string | null | undefined) => value || '-',
    },
    {
      title: '专业名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      ellipsis: true,
    },
    {
      title: '所属院系',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 180,
      ellipsis: true,
      render: (value: string | undefined) => value || '-',
    },
    {
      title: '学位类型',
      dataIndex: 'degreeType',
      key: 'degreeType',
      width: 100,
      align: 'center',
      render: (value: DegreeType | null | undefined) => value ? DEGREE_TYPE_LABELS[value] : '-',
    },
    {
      title: '总学分',
      dataIndex: 'totalCredits',
      key: 'totalCredits',
      width: 90,
      align: 'right',
      render: (value: number | undefined) => value != null ? value.toFixed(1) : '-',
    },
    {
      title: '学生数量',
      dataIndex: 'studentCount',
      key: 'studentCount',
      width: 100,
      align: 'center',
      render: (value: number | undefined) => value ?? 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (value: string | undefined) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-',
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
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(record)}
            >
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
      scroll={{ x: 1100 }}
    />
  );
};

export default MajorTable;
