import React from 'react';
import { Table, Button, Space } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Major, DegreeType, DEGREE_TYPE_LABELS } from '../types/majors';

interface MajorTableProps {
  data: Major[];
  onView: (record: Major) => void;
  onEdit: (record: Major) => void;
  onDelete: (record: Major) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const columns: ColumnType<Major>[] = [
  {
    title: '专业代码',
    dataIndex: 'code',
    key: 'code',
    width: 120,
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
  },
  {
    title: '学位类型',
    dataIndex: 'degreeType',
    key: 'degreeType',
    width: 100,
    align: 'center',
    render: (value: DegreeType) => DEGREE_TYPE_LABELS[value] || value,
  },
  {
    title: '总学分',
    dataIndex: 'totalCredits',
    key: 'totalCredits',
    width: 80,
    align: 'right',
    render: (value) => value?.toFixed(1) || '-',
  },
  {
    title: '学生数量',
    dataIndex: 'studentCount',
    key: 'studentCount',
    width: 100,
    align: 'center',
    render: (value) => value ?? 0,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    align: 'center',
    render: (value) => {
      if (!value) return '-';
      const date = new Date(value);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
  },
];

export const MajorTable: React.FC<MajorTableProps> = ({
  data,
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}) => {
  const actionColumn: ColumnType<Major> = {
    title: '操作',
    key: 'action',
    width: 160,
    align: 'center',
    render: (_, record) => (
      <Space size={12}>
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onView(record)}
        >
          查看
        </Button>
        {canEdit && (
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
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
  };

  return (
    <Table
      dataSource={data}
      columns={[...columns, actionColumn]}
      rowKey="id"
      pagination={false}
      bordered
      scroll={{ x: 'max-content' }}
      className="w-full"
    />
  );
};
