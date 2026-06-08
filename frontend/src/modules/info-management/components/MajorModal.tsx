/**
 * 专业新增/编辑表单弹窗
 */
import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Radio, Select } from 'antd';
import type { Department } from '../types/departments';
import type { CreateMajorDTO, DegreeType, Major } from '../types/majors';
import { DEGREE_TYPE_LABELS } from '../types/majors';

interface MajorModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMajorDTO) => void | Promise<void>;
  initialData?: Major;
  departments: Department[];
}

const MajorModal: React.FC<MajorModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  departments,
}) => {
  const [form] = Form.useForm<CreateMajorDTO>();

  useEffect(() => {
    if (visible && initialData) {
      form.setFieldsValue({
        name: initialData.name,
        code: initialData.code || undefined,
        departmentId: initialData.departmentId,
        degreeType: initialData.degreeType || undefined,
        totalCredits: initialData.totalCredits,
      });
      return;
    }

    if (visible) {
      form.resetFields();
    }
  }, [form, initialData, visible]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('专业代码')) {
        form.setFields([{ name: 'code', errors: [message] }]);
      } else if (message.includes('专业名称')) {
        form.setFields([{ name: 'name', errors: [message] }]);
      }
    }
  };

  const degreeOptions = Object.entries(DEGREE_TYPE_LABELS).map(([value, label]) => ({
    label,
    value: value as DegreeType,
  }));

  const departmentOptions = departments.map((department) => ({
    label: department.name,
    value: department.id,
  }));

  return (
    <Modal
      title={initialData ? '编辑专业' : '新增专业'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="保存"
      cancelText="取消"
      width={520}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="专业名称"
          rules={[
            { required: true, message: '请输入专业名称' },
            { max: 100, message: '专业名称不能超过100个字符' },
          ]}
        >
          <Input placeholder="请输入专业名称" />
        </Form.Item>

        <Form.Item
          name="code"
          label="专业代码"
          rules={[{ max: 20, message: '专业代码不能超过20个字符' }]}
        >
          <Input placeholder="请输入专业代码" disabled={!!initialData} />
        </Form.Item>

        <Form.Item
          name="departmentId"
          label="所属院系"
          rules={[{ required: true, message: '请选择所属院系' }]}
        >
          <Select
            placeholder="请选择所属院系"
            options={departmentOptions}
            showSearch
            optionFilterProp="label"
            disabled={!!initialData}
          />
        </Form.Item>

        <Form.Item name="degreeType" label="学位类型">
          <Radio.Group options={degreeOptions} />
        </Form.Item>

        <Form.Item
          name="totalCredits"
          label="总学分"
          rules={[
            { type: 'number', min: 0.1, message: '总学分必须大于0' },
            { type: 'number', max: 9999, message: '总学分不能超过9999' },
          ]}
        >
          <InputNumber
            placeholder="请输入总学分"
            min={0.1}
            max={9999}
            step={0.5}
            precision={1}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MajorModal;
