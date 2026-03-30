/**
 * 登录页面
 * 用户登录表单
 */
import React from 'react';
import { Form, Input, Button, Card } from 'antd';
import { UserOutlined, LockOutlined, TrophyOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import styles from './Login.module.css';

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const { login, loginLoading } = useAuth();
  const [form] = Form.useForm();

  const handleSubmit = (values: LoginForm) => {
    login(values);
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.logo}>
          <TrophyOutlined className={styles.logoIcon} />
        </div>
        <h2 className={styles.title}>
          登录
        </h2>
        <p className={styles.subtitle}>智慧教学服务系统</p>
        
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              name="username"
              prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              name="password"
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loginLoading}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div className={styles.footer}>
          <Link to="/forgot-password">忘记密码？</Link>
          <span style={{ margin: '0 8px', color: '#e2e8f0' }}>|</span>
          <Link to="/register">还没有账号？立即注册</Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
