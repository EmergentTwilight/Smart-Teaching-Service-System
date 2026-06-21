/**
 * 培养方案新增/编辑弹窗
 */
import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Select } from 'antd';
import type { Curriculum, CreateCurriculumDTO } from '../types/curriculums';
import type { Major } from '../types/majors';

interface CurriculumModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCurriculumDTO) => void | Promise<void>;
  initialData?: Curriculum;
  majors: Major[];
}

const CurriculumModal: React.FC<CurriculumModalProps> = ({ visible, onClose, onSubmit, initialData, majors }) => {
  const [form] = Form.useForm<CreateCurriculumDTO>();
  const isEdit = !!initialData;

  const validateCreditSum = () => {
    const totalCredits = form.getFieldValue('totalCredits');
    const requiredCredits = form.getFieldValue('requiredCredits');
    const electiveCredits = form.getFieldValue('electiveCredits');
    if (totalCredits == null || requiredCredits == null || electiveCredits == null) {
      return Promise.resolve();
    }

    const sum = Number((requiredCredits + electiveCredits).toFixed(1));
    if (Math.abs(totalCredits - sum) > 0.000001) {
      return Promise.reject(new Error('总学分必须等于必修学分与选修学分之和'));
    }
    return Promise.resolve();
  };

  useEffect(() => {
    if (visible && initialData) {
      form.setFieldsValue({
        name: initialData.name,
        majorId: initialData.majorId,
        year: initialData.year,
        totalCredits: initialData.totalCredits,
        requiredCredits: initialData.requiredCredits,
        electiveCredits: initialData.electiveCredits,
      });
      return;
    }
    if (visible) form.resetFields();
  }, [form, initialData, visible]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
    form.resetFields();
    onClose();
  };

  const majorOptions = majors.map((major) => ({ label: major.name, value: major.id }));

  return (
    <Modal title={isEdit ? '编辑培养方案' : '新增培养方案'} open={visible} onCancel={onClose} onOk={handleSubmit} okText="保存" cancelText="取消" width={560} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="培养方案名称" rules={[{ required: true, message: '请输入培养方案名称' }, { max: 100, message: '名称不能超过100个字符' }]}>
          <Input placeholder="请输入培养方案名称" />
        </Form.Item>
        {!isEdit && (
          <>
            <Form.Item name="majorId" label="专业" rules={[{ required: true, message: '请选择专业' }]}>
              <Select showSearch optionFilterProp="label" placeholder="请选择专业" options={majorOptions} />
            </Form.Item>
            <Form.Item name="year" label="年份" rules={[{ required: true, message: '请输入年份' }]}>
              <InputNumber min={2000} max={2100} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </>
        )}
        <Form.Item
          name="totalCredits"
          label="总学分"
          dependencies={['requiredCredits', 'electiveCredits']}
          rules={[{ required: true, message: '请输入总学分' }, { validator: validateCreditSum }]}
        >
          <InputNumber min={0.1} max={9999} step={0.5} precision={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="requiredCredits"
          label="必修学分"
          dependencies={['totalCredits', 'electiveCredits']}
          rules={[{ required: true, message: '请输入必修学分' }, { validator: validateCreditSum }]}
        >
          <InputNumber min={0.1} max={9999} step={0.5} precision={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="electiveCredits"
          label="选修学分"
          dependencies={['totalCredits', 'requiredCredits']}
          rules={[{ required: true, message: '请输入选修学分' }, { validator: validateCreditSum }]}
        >
          <InputNumber min={0.1} max={9999} step={0.5} precision={1} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CurriculumModal;
