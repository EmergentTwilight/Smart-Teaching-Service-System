/**
 * 培养方案详情弹窗
 */
import React from 'react';
import { Button, Descriptions, Modal, Space, Table } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { CourseType } from '../types/courses';
import type { CurriculumCourse, CurriculumDetail as CurriculumDetailData } from '../types/curriculums';
import { COURSE_TYPE_LABELS } from '../types/courses';

interface CurriculumDetailProps {
  visible: boolean;
  onClose: () => void;
  data: CurriculumDetailData | null;
  canEdit?: boolean;
  onAddCourse: () => void;
  onBatchAddCourse: () => void;
  onEditCourse: (course: CurriculumCourse) => void;
  onRemoveCourse: (course: CurriculumCourse) => void;
}

const CurriculumDetail: React.FC<CurriculumDetailProps> = ({
  visible,
  onClose,
  data,
  canEdit = true,
  onAddCourse,
  onBatchAddCourse,
  onEditCourse,
  onRemoveCourse,
}) => {
  if (!data) return null;

  const columns: ColumnsType<CurriculumCourse> = [
    { title: '课程代码', dataIndex: 'courseCode', key: 'courseCode', width: 120 },
    { title: '课程名称', dataIndex: 'courseName', key: 'courseName' },
    { title: '学分', dataIndex: 'credits', key: 'credits', width: 90, render: (value: number) => value.toFixed(1) },
    { title: '课程类型', dataIndex: 'courseType', key: 'courseType', width: 110, render: (value: CourseType) => COURSE_TYPE_LABELS[value] },
    { title: '建议学期', dataIndex: 'semesterSuggestion', key: 'semesterSuggestion', width: 100, render: (value?: number | null) => value ?? '-' },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => canEdit ? (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEditCourse(record)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => onRemoveCourse(record)}>移除</Button>
        </Space>
      ) : null,
    },
  ];

  return (
    <Modal title="培养方案详情" open={visible} onCancel={onClose} footer={null} width={920}>
      <Descriptions title={data.name} column={2}>
        <Descriptions.Item label="专业">{data.majorName}</Descriptions.Item>
        <Descriptions.Item label="年份">{data.year}</Descriptions.Item>
        <Descriptions.Item label="总学分">{data.totalCredits.toFixed(1)}</Descriptions.Item>
        <Descriptions.Item label="必修学分">{data.requiredCredits.toFixed(1)}</Descriptions.Item>
        <Descriptions.Item label="选修学分">{data.electiveCredits.toFixed(1)}</Descriptions.Item>
        <Descriptions.Item label="课程数量">{data.courses.length}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{dayjs(data.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{dayjs(data.updatedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
      </Descriptions>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 }}>
        <h4 style={{ margin: 0 }}>课程列表</h4>
        {canEdit && (
          <Space>
            <Button size="small" icon={<PlusOutlined />} onClick={onBatchAddCourse}>批量添加</Button>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAddCourse}>添加课程</Button>
          </Space>
        )}
      </div>
      <Table columns={columns} dataSource={data.courses} rowKey="courseId" pagination={false} size="small" />
    </Modal>
  );
};

export default CurriculumDetail;
