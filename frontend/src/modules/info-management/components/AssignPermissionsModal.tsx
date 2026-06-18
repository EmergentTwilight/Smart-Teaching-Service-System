/**
 * 角色权限分配弹窗
 */
import React, { useEffect } from 'react';
import { Empty, Form, Modal, Select } from 'antd';
import type { Permission, Role } from '../types/roles';

interface AssignPermissionsModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (permissionIds: string[]) => void | Promise<void>;
  role?: Role | null;
  permissions: Permission[];
}

const AssignPermissionsModal: React.FC<AssignPermissionsModalProps> = ({
  visible,
  onClose,
  onSubmit,
  role,
  permissions,
}) => {
  const [form] = Form.useForm<{ permissionIds: string[] }>();

  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [form, visible]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSubmit(values.permissionIds);
    form.resetFields();
    onClose();
  };

  const existingIds = new Set(role?.permissions.map((permission) => permission.id) || []);
  const permissionOptions = permissions
    .filter((permission) => !existingIds.has(permission.id))
    .map((permission) => ({
      label: `${permission.code} ${permission.name}`,
      value: permission.id,
    }));

  return (
    <Modal title="分配权限" open={visible} onCancel={onClose} onOk={handleSubmit} okText="分配" cancelText="取消" width={560} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="permissionIds" label="权限" rules={[{ required: true, message: '请选择权限' }]}>
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="请选择要新增的权限"
            options={permissionOptions}
            notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可分配权限" />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignPermissionsModal;
