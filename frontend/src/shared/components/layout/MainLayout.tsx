/**
 * 主布局组件
 * 包含侧边栏、顶部栏和内容区
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  BookOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  DashboardOutlined,
  CalendarOutlined,
  TeamOutlined,
  CommentOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SafetyOutlined,
  HomeOutlined,
  RobotOutlined,
  BellOutlined,
  EditOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';

const { Header, Sider, Content } = Layout;

// 菜单项配置（移到组件外）
const MENU_ITEMS: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: 'info',
      icon: <UserOutlined />,
      label: '基础信息管理',
      children: [
        { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
        { key: '/info/roles', icon: <SafetyOutlined />, label: '角色权限' },
        { key: '/info/courses', icon: <BookOutlined />, label: '课程信息' },
        { key: '/info/classrooms', icon: <HomeOutlined />, label: '教室管理' },
      ],
    },
    {
      key: 'schedule',
      icon: <CalendarOutlined />,
      label: '自动排课',
      children: [
        { key: '/schedule/tasks', icon: <FileTextOutlined />, label: '排课任务' },
        { key: '/schedule/view', icon: <CalendarOutlined />, label: '课表查看' },
        { key: '/schedule/manual', icon: <EditOutlined />, label: '手动调整' },
      ],
    },
    {
      key: 'selection',
      icon: <BookOutlined />,
      label: '智能选课',
      children: [
        { key: '/selection/courses', icon: <BookOutlined />, label: '课程列表' },
        { key: '/selection/my', icon: <UserOutlined />, label: '我的选课' },
        { key: '/selection/ai', icon: <RobotOutlined />, label: 'AI 推荐' },
      ],
    },
    {
      key: 'forum',
      icon: <CommentOutlined />,
      label: '论坛交流',
      children: [
        { key: '/forum/posts', icon: <FileTextOutlined />, label: '帖子列表' },
        { key: '/forum/my', icon: <UserOutlined />, label: '我的发布' },
        { key: '/forum/notifications', icon: <BellOutlined />, label: '消息通知' },
      ],
    },
    {
      key: 'exam',
      icon: <FileTextOutlined />,
      label: '在线测试',
      children: [
        { key: '/exam/questions', icon: <DatabaseOutlined />, label: '题库管理' },
        { key: '/exam/papers', icon: <FileTextOutlined />, label: '组卷考试' },
        { key: '/exam/results', icon: <BarChartOutlined />, label: '成绩查看' },
      ],
    },
    {
      key: 'grade',
      icon: <BarChartOutlined />,
      label: '成绩管理',
      children: [
        { key: '/grade/entry', icon: <EditOutlined />, label: '成绩录入' },
        { key: '/grade/statistics', icon: <LineChartOutlined />, label: '统计分析' },
        { key: '/grade/gpa', icon: <CalculatorOutlined />, label: 'GPA 计算' },
      ],
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const getInitialOpenKeys = useCallback(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    return pathParts.length > 1 ? [pathParts[0]] : [];
  }, [location.pathname]);

  const [openKeys, setOpenKeys] = useState<string[]>(getInitialOpenKeys);

  useEffect(() => {
    setOpenKeys(getInitialOpenKeys());
  }, [getInitialOpenKeys]);

  const handleMenuClick: MenuProps['onClick'] = useCallback((e: { key: string }) => {
    if (!e.key.startsWith('/')) return;
    navigate(e.key);
  }, [navigate]);

  const selectedKeys = useMemo(() => [location.pathname], [location.pathname]);

  const handleOpenChange: MenuProps['onOpenChange'] = useCallback((keys: string[]) => {
    const latestOpenKey = keys.find((key: string) => !openKeys.includes(key)) as string;
    setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
  }, [openKeys]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const userMenuItems = useMemo(() => [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ], [handleLogout]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
          boxShadow: '2px 0 8px 0 rgba(0, 0, 0, 0.15)',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
        width={240}
        collapsedWidth={80}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            margin: '0 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)',
              }}
            >
              <span style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>ST</span>
            </div>
            {!collapsed && (
              <span
                style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                智慧教学系统
              </span>
            )}
          </div>
        </div>

        {/* 菜单 */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={handleOpenChange}
          items={MENU_ITEMS}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: 16,
          }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        {/* 顶部栏 */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: 16,
              color: '#64748b',
            }}
          />
          
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 8,
                transition: 'background 0.2s ease',
              }}
            >
              <Avatar
                size={36}
                icon={<UserOutlined />}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                }}
              />
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
                  {user?.realName || '用户'}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  {user?.roles?.[0] || '管理员'}
                </div>
              </div>
            </div>
          </Dropdown>
        </Header>

        {/* 内容区 */}
        <Content
          style={{
            overflow: 'auto',
            background: '#f8fafc',
            padding: 24,
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
