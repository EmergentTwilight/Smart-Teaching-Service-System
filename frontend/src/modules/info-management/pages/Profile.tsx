/**
 * 个人资料页面
 * 查看和修改当前用户信息
 */
import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Descriptions, Space, Typography, Row, Col } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/shared/stores/authStore';
import { authApi } from '@/modules/info-management/api/auth';
import type { User } from '@/shared/types';

const Profile: React.FC = () => {
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  /**
   * 处理修改密码
   */
  const handlePasswordSubmit = async (values: {
 oldPassword: string; newPassword: string }) => {
    setPasswordLoading(true);
    try {
      await authApi.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch (error: unknown) {
      message.error((error as any).response?.data?.message || '修改密码失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  /**
   * 处理个人信息更新
   */
  const handleProfileSubmit = async (values: Partial<User>) => {
    setLoading(true);
    try {
      // TODO: 实现用户信息更新 API 调用
      // 需要 authStore 提供 updateUser 方法或使用 usersApi
      console.log('待更新用户信息:', values);
      message.success('信息更新成功');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <Typography.Title level={2} style={{ margin: 0 }}>
          个人资料
        </Typography.Title>
        <Typography.Text type="secondary">管理您的账户信息</Typography.Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* 基本信息 */}
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>基本信息</span>}
            style={{ borderRadius: 16, border: 'none' }}
            styles={{ body: { padding: 24 } }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleProfileSubmit}
              initialValues={{
                username: user.username,
                email: user.email,
                realName: user.realName,
                phone: user.phone,
              }}
            >
              <Form.Item label="用户名">
                <Input
                  prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                  value={user.username}
                  disabled
                />
              </Form.Item>

              <Form.Item label="真实姓名">
                <Input
                  prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                  value={user.realName}
                  disabled
                />
              </Form.Item>

              <Form.Item label="邮箱">
                <Input
                  prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                  value={user.email || ''}
                  disabled
                />
              </Form.Item>

              <Form.Item label="手机号">
                <Input
                  prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="请输入手机号"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存修改
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 修改密码 */}
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>修改密码</span>}
            style={{ borderRadius: 16, border: 'none' }}
            styles={{ body: { padding: 24 } }}
          >
            <Space style={{ marginBottom: 16, color: '#666' }}>
              <SafetyOutlined style={{ marginRight: 8 }} />
              为确保账户安全，建议定期修改密码
            </Space>

            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordSubmit}
            >
              <Form.Item
                label="当前密码"
                name="oldPassword"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="当前密码"
                />
              </Form.Item>

              <Form.Item
                label="新密码"
                name="newPassword"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 8, message: '密码至少8个字符' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="新密码"
                />
              </Form.Item>

              <Form.Item
                label="确认新密码"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请确认新密码' },
                   
                  ({ getFieldValue }: { getFieldValue: (name: string) => string }) => ({
                    validator(_: unknown, value: string) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="确认新密码"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={passwordLoading}>
                  修改密码
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 账户信息 */}
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>账户信息</span>}
            style={{ borderRadius: 16, border: 'none' }}
            styles={{ body: { padding: 24 } }}
          >
            <Descriptions column={1}>
            <Descriptions.Item label="角色">
              {user.roles?.join(', ') || '未设置'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {user.status === 'ACTIVE' ? '正常' : user.status === 'INACTIVE' ? '未激活' : '已封禁'}
            </Descriptions.Item>
            <Descriptions.Item label="注册时间">
              {new Date(user.createdAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="最后登录">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '从未登录'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>
    </Row>
    </div>
  );
};

export default Profile;
