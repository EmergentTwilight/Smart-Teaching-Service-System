/**
 * 注册页面
 * 用户注册表单
 */
import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Progress } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, TrophyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { authApi } from '@/modules/info-management/api/auth';
import type { ApiErrorResponse } from '@/shared/types';
import {
  calculatePasswordStrength,
  getStrengthColor,
  getStrengthText,
} from '@/shared/utils/password';
import styles from './Login.module.css';

interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  realName: string;
}

const Register: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();

  const handleSubmit = async (values: RegisterForm) => {
    try {
      setLoading(true);
      await authApi.register({
        username: values.username,
        password: values.password,
        email: values.email,
        realName: values.realName,
      });
      message.success('注册成功！请查看邮箱激活账号');
      navigate('/login');
    } catch (error: unknown) {
      message.error((error as AxiosError<ApiErrorResponse>)?.response?.data?.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.logo}>
          <TrophyOutlined className={styles.logoIcon} />
        </div>
        <h2 className={styles.title}>注册账号</h2>
        <p className={styles.subtitle}>创建您的智慧教学服务系统账号</p>

        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 20, message: '用户名最多20个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线' },
            ]}
          >
            <Input
              name="username"
              prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="realName"
            rules={[
              { required: true, message: '请输入真实姓名' },
              { min: 2, message: '姓名至少2个字符' },
            ]}
          >
            <Input
              name="realName"
              prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
              placeholder="真实姓名"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              name="email"
              prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
              placeholder="邮箱"
              type="email"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少8个字符' },
            ]}
          >
            <Input.Password
              name="password"
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder="密码"
              onChange={(e) => {
                setPasswordStrength(calculatePasswordStrength(e.target.value));
              }}
            />
          </Form.Item>

          {passwordStrength > 0 && (
            <div style={{ marginTop: -16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>密码强度</span>
                <span style={{ fontSize: 12, color: getStrengthColor(passwordStrength) }}>
                  {getStrengthText(passwordStrength)}
                </span>
              </div>
              <Progress
                percent={passwordStrength}
                strokeColor={getStrengthColor(passwordStrength)}
                trailColor="#e5e7eb"
                showInfo={false}
                size="small"
              />
            </div>
          )}

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              name="confirmPassword"
              prefix={<CheckCircleOutlined style={{ color: '#9ca3af' }} />}
              placeholder="确认密码"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Link to="/login">已有账号？立即登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;
