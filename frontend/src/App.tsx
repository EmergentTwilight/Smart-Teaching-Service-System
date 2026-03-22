/**
 * 应用根组件
 * 配置路由、主题和全局状态
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/stores/authStore';
import MainLayout from '@/shared/components/layout/MainLayout';
import Login from '@/modules/info-management/pages/Login';
import Dashboard from '@/modules/info-management/pages/Dashboard';
import UserList from '@/modules/info-management/pages/users/UserList';
import ComingSoon from '@/shared/components/ComingSoon';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 受保护的路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            // 现代化配色
            colorPrimary: '#6366f1',
            colorSuccess: '#10b981',
            colorWarning: '#f59e0b',
            colorError: '#ef4444',
            colorInfo: '#3b82f6',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          },
          components: {
            Card: {
              borderRadiusLG: 12,
              boxShadowTertiary: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
            },
            Button: {
              borderRadius: 8,
              controlHeight: 40,
            },
            Input: {
              borderRadius: 8,
              controlHeight: 40,
            },
            Table: {
              borderRadiusLG: 12,
              headerBg: '#fafafa',
            },
          },
        }}
      >
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              
              {/* 基础信息管理 */}
              <Route path="info/users" element={<UserList />} />
              <Route path="info/roles" element={<ComingSoon title="角色权限" />} />
              <Route path="info/courses" element={<ComingSoon title="课程信息" />} />
              <Route path="info/classrooms" element={<ComingSoon title="教室管理" />} />
              
              {/* 自动排课 */}
              <Route path="schedule/tasks" element={<ComingSoon title="排课任务" />} />
              <Route path="schedule/view" element={<ComingSoon title="课表查看" />} />
              <Route path="schedule/manual" element={<ComingSoon title="手动调整" />} />
              
              {/* 智能选课 */}
              <Route path="selection/courses" element={<ComingSoon title="课程列表" />} />
              <Route path="selection/my" element={<ComingSoon title="我的选课" />} />
              <Route path="selection/ai" element={<ComingSoon title="AI 推荐" />} />
              
              {/* 论坛交流 */}
              <Route path="forum/posts" element={<ComingSoon title="帖子列表" />} />
              <Route path="forum/my" element={<ComingSoon title="我的发布" />} />
              <Route path="forum/notifications" element={<ComingSoon title="消息通知" />} />
              
              {/* 在线测试 */}
              <Route path="exam/questions" element={<ComingSoon title="题库管理" />} />
              <Route path="exam/papers" element={<ComingSoon title="组卷考试" />} />
              <Route path="exam/results" element={<ComingSoon title="成绩查看" />} />
              
              {/* 成绩管理 */}
              <Route path="grade/entry" element={<ComingSoon title="成绩录入" />} />
              <Route path="grade/statistics" element={<ComingSoon title="统计分析" />} />
              <Route path="grade/gpa" element={<ComingSoon title="GPA 计算" />} />
              
              {/* 系统设置 */}
              <Route path="settings" element={<ComingSoon title="系统设置" />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
