/**
 * 课程详情弹窗
 */
import React from 'react';
import { Descriptions, Modal, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { CourseDetail as CourseDetailData, CoursePrerequisite } from '../types/courses';
import { COURSE_STATUS_LABELS, COURSE_TYPE_LABELS } from '../types/courses';

interface CourseDetailProps {
  visible: boolean;
  onClose: () => void;
  data: CourseDetailData | null;
}

const CourseDetail: React.FC<CourseDetailProps> = ({ visible, onClose, data }) => {
  const prerequisiteColumns: ColumnsType<CoursePrerequisite> = [
    { title: '课程代码', dataIndex: 'code', key: 'code', width: 140 },
    { title: '课程名称', dataIndex: 'name', key: 'name' },
  ];

  if (!data) return null;

  return (
    <Modal title="课程详情" open={visible} onCancel={onClose} footer={null} width={860}>
      <Descriptions title={data.name} column={2}>
        <Descriptions.Item label="课程代码">{data.code}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={data.status === 'ACTIVE' ? 'green' : 'default'}>{COURSE_STATUS_LABELS[data.status]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="课程类型">{COURSE_TYPE_LABELS[data.courseType]}</Descriptions.Item>
        <Descriptions.Item label="课程类别">{data.category || '-'}</Descriptions.Item>
        <Descriptions.Item label="学分">{data.credits.toFixed(1)}</Descriptions.Item>
        <Descriptions.Item label="学时">{data.hours ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="所属院系">{data.departmentName || '-'}</Descriptions.Item>
        <Descriptions.Item label="负责人">{data.teacherName || '-'}</Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {data.createdAt ? dayjs(data.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          {data.updatedAt ? dayjs(data.updatedAt).format('YYYY-MM-DD HH:mm') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="考核方式" span={2}>
          {data.assessmentMethod || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="课程描述" span={2}>
          {data.description || '-'}
        </Descriptions.Item>
      </Descriptions>

      <h4 style={{ marginTop: 20, marginBottom: 12 }}>先修课程</h4>
      <Table
        columns={prerequisiteColumns}
        dataSource={data.prerequisites || []}
        rowKey="id"
        pagination={false}
        size="small"
      />
    </Modal>
  );
};

export default CourseDetail;
