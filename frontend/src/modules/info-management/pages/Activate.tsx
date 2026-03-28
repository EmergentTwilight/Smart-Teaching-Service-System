/**
 * 账号激活页面
 * 处理邮箱激活链接
 */
import React, { useEffect, useState } from 'react';
import { Card, Button, Result, Spin, Input, Form, message } from 'antd';
import { TrophyOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '@/modules/info-management/api/auth';
import styles from './Login.module.css';

const Activate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'input'>('loading');
  const [form] = Form.useForm();

  useEffect(() => {
    // 从 URL 参数获取 token
    const token = searchParams.get('token');
    if (token) {
      handleActivate(token);
    } else {
      setStatus('input');
    }
  }, [searchParams]);

  /**
   * 处理激活
   */
  const handleActivate = async (token: string) => {
    setStatus('loading');
    try {
      await authApi.activate({ token });
      setStatus('success');
      message.success('账号激活成功！');
    } catch (error: unknown) {
      setStatus('error');
      message.error(error.response?.data?.message || '激活失败，请重试');
    }
  };

  /**
   * 手动输入 token 提交
   */
  const handleSubmit = async (values: { token: string }) => {
    await handleActivate(values.token);
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.logo}>
          <TrophyOutlined className={styles.logoIcon} />
        </div>

        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: '#666' }}>正在激活您的账号...</p>
          </div>
        )}

        {status === 'success' && (
          <Result
            icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
            status="success"
            title="激活成功"
            subTitle="您的账号已成功激活，现在可以登录系统了"
            extra={[
              <Button type="primary" key="login" onClick={() => navigate('/login')}>
                立即登录
              </Button>,
            ]}
          />
        )}

        {status === 'error' && (
          <Result
            icon={<CloseCircleOutlined style={{ color: '#ef4444' }} />}
            status="error"
            title="激活失败"
            subTitle="激活链接可能已过期或无效，请检查您的邮箱获取新的激活链接"
            extra={[
              <Link to="/login" key="login">
                <Button type="primary">返回登录</Button>
              </Link>,
            ]}
          />
        )}

        {status === 'input' && (
          <>
            <h2 className={styles.title}>激活账号</h2>
            <p className={styles.subtitle}>请输入您邮箱中收到的激活码</p>

            <Form
              form={form}
              onFinish={handleSubmit}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="token"
                rules={[{ required: true, message: '请输入激活码' }]}
              >
                <Input.TextArea
                  placeholder="激活码"
                  rows={3}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 8 }}>
                <Button type="primary" htmlType="submit" block>
                  激活账号
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center' }}>
                <Link to="/login">返回登录</Link>
              </div>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
};

export default Activate;
