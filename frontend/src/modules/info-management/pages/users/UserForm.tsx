/**
 * 用户表单组件
 * 用于创建和编辑用户
 */
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Radio, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import type { User, UserFormData } from '@/shared/types';

/**
 * UserForm 组件 Props
 */
interface UserFormProps {
  /** 是否显示 */
  open: boolean;
  /** 编辑的用户（为空表示新建） */
  user?: User | null;
  /** 可选角色列表 */
  roles?: { id: string; name: string; code: string }[];
  /** 提交回调 */
  onSubmit: (values: UserFormData) => Promise<void>;
  /** 取消回调 */
  onCancel: () => void;
}

const genderOptions = [
  { label: '男', value: 'MALE' },
  { label: '女', value: 'FEMALE' },
  { label: '其他', value: 'OTHER' },
];

const UserForm: React.FC<UserFormProps> = ({ open, user, roles, onSubmit, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const isEdit = !!user;

  useEffect(() => {
    if (open) {
      if (user) {
        // 编辑模式：填充用户数据
        // 将角色代码转换为角色 ID
        const roleIds = user.roles?.map(roleCode => {
          const role = roles?.find(r => r.code === roleCode)
          return role?.id || roleCode
        }) || []

        form.setFieldsValue({
          username: user.username,
          realName: user.realName,
          email: user.email || '',
          phone: user.phone || '',
          gender: user.gender || undefined,
          status: user.status,
          roleIds: roleIds,
        });
      } else {
        // 新建模式：重置表单
        form.resetFields();
      }
    }
  }, [open, user, form, roles]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // 构建提交数据
      const submitData: UserFormData = {
        username: values.username,
        realName: values.realName,
        email: values.email || undefined,
        phone: values.phone || undefined,
        gender: values.gender as 'MALE' | 'FEMALE' | 'OTHER',
        status: values.status,
      };

      // 密码处理
      if (values.password) {
        submitData.password = values.password;
      }

      // 角色处理（需要根据实际 API 调整）
      if (values.roleIds) {
        submitData.roleIds = values.roleIds;
      }

      await onSubmit(submitData);
      message.success(isEdit ? '更新成功' : '创建成功');
      form.resetFields();
      onCancel();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        // 表单验证失败
        return;
      }
      message.error(error instanceof Error ? error.message : (isEdit ? '更新失败' : '创建失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={isEdit ? '编辑用户' : '新建用户'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      destroyOnClose
      width={600}
      okText={isEdit ? '保存' : '创建'}
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: 'ACTIVE',
          gender: undefined,
        }}
      >
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少 3 个字符' },
            { max: 50, message: '用户名最多 50 个字符' },
            { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
          ]}
        >
          <Input 
            prefix={<UserOutlined />}
            placeholder="请输入用户名" 
            disabled={isEdit} 
          />
        </Form.Item>

        <Form.Item
          name="realName"
          label="真实姓名"
          rules={[
            { required: true, message: '请输入真实姓名' },
            { max: 50, message: '姓名最多 50 个字符' },
          ]}
        >
          <Input placeholder="请输入真实姓名" />
        </Form.Item>

        <Space style={{ width: '100%' }} size="large">
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
            style={{ width: 280 }}
          >
            <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            style={{ width: 260 }}
          >
            <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" />
          </Form.Item>
        </Space>

        {!isEdit && (
          <Form.Item
            name="password"
            label="密码"
            extra="密码至少8位，需包含大写字母、小写字母和数字"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少 8 个字符' },
              { pattern: /[A-Z]/, message: '密码必须包含大写字母' },
              { pattern: /[a-z]/, message: '密码必须包含小写字母' },
              { pattern: /[0-9]/, message: '密码必须包含数字' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>
        )}

        <Space style={{ width: '100%' }} size="large">
          <Form.Item
            name="gender"
            label="性别"
            style={{ width: 280 }}
          >
            <Radio.Group options={genderOptions} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            style={{ width: 260 }}
          >
            <Radio.Group>
              <Radio value="ACTIVE">启用</Radio>
              <Radio value="INACTIVE">禁用</Radio>
              <Radio value="BANNED">封禁</Radio>
            </Radio.Group>
          </Form.Item>
        </Space>

        {roles && roles.length > 0 && (
          <Form.Item
            name="roleIds"
            label="角色"
          >
            <Select
              mode="multiple"
              placeholder="请选择角色（可选）"
              options={roles.map(role => ({
                label: role.name,
                value: role.id,
              }))}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default UserForm;
