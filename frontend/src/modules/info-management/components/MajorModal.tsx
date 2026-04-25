import React, {  useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, InputNumber, message } from 'antd';
import { DegreeType, DEGREE_TYPE_LABELS, Major } from '../types/majors';
import type { Department } from '../types/departments';

interface MajorModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (data: { name: string; code: string; departmentId: string; degreeType: DegreeType; totalCredits: number }) => void;
  editData?: Major | null;
  departments: Department[];
}

export const MajorModal: React.FC<MajorModalProps> = ({
  open,
  onCancel,
  onSubmit,
  editData,
  departments,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && editData) {
      form.setFieldsValue({
        name: editData.name,
        code: editData.code,
        departmentId: editData.departmentId,
        degreeType: editData.degreeType,
        totalCredits: editData.totalCredits,
      });
    } else if (open && !editData) {
      form.resetFields();
    }
  }, [open, editData, form]);

  const handleOk = () => {
    form.validateFields()
      .then((values) => {
        onSubmit(values);
        form.resetFields();
      })
      .catch((error) => {
        message.error('表单校验失败，请检查输入');
        console.error('表单校验失败:', error);
      });
  };

  const degreeOptions = Object.entries(DEGREE_TYPE_LABELS).map(([value, label]) => ({
    label,
    value,
  }));

  const departmentOptions = departments.map((dept) => ({
    label: dept.name,
    value: dept.id,
  }));

  return (
    <Modal
      title={editData ? '编辑专业' : '创建专业'}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      width={500}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="专业名称"
          rules={[
            { required: true, message: '请输入专业名称' },
            { max: 50, message: '专业名称不能超过50个字符' },
          ]}
        >
          <Input placeholder="请输入专业名称" />
        </Form.Item>

        <Form.Item
          name="code"
          label="专业代码"
          rules={[
            { required: true, message: '请输入专业代码' },
            { max: 20, message: '专业代码不能超过20个字符' },
          ]}
        >
          <Input
            placeholder="请输入专业代码"
            disabled={!!editData}
          />
        </Form.Item>

        <Form.Item
          name="departmentId"
          label="所属院系"
          rules={[{ required: true, message: '请选择所属院系' }]}
        >
          <Select
            placeholder="请选择所属院系"
            options={departmentOptions}
          />
        </Form.Item>

        <Form.Item
          name="degreeType"
          label="学位类型"
          rules={[{ required: true, message: '请选择学位类型' }]}
        >
          <Radio.Group options={degreeOptions} />
        </Form.Item>

        <Form.Item
          name="totalCredits"
          label="总学分"
          rules={[
            { required: true, message: '请输入总学分' },
            { type: 'number', min: 0, message: '总学分必须大于等于0' },
          ]}
        >
          <InputNumber
            placeholder="请输入总学分"
            step={0.5}
            min={0}
            max={500}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
