/**
 * 应用根组件
 * 配置路由、主题和全局状态
 */
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/stores/authStore';
import ErrorBoundary from '@/shared/components/ErrorBoundary';

// 懒加载页面组件
const MainLayout = lazy(() => import('@/shared/components/layout/MainLayout'));
const Login = lazy(() => import('@/modules/info-management/pages/Login'));
const Register = lazy(() => import('@/modules/info-management/pages/Register'));
const ForgotPassword = lazy(() => import('@/modules/info-management/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/modules/info-management/pages/ResetPassword'));
const Dashboard = lazy(() => import('@/modules/info-management/pages/Dashboard'));
const UserList = lazy(() => import('@/modules/info-management/pages/users/UserList'));
const SystemLogs = lazy(() => import('@/modules/info-management/pages/users/SystemLogs'));
const Profile = lazy(() => import('@/modules/info-management/pages/Profile'));
const OnlineTestingPingPage = lazy(
  () => import('@/modules/online-testing/pages/OnlineTestingPingPage')
);
const OnlineTestingQuestionsPage = lazy(
  () => import('@/modules/online-testing/pages/OnlineTestingQuestionsPage')
);
const ComingSoon = lazy(() => import('@/shared/components/ComingSoon'));

// 加载中组件
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    加载中...
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 受保护的路由组件
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && user) {
    const userRoles = user.roles || [];
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      // 暂时跳转到首页并提示无权限
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
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
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />

                  {/* 基础信息管理 */}
                  <Route path="users" element={<UserList />} />
                  <Route
                    path="users/logs"
                    element={
                      <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                        <SystemLogs />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="profile" element={<Profile />} />
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
                  <Route path="exam/ping" element={<OnlineTestingPingPage />} />
                  <Route path="exam/questions" element={<OnlineTestingQuestionsPage />} />
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
            </Suspense>
          </BrowserRouter>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
