import React from 'react';
import { Card, Typography } from 'antd';
import { ToolOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ComingSoonProps {
  title: string;
  description?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title, description }) => {
  return (
    <div className="fade-in">
      <div className="page-header">
        <Title level={2} style={{ margin: 0 }}>
          {title}
        </Title>
        {description && <Text type="secondary">{description}</Text>}
      </div>

      <Card
        style={{
          textAlign: 'center',
          padding: '60px 40px',
          borderRadius: 16,
          border: 'none',
        }}
      >
        <ToolOutlined
          style={{
            fontSize: 64,
            color: '#d1d5db',
            marginBottom: 24,
          }}
        />
        <Title level={4} style={{ color: '#6b7280', marginBottom: 12 }}>
          功能开发中
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          该功能模块正在紧张开发中，敬请期待...
        </Text>
      </Card>
    </div>
  );
};

export default ComingSoon;
