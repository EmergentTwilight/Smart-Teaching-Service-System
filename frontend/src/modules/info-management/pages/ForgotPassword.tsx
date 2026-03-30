/**
 * 忘记密码页面
 * 发送密码重置邮件
 */
import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Result } from 'antd';
import { MailOutlined, TrophyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { authApi } from '@/modules/info-management/api/auth';
import type { ApiErrorResponse } from '@/shared/types';
import styles from './Login.module.css';

const ForgotPassword: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  /**
   * 提交忘记密码表单
   */
  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: values.email });
      setEmail(values.email);
      setSubmitted(true);
      message.success('重置邮件已发送');
    } catch (error: unknown) {
      message.error((error as AxiosError<ApiErrorResponse>)?.response?.data?.message || '发送失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重新发送邮件
   */
  const handleResend = async () => {
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      message.success('重置邮件已重新发送');
    } catch (error: unknown) {
      message.error((error as AxiosError<ApiErrorResponse>)?.response?.data?.message || '发送失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <Result
            icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
            status="success"
            title="邮件已发送"
            subTitle={
              <div>
                <p>我们已向 <strong>{email}</strong> 发送了密码重置链接</p>
                <p style={{ color: '#666', fontSize: 14 }}>请在邮件中点击重置链接来设置新密码</p>
                <p style={{ color: '#999', fontSize: 13 }}>如果没有收到邮件，请检查垃圾邮件文件夹</p>
              </div>
            }
            extra={[
              <Button key="resend" onClick={handleResend} loading={loading}>
                重新发送
              </Button>,
              <Link to="/login" key="login">
                <Button type="primary">返回登录</Button>
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
        <h2 className={styles.title}>忘记密码</h2>
        <p className={styles.subtitle}>输入您的邮箱，我们将发送重置链接</p>

        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
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
              placeholder="邮箱地址"
              type="email"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              发送重置链接
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

export default ForgotPassword;
