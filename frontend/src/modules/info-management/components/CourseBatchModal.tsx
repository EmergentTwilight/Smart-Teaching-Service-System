/**
 * 课程批量创建弹窗
 */
import React, { useMemo, useState } from 'react';
import { Alert, Input, message, Modal, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { BatchCreateCourseResult, CreateCourseDTO, CourseType } from '../types/courses';

interface CourseBatchModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (courses: CreateCourseDTO[]) => Promise<BatchCreateCourseResult[] | void>;
}

const template = 'code,name,credits,hours,course_type,category,department_id,description,assessment_method\nCS101,数据结构,4,64,REQUIRED,专业必修,,,平时30% + 期末70%';

interface CoursePreviewRow extends Partial<CreateCourseDTO> {
  rowNumber: number;
  raw: string;
  valid: boolean;
  errors: string[];
}

const validCourseTypes: CourseType[] = ['REQUIRED', 'ELECTIVE', 'GENERAL'];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseCsv(input: string): CoursePreviewRow[] {
  const lines = input
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), rowNumber: index + 1 }))
    .filter(({ line }) => line);
  if (lines.length <= 1) return [];

  return lines.slice(1).map(({ line, rowNumber }) => {
    const [code, name, credits, hours, courseType, category, departmentId, description, assessmentMethod] = line
      .split(',')
      .map((value) => value.trim());

    const normalizedCourseType = (courseType || 'REQUIRED').toUpperCase();
    const parsedCredits = Number(credits);
    const parsedHours = hours ? Number(hours) : undefined;
    const errors: string[] = [];

    if (!code) errors.push('课程代码不能为空');
    if (!name) errors.push('课程名称不能为空');
    if (!credits) errors.push('学分不能为空');
    if (credits && (!Number.isFinite(parsedCredits) || parsedCredits < 0 || parsedCredits > 999)) {
      errors.push('学分必须为 0-999 的数字');
    }
    if (parsedHours !== undefined && (!Number.isInteger(parsedHours) || parsedHours < 0)) {
      errors.push('学时必须为非负整数');
    }
    if (!validCourseTypes.includes(normalizedCourseType as CourseType)) {
      errors.push('课程类型必须为 REQUIRED、ELECTIVE 或 GENERAL');
    }
    if (departmentId && !isUuid(departmentId)) {
      errors.push('院系ID必须为 UUID');
    }

    return {
      rowNumber,
      raw: line,
      code,
      name,
      credits: parsedCredits,
      hours: parsedHours,
      courseType: normalizedCourseType as CourseType,
      category: category || undefined,
      departmentId: departmentId || undefined,
      description: description || undefined,
      assessmentMethod: assessmentMethod || undefined,
      valid: errors.length === 0,
      errors,
    };
  });
}

const CourseBatchModal: React.FC<CourseBatchModalProps> = ({ visible, onClose, onSubmit }) => {
  const [text, setText] = useState(template);
  const [results, setResults] = useState<BatchCreateCourseResult[]>([]);
  const [submittedCourses, setSubmittedCourses] = useState<CreateCourseDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const previewRows = useMemo(() => parseCsv(text), [text]);
  const invalidRows = previewRows.filter((row) => !row.valid);
  const validRows = previewRows.filter((row): row is CoursePreviewRow & CreateCourseDTO => row.valid);

  const handleSubmit = async () => {
    if (previewRows.length === 0) {
      message.warning('请至少填写一条课程数据');
      return;
    }
    if (invalidRows.length > 0) {
      message.error(`预览中有 ${invalidRows.length} 条错误，请修正后再提交`);
      return;
    }

    setLoading(true);
    try {
      const courses = validRows.map(({ rowNumber: _rowNumber, raw: _raw, valid: _valid, errors: _errors, ...course }) => course);
      setSubmittedCourses(courses);
      const nextResults = await onSubmit(courses);
      setResults(nextResults || []);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<BatchCreateCourseResult> = [
    { title: '序号', dataIndex: 'index', key: 'index', width: 80 },
    {
      title: '课程代码',
      key: 'code',
      width: 130,
      render: (_, record) => submittedCourses[record.index]?.code || '-',
    },
    {
      title: '课程名称',
      key: 'name',
      ellipsis: true,
      render: (_, record) => submittedCourses[record.index]?.name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: BatchCreateCourseResult['status']) => (
        <Tag color={value === 'created' ? 'green' : 'red'}>{value === 'created' ? '创建成功' : '创建失败'}</Tag>
      ),
    },
    { title: '课程ID', dataIndex: 'id', key: 'id', ellipsis: true, render: (value?: string) => value || '-' },
    { title: '错误', dataIndex: 'error', key: 'error', render: (value?: string) => value || '-' },
  ];

  const previewColumns: ColumnsType<CoursePreviewRow> = [
    { title: '行号', dataIndex: 'rowNumber', key: 'rowNumber', width: 70 },
    { title: '课程代码', dataIndex: 'code', key: 'code', width: 130, render: (value?: string) => value || '-' },
    { title: '课程名称', dataIndex: 'name', key: 'name', ellipsis: true, render: (value?: string) => value || '-' },
    { title: '学分', dataIndex: 'credits', key: 'credits', width: 80, render: (value?: number) => Number.isFinite(value) ? value : '-' },
    { title: '学时', dataIndex: 'hours', key: 'hours', width: 80, render: (value?: number) => value ?? '-' },
    { title: '课程类型', dataIndex: 'courseType', key: 'courseType', width: 110 },
    {
      title: '预览状态',
      key: 'valid',
      width: 120,
      render: (_, record) => (
        <Tag color={record.valid ? 'green' : 'red'}>{record.valid ? '可提交' : '有错误'}</Tag>
      ),
    },
    {
      title: '提示',
      key: 'errors',
      render: (_, record) => record.errors.length > 0 ? record.errors.join('；') : '-',
    },
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
      <Input.TextArea
        rows={8}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setResults([]);
          setSubmittedCourses([]);
        }}
      />
      <Alert
        type={invalidRows.length > 0 ? 'error' : 'success'}
        showIcon
        style={{ marginTop: 12, marginBottom: 12 }}
        message={`预览：共 ${previewRows.length} 条，可提交 ${validRows.length} 条，错误 ${invalidRows.length} 条`}
      />
      <Table
        columns={previewColumns}
        dataSource={previewRows}
        rowKey={(record) => `${record.rowNumber}-${record.raw}`}
        pagination={{ pageSize: 5, size: 'small' }}
        size="small"
      />
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
