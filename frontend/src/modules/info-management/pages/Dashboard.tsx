import React from 'react';
import { Card } from 'antd';

const Dashboard: React.FC = () => {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>仪表盘</h2>
      <Card>
        <p>仪表盘功能开发中...</p>
        <p style={{ color: '#888', marginTop: 16 }}>
          敬请期待系统统计数据展示，包括用户统计、课程统计、活跃度分析等。
        </p>
      </Card>
    </div>
  );
};

export default Dashboard;
