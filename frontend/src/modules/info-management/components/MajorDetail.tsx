/**
 * 专业详情弹窗
 */
import React from 'react';
import { Descriptions, Modal, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { CurriculumSummary, MajorDetail as MajorDetailData, StudentSummary } from '../types/majors';
import { DEGREE_TYPE_LABELS } from '../types/majors';

interface MajorDetailProps {
  visible: boolean;
  onClose: () => void;
  data: MajorDetailData | null;
}

const MajorDetail: React.FC<MajorDetailProps> = ({ visible, onClose, data }) => {
  const curriculumColumns: ColumnsType<CurriculumSummary> = [
    { title: '培养方案名称', dataIndex: 'name', key: 'name' },
    { title: '年份', dataIndex: 'year', key: 'year', width: 100 },
    {
      title: '总学分',
      dataIndex: 'totalCredits',
      key: 'totalCredits',
      width: 100,
      render: (value: number | undefined) => value != null ? value.toFixed(1) : '-',
    },
  ];

  const studentColumns: ColumnsType<StudentSummary> = [
    { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber' },
    { title: '姓名', dataIndex: 'realName', key: 'realName' },
    { title: '年级', dataIndex: 'grade', key: 'grade', width: 100 },
  ];

  if (!data) return null;

  return (
    <Modal title="专业详情" open={visible} onCancel={onClose} footer={null} width={820}>
      <Tabs
        defaultActiveKey="basic"
        items={[
          {
            key: 'basic',
            label: '基本信息',
            children: (
              <Descriptions title={data.name} column={2}>
                <Descriptions.Item label="专业代码">{data.code || '-'}</Descriptions.Item>
                <Descriptions.Item label="所属院系">{data.departmentName || '-'}</Descriptions.Item>
                <Descriptions.Item label="学位类型">
                  {data.degreeType ? DEGREE_TYPE_LABELS[data.degreeType] : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="总学分">
                  {data.totalCredits != null ? `${data.totalCredits.toFixed(1)} 学分` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="学生数量">
                  <Tag color="green">{data.studentCount ?? 0} 人</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {data.createdAt ? dayjs(data.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                  {data.updatedAt ? dayjs(data.updatedAt).format('YYYY-MM-DD HH:mm') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="描述" span={2}>
                  {data.description || '-'}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'curriculums',
            label: '培养方案',
            children: (
              <Table
                columns={curriculumColumns}
                dataSource={data.curriculums || []}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ),
          },
          {
            key: 'students',
            label: '学生列表',
            children: (
              <Table
                columns={studentColumns}
                dataSource={data.students || []}
                rowKey="userId"
                pagination={false}
                size="small"
              />
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default MajorDetail;
