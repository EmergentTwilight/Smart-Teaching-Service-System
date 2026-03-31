/**
 * 主布局组件
 * 包含侧边栏、顶部栏和内容区
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { MENU_ITEMS } from '@/shared/config/menu';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
import { USER_ROLE_LABELS, type UserRoleType } from '@/shared/types';

const { Header, Sider, Content } = Layout;

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

  const handleUserProfile = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  const userMenuItems = useMemo(() => [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: handleUserProfile,
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
  ], [handleLogout, handleUserProfile]);

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
                  {user?.roleDetails?.[0]?.name || USER_ROLE_LABELS[user?.roles?.[0] as UserRoleType] || '未设置'}
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
