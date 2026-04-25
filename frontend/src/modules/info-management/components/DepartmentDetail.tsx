
import React from 'react';
import { Modal, Descriptions, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DepartmentDetail as DepartmentDetailData, MajorSummary, TeacherSummary } from '../types/departments';
import { DEGREE_TYPE_LABELS } from '../types/departments';
import dayjs from 'dayjs';

interface DepartmentDetailProps {
  visible: boolean;
  onClose: () => void;
  data: DepartmentDetailData | null;
}

const DepartmentDetail: React.FC<DepartmentDetailProps> = ({ visible, onClose, data }) => {
  const majorColumns: ColumnsType<MajorSummary> = [
    {
      title: '专业代码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '专业名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '学位类型',
      dataIndex: 'degree_type',
      key: 'degree_type',
      render: (type: string) => DEGREE_TYPE_LABELS[type] || type,
    },
    {
      title: '学生人数',
      dataIndex: 'student_count',
      key: 'student_count',
    },
  ];

  const teacherColumns: ColumnsType<TeacherSummary> = [
    {
      title: '教师编号',
      dataIndex: 'teacher_number',
      key: 'teacher_number',
    },
    {
      title: '姓名',
      dataIndex: 'real_name',
      key: 'real_name',
    },
    {
      title: '职称',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => title || '-',
    },
  ];

  if (!data) return null;

  return (
    <Modal
      title="部门详情"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Descriptions title={data.name} column={2}>
        <Descriptions.Item label="部门代码">{data.code}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{dayjs(data.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        <Descriptions.Item label="描述" span={2}>
          {data.description || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="教师人数">
          <Tag color="blue">{data.teacherCount} 人</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="学生人数">
          <Tag color="green">{data.studentCount} 人</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="专业数量">
          <Tag color="orange">{data.majorCount} 个</Tag>
        </Descriptions.Item>
      </Descriptions>

      {data.majors && data.majors.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ marginBottom: 12 }}>下属专业</h4>
          <Table
            columns={majorColumns}
            dataSource={data.majors}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </div>
      )}

      {data.teachers && data.teachers.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ marginBottom: 12 }}>所属教师</h4>
          <Table
            columns={teacherColumns}
            dataSource={data.teachers}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </div>
      )}
    </Modal>
  );
};

export default DepartmentDetail;
