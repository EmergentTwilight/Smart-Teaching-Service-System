import React from 'react';
import { Form, Input, Button, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
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
      <Card className={styles.card} title="智慧教学服务系统">
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
              prefix={<UserOutlined />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
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
        <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
          测试账号: admin / admin123
        </div>
      </Card>
    </div>
  );
};

export default Login;
