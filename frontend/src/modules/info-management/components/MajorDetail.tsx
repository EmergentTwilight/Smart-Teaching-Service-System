import React from 'react';
import { Modal, Tabs, Descriptions, Table } from 'antd';
import { MajorDetail as MajorDetailType, DEGREE_TYPE_LABELS } from '../types/majors';

interface MajorDetailProps {
  open: boolean;
  onCancel: () => void;
  data: MajorDetailType | null;
}

export const MajorDetail: React.FC<MajorDetailProps> = ({ open, onCancel, data }) => {
  if (!data) return null;

  const curriculumColumns = [
    { title: '培养方案名称', dataIndex: 'name', key: 'name' },
    { title: '年份', dataIndex: 'year', key: 'year' },
    { title: '总学分', dataIndex: 'totalCredits', key: 'totalCredits' },
  ];

  const studentColumns = [
    { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber' },
    { title: '姓名', dataIndex: 'realName', key: 'realName' },
    { title: '年级', dataIndex: 'grade', key: 'grade' },
  ];

  return (
    <Modal
      title="专业详情"
      open={open}
      onCancel={onCancel}
      width={800}
      footer={null}
    >
      <Tabs defaultActiveKey="basic">
        <Tabs.TabPane tab="基本信息" key="basic">
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="专业代码">{data.code}</Descriptions.Item>
            <Descriptions.Item label="专业名称">{data.name}</Descriptions.Item>
            <Descriptions.Item label="所属院系">{data.departmentName}</Descriptions.Item>
            <Descriptions.Item label="学位类型">
              {DEGREE_TYPE_LABELS[data.degreeType] || data.degreeType}
            </Descriptions.Item>
            <Descriptions.Item label="总学分">{data.totalCredits?.toFixed(1) || '-'}</Descriptions.Item>
            <Descriptions.Item label="学生数量">{data.studentCount ?? 0}</Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {data.createdAt ? new Date(data.createdAt).toLocaleString('zh-CN') : '-'}
            </Descriptions.Item>
            {data.updatedAt && (
              <Descriptions.Item label="更新时间" span={2}>
                {new Date(data.updatedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            )}
            {data.description && (
              <Descriptions.Item label="专业描述" span={2}>
                {data.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Tabs.TabPane>
        <Tabs.TabPane tab="培养方案" key="curriculums">
          <Table
            dataSource={data.curriculums || []}
            columns={curriculumColumns}
            rowKey="id"
            pagination={false}
            bordered
            locale={{ emptyText: '暂无培养方案数据' }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="学生列表" key="students">
          <Table
            dataSource={data.students || []}
            columns={studentColumns}
            rowKey="userId"
            pagination={false}
            bordered
            locale={{ emptyText: '暂无学生数据' }}
          />
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  );
};
