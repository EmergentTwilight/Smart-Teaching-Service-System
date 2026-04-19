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
  onSubmit: (data: CreateDepartmentDTO | UpdateDepartmentDTO) => void;
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

  const handleSubmit = () => {
    console.log('=== [调试] 部门表单提交 ===');
    form.validateFields().then((values) => {
      console.log('=== [调试] 表单验证通过，数据:', values);
      onSubmit(values);
      form.resetFields();
      onClose();
      console.log('=== [调试] 表单提交完成，弹窗已关闭 ===');
    }).catch((error) => {
      console.error('=== [调试] 表单验证失败:', error);
    });
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
