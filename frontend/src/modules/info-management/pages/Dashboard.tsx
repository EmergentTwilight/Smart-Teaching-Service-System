/**
 * 仪表盘页面
 * 显示系统概览和统计数据
 */
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Progress, Typography, Space } from 'antd';
import {
  UserOutlined,
  BookOutlined,
  TeamOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { usersApi } from '@/modules/info-management/api/users';

const { Title, Text } = Typography;

// 活动数据
const ACTIVITIES = [
  { text: '新用户 zhangsan 完成注册', time: '2 分钟前', color: '#6366f1' },
  { text: '课程《高等数学》已更新', time: '15 分钟前', color: '#10b981' },
  { text: '选课系统已开启', time: '1 小时前', color: '#f59e0b' },
  { text: '系统完成数据备份', time: '3 小时前', color: '#3b82f6' },
] as const;

const Dashboard: React.FC = () => {
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await usersApi.getStats();
        setUserCount(stats.totalCount);
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      }
    };
    fetchStats();
  }, []);

  // 统计数据
  const STATS = [
    {
      title: '用户总数',
      value: userCount,
      icon: <UserOutlined style={{ fontSize: 28, color: '#6366f1' }} />,
      color: '#6366f1',
      bgColor: '#eef2ff',
    },
    {
      title: '课程总数',
      value: 86,
      icon: <BookOutlined style={{ fontSize: 28, color: '#10b981' }} />,
      color: '#10b981',
      bgColor: '#ecfdf5',
    },
    {
      title: '班级数量',
      value: 42,
      icon: <TeamOutlined style={{ fontSize: 28, color: '#f59e0b' }} />,
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    {
      title: '选课人数',
      value: 856,
      icon: <CheckCircleOutlined style={{ fontSize: 28, color: '#3b82f6' }} />,
      color: '#3b82f6',
      bgColor: '#eff6ff',
    },
  ] as const;

  return (
    <div className="fade-in">
      {/* 页面标题 */}
      <div className="page-header">
        <Title level={2} style={{ margin: 0 }}>
          仪表盘
        </Title>
        <Text type="secondary">欢迎使用智慧教学服务系统</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[24, 24]}>
        {STATS.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card
              className="stat-card"
              style={{
                background: stat.bgColor,
                border: 'none',
                borderRadius: 16,
              }}
              styles={{
                body: { padding: 24 },
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {stat.title}
                  </Text>
                  <div style={{ marginTop: 12 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, color: '#1f2937' }}>
                      {stat.value.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {stat.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 快速操作和进度 */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>系统概览</span>}
            style={{ borderRadius: 16, border: 'none' }}
            styles={{
              body: { padding: '24px 24px 32px' },
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>用户注册进度</Text>
                  <Text type="secondary">78%</Text>
                </div>
                <Progress percent={78} strokeColor="#6366f1" trailColor="#e5e7eb" showInfo={false} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>课程开设进度</Text>
                  <Text type="secondary">65%</Text>
                </div>
                <Progress percent={65} strokeColor="#10b981" trailColor="#e5e7eb" showInfo={false} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>选课完成进度</Text>
                  <Text type="secondary">42%</Text>
                </div>
                <Progress percent={42} strokeColor="#f59e0b" trailColor="#e5e7eb" showInfo={false} />
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>最近活动</span>}
            style={{ borderRadius: 16, border: 'none' }}
            styles={{
              body: { padding: 24 },
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {ACTIVITIES.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: 10,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: item.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14 }}>{item.text}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.time}</Text>
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
