/**
 * 部门表单弹窗组件
 * 用于新增或编辑部门信息
 */
import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';

import type { Department, CreateDepartmentDTO, UpdateDepartmentDTO } from '../types/departments';

interface DepartmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDepartmentDTO | UpdateDepartmentDTO) => void | Promise<void>;
  initialData?: Department;
}

const DepartmentModal: React.FC<DepartmentModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (initialData) {
        form.setFieldsValue({
          name: initialData.name,
          code: initialData.code,
          description: initialData.description,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, initialData, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';

      if (message.includes('部门代码已存在')) {
        form.setFields([{ name: 'code', errors: ['部门代码已存在'] }]);
      } else if (message.includes('部门名称已存在')) {
        form.setFields([{ name: 'name', errors: ['部门名称已存在'] }]);
      }
      // 表单校验或接口提交失败时保持弹窗打开。
    }
  };

  return (
    <Modal
      title={initialData ? '编辑部门' : '新增部门'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="确定"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialData ? {
          name: initialData.name,
          code: initialData.code,
          description: initialData.description,
        } : undefined}
      >
        <Form.Item
          name="name"
          label="部门名称"
          rules={[
            { required: true, message: '请输入部门名称' },
            { max: 100, message: '部门名称不能超过100个字符' },
          ]}
        >
          <Input placeholder="请输入部门名称" />
        </Form.Item>

        <Form.Item
          name="code"
          label="部门代码"
          rules={[
            { required: true, message: '请输入部门代码' },
            { max: 20, message: '部门代码不能超过20个字符' },
            { pattern: /^[A-Za-z0-9_-]+$/, message: '部门代码只能包含字母、数字、下划线和连字符' },
          ]}
        >
          <Input placeholder="请输入部门代码" disabled={!!initialData} />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述"
          rules={[
            { max: 500, message: '描述不能超过500个字符' },
          ]}
        >
          <Input.TextArea
            placeholder="请输入部门描述（可选）"
            rows={3}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DepartmentModal;
