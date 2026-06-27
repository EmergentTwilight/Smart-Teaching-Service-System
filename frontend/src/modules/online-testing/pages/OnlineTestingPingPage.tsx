import React, { useState } from 'react';
import { Button, Card, Space, Typography, Alert } from 'antd';
import request from '@/shared/utils/request';

const { Title, Text } = Typography;

interface PingData {
  module: string;
  from: string;
  status: string;
}

const OnlineTestingPingPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePing = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await request.get<PingData, PingData>('/online-testing/ping');
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '请求失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <Title level={2} style={{ margin: 0 }}>
          在线测试联调验证
        </Title>
        <Text type="secondary">验证前端页面与 E 组 Rust 后端通信</Text>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Button type="primary" onClick={handlePing} loading={loading}>
            发送 Ping 请求
          </Button>

          {result && (
            <Alert
              type="success"
              showIcon
              message="通信成功"
              description={`module=${result.module}, from=${result.from}, status=${result.status}`}
            />
          )}

          {error && <Alert type="error" showIcon message="通信失败" description={error} />}
        </Space>
      </Card>
    </div>
  );
};

export default OnlineTestingPingPage;
