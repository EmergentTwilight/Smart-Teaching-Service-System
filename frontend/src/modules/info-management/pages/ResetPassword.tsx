/**
 * 重置密码页面
 * 通过邮件链接重置密码
 */
import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Result, Spin, Progress, message } from 'antd';
import { LockOutlined, TrophyOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '@/modules/info-management/api/auth';
import styles from './Login.module.css';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [token, setToken] = useState('');

  useEffect(() => {
    // 从 URL 参数获取 token
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      // 这里可以添加 token 验证逻辑
      setValidToken(true);
    }
    setVerifying(false);
  }, [searchParams]);

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
    if (strength < 40) return '#ef4444';
    if (strength < 70) return '#f59e0b';
    return '#10b981';
  };

  /**
   * 获取密码强度文字
   */
  const getStrengthText = (strength: number): string => {
    if (strength < 40) return '弱';
    if (strength < 70) return '中';
    return '强';
  };

  /**
   * 提交重置密码表单
   */
  const handleSubmit = async (values: { newPassword: string }) => {
    setLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword: values.newPassword });
      message.success('密码重置成功');
      navigate('/login');
    } catch (error: any) {
      message.error(error.response?.data?.message || '重置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: '#666' }}>正在验证...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <Result
            icon={<CloseCircleOutlined style={{ color: '#ef4444' }} />}
            status="error"
            title="链接无效"
            subTitle="该重置链接已失效或已过期，请重新申请"
            extra={[
              <Link to="/forgot-password" key="retry">
                <Button type="primary">重新申请</Button>
              </Link>,
              <Link to="/login" key="login">
                <Button>返回登录</Button>
              </Link>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.logo}>
          <TrophyOutlined className={styles.logoIcon} />
        </div>
        <h2 className={styles.title}>重置密码</h2>
        <p className={styles.subtitle}>请设置您的新密码</p>

        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少8个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder="新密码"
              onChange={(e) => {
                setPasswordStrength(calculatePasswordStrength(e.target.value));
              }}
            />
          </Form.Item>

          {passwordStrength > 0 && (
            <div style={{ marginTop: -12, marginBottom: 16 }}>
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
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<CheckCircleOutlined style={{ color: '#9ca3af' }} />}
              placeholder="确认新密码"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              确认重置
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Link to="/login">返回登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ResetPassword;
