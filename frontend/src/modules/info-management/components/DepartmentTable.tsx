/**
 * 部门表格组件
 * 展示部门列表表格，支持查看、编辑、删除操作
 */
import React from 'react';
import { Button, Space, Table } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { Department } from '../types/departments';
import dayjs from 'dayjs';

interface DepartmentTableProps {
  data: Department[];
  loading: boolean;
  onEdit: (item: Department) => void;
  onView: (item: Department) => void;
  onDelete: (id: string) => void;
  rowSelection?: TableProps<Department>['rowSelection'];
  canEdit?: boolean;      // 是否有编辑权限
  canDelete?: boolean;    // 是否有删除权限
}

const DepartmentTable: React.FC<DepartmentTableProps> = ({
  data,
  loading,
  onEdit,
  onView,
  onDelete,
  rowSelection,
  canEdit = true,
  canDelete = true,
}) => {
  const columns: ColumnsType<Department> = [
    {
      title: '部门代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '部门名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '教师人数',
      dataIndex: 'teacher_count',
      key: 'teacher_count',
      width: 100,
      align: 'center',
    },
    {
      title: '学生人数',
      dataIndex: 'student_count',
      key: 'student_count',
      width: 100,
      align: 'center',
    },
    {
      title: '专业数量',
      dataIndex: 'major_count',
      key: 'major_count',
      width: 100,
      align: 'center',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
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
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            disabled={!canEdit}
            style={{ color: canEdit ? undefined : '#ccc', cursor: canEdit ? undefined : 'not-allowed' }}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(record.id)}
            disabled={!canDelete}
            style={{ color: canDelete ? undefined : '#ccc', cursor: canDelete ? undefined : 'not-allowed' }}
          >
            删除
          </Button>
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
      rowSelection={rowSelection}
      scroll={{ x: 1200 }}
      pagination={false}  // 禁用默认分页，使用自定义分页组件
    />
  );
};

export default DepartmentTable;
