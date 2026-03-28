/**
 * 注册页面
 * 用户注册表单
 */
import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Progress } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, TrophyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '@/modules/info-management/api/auth';
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

  /**
   * 计算密码强度
   */
  const calculatePasswordStrength = (password: string): number => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  /**
   * 获取密码强度颜色
   */
  const getStrengthColor = (strength: number): string => {
    if (strength < 30) return '#ff4d4f';
    if (strength < 60) return '#faad14';
    if (strength < 80) return '#52c41a';
    return '#1890ff';
  };

  /**
   * 获取密码强度文本
   */
  const getStrengthText = (strength: number): string => {
    if (strength < 30) return '弱';
    if (strength < 60) return '中等';
    if (strength < 80) return '强';
    return '非常强';
  };

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
      message.error((error as any).response?.data?.message || '注册失败，请重试');
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
