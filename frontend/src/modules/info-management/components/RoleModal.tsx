/**
 * 角色创建/编辑弹窗
 */
import React, { useEffect } from 'react';
import { Empty, Form, Input, Modal, Select } from 'antd';
import type { CreateRoleDTO, Permission, Role } from '../types/roles';

interface RoleModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRoleDTO) => void | Promise<void>;
  initialData?: Role;
  permissions: Permission[];
}

const RoleModal: React.FC<RoleModalProps> = ({ visible, onClose, onSubmit, initialData, permissions }) => {
  const [form] = Form.useForm<CreateRoleDTO>();
  const isEdit = !!initialData;

  useEffect(() => {
    if (visible && initialData) {
      form.setFieldsValue({
        code: initialData.code,
        name: initialData.name,
        description: initialData.description || undefined,
      });
      return;
    }
    if (visible) {
      form.resetFields();
    }
  }, [form, initialData, visible]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
    form.resetFields();
    onClose();
  };

  const permissionOptions = permissions.map((permission) => ({
    label: `${permission.code} ${permission.name}`,
    value: permission.id,
  }));

  return (
    <Modal
      title={isEdit ? '编辑角色' : '新增角色'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="保存"
      cancelText="取消"
      width={560}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="code" label="角色代码" rules={[{ required: true, message: '请输入角色代码' }]}>
          <Input disabled={isEdit} placeholder="例如 dept_admin" />
        </Form.Item>
        <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
          <Input placeholder="请输入角色名称" />
        </Form.Item>
        <Form.Item name="description" label="角色描述">
          <Input.TextArea rows={3} placeholder="请输入角色描述" />
        </Form.Item>
        {!isEdit && (
          <Form.Item name="permissionIds" label="初始权限">
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder="请选择权限"
              options={permissionOptions}
              notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无权限" />}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default RoleModal;
