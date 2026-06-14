/**
 * 课程批量创建弹窗
 */
import React, { useState } from 'react';
import { Alert, Input, Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { BatchCreateCourseResult, CreateCourseDTO, CourseType } from '../types/courses';

interface CourseBatchModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (courses: CreateCourseDTO[]) => Promise<BatchCreateCourseResult[] | void>;
}

const template = 'code,name,credits,hours,course_type,category,department_id,description,assessment_method\nCS101,数据结构,4,64,REQUIRED,专业必修,,,平时30% + 期末70%';

function parseCsv(input: string): CreateCourseDTO[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];

  return lines.slice(1).map((line) => {
    const [code, name, credits, hours, courseType, category, departmentId, description, assessmentMethod] = line
      .split(',')
      .map((value) => value.trim());
    return {
      code,
      name,
      credits: Number(credits),
      hours: hours ? Number(hours) : undefined,
      courseType: (courseType || 'REQUIRED') as CourseType,
      category: category || undefined,
      departmentId: departmentId || undefined,
      description: description || undefined,
      assessmentMethod: assessmentMethod || undefined,
    };
  });
}

const CourseBatchModal: React.FC<CourseBatchModalProps> = ({ visible, onClose, onSubmit }) => {
  const [text, setText] = useState(template);
  const [results, setResults] = useState<BatchCreateCourseResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const courses = parseCsv(text);
    setLoading(true);
    try {
      const nextResults = await onSubmit(courses);
      setResults(nextResults || []);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<BatchCreateCourseResult> = [
    { title: '序号', dataIndex: 'index', key: 'index', width: 80 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
    { title: '课程ID', dataIndex: 'id', key: 'id', ellipsis: true, render: (value?: string) => value || '-' },
    { title: '错误', dataIndex: 'error', key: 'error', render: (value?: string) => value || '-' },
  ];

  return (
    <Modal
      title="批量创建课程"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="提交"
      cancelText="关闭"
      width={820}
      confirmLoading={loading}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="第一行为表头。字段顺序：code,name,credits,hours,course_type,category,department_id,description,assessment_method"
      />
      <Input.TextArea rows={8} value={text} onChange={(event) => setText(event.target.value)} />
      {results.length > 0 && (
        <Table
          style={{ marginTop: 16 }}
          columns={columns}
          dataSource={results}
          rowKey={(record) => `${record.index}-${record.status}`}
          pagination={false}
          size="small"
        />
      )}
    </Modal>
  );
};

export default CourseBatchModal;
