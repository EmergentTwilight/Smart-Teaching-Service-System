/**
 * 培养方案表格组件
 */
import React from 'react';
import { Button, Space, Table } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Curriculum } from '../types/curriculums';

interface CurriculumTableProps {
  data: Curriculum[];
  loading?: boolean;
  onView: (record: Curriculum) => void;
  onEdit: (record: Curriculum) => void;
  onDelete: (record: Curriculum) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const CurriculumTable: React.FC<CurriculumTableProps> = ({
  data,
  loading = false,
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}) => {
  const columns: ColumnsType<Curriculum> = [
    { title: '培养方案名称', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
    { title: '专业', dataIndex: 'majorName', key: 'majorName', width: 180, ellipsis: true },
    { title: '年份', dataIndex: 'year', key: 'year', width: 90 },
    { title: '总学分', dataIndex: 'totalCredits', key: 'totalCredits', width: 100, render: (value: number) => value.toFixed(1) },
    { title: '必修学分', dataIndex: 'requiredCredits', key: 'requiredCredits', width: 100, render: (value: number) => value.toFixed(1) },
    { title: '选修学分', dataIndex: 'electiveCredits', key: 'electiveCredits', width: 100, render: (value: number) => value.toFixed(1) },
    { title: '课程数量', dataIndex: 'courseCount', key: 'courseCount', width: 100 },
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
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size={12}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onView(record)}>查看</Button>
          {canEdit && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>编辑</Button>}
          {canDelete && <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(record)}>删除</Button>}
        </Space>
      ),
    },
  ];

  return <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} scroll={{ x: 1210 }} />;
};

export default CurriculumTable;
